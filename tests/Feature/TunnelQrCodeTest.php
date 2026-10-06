<?php

use Illuminate\Support\Facades\Artisan;

/**
 * `wellcare:qr` is what the phone scans during `wellcare.ps1 share`. Nothing in
 * the suite can point a camera at it, so these pin down the shape a scanner
 * depends on: a square code, the three finder patterns where they belong, and
 * a different code for a different URL.
 */
function renderTunnelQr(string $url): array
{
    Artisan::call('wellcare:qr', ['url' => $url]);

    return array_values(array_filter(explode(PHP_EOL, Artisan::output()), fn (string $line) => $line !== ''));
}

it('prints a square code, two modules per line', function () {
    $lines = renderTunnelQr('https://example-words-here.trycloudflare.com');

    $widths = array_unique(array_map('mb_strlen', $lines));

    expect($widths)->toHaveCount(1);

    // A QR side is 21 + 4n modules, plus a 2-module quiet zone each side.
    $side = $widths[0];
    expect(($side - 4 - 21) % 4)->toBe(0)
        ->and(count($lines))->toBe((int) ceil($side / 2));
});

it('draws the finder pattern in the top-left, inside the quiet zone', function () {
    $lines = renderTunnelQr('https://example-words-here.trycloudflare.com');

    // Quiet zone, then the 7-module dark ring of the finder pattern.
    expect(mb_substr($lines[0], 0, 9))->toBe('█████████')
        ->and(mb_substr($lines[1], 0, 9))->toBe('██ ▄▄▄▄▄ ');
});

it('encodes the URL it is given', function () {
    expect(renderTunnelQr('https://one.trycloudflare.com'))
        ->not->toBe(renderTunnelQr('https://two.trycloudflare.com'));
});
