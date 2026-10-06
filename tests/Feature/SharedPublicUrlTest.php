<?php

use App\Mail\WellcareNotificationMail;
use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use App\Providers\AppServiceProvider;

/**
 * While `wellcare.ps1 share` runs, every email link must open on the phone:
 * the tunnel address, never http://127.0.0.1:8000. These build the links the
 * way the queue worker does (console, no request) after reading a share-url
 * file, which is what the worker does on every boot.
 */
const SHARED_URL = 'https://brave-words-here.trycloudflare.com';

function shareUrlFile(string $contents): string
{
    $file = tempnam(sys_get_temp_dir(), 'share-url');
    file_put_contents($file, $contents);

    return $file;
}

function applyShareUrl(?string $file): void
{
    app()->getProvider(AppServiceProvider::class)->useSharedPublicUrl($file);
}

it('points the email verification link at the shared address', function () {
    applyShareUrl(shareUrlFile(SHARED_URL."\n"));
    $user = userWithRole('user');

    $url = (new QueuedVerifyEmail)->toMail($user)->actionUrl;

    expect($url)->toStartWith(SHARED_URL.'/email/verify/'.$user->id.'/');
});

it('points the password reset link at the shared address', function () {
    applyShareUrl(shareUrlFile(SHARED_URL));
    $user = userWithRole('user');

    $url = (new QueuedResetPassword('token123'))->toMail($user)->actionUrl;

    expect($url)->toStartWith(SHARED_URL.'/reset-password/token123');
});

it('points the button in templated emails at the shared address', function () {
    applyShareUrl(shareUrlFile(SHARED_URL.'/'));

    $html = (new WellcareNotificationMail('Lab result ready', 'Your result is ready.', 'lab'))->render();

    expect(config('app.url'))->toBe(SHARED_URL)
        ->and($html)->toContain('href="'.SHARED_URL.'"')
        ->and($html)->not->toContain('127.0.0.1');
});

it('leaves links alone when nothing is shared', function () {
    $before = config('app.url');

    applyShareUrl(sys_get_temp_dir().'/no-such-share-url-file');

    expect(config('app.url'))->toBe($before)
        ->and(url('/login'))->not->toContain('trycloudflare');
});

it('ignores a share file that is not an https address', function (string $contents) {
    $before = config('app.url');

    applyShareUrl(shareUrlFile($contents));

    expect(config('app.url'))->toBe($before);
})->with([
    'plain http' => 'http://brave-words-here.trycloudflare.com',
    'empty' => '',
    'garbage' => 'not a url',
]);

it('never applies in production, where the deployment owns APP_URL', function () {
    app()->detectEnvironment(fn () => 'production');
    $before = config('app.url');

    applyShareUrl(shareUrlFile(SHARED_URL));

    expect(config('app.url'))->toBe($before);
});
