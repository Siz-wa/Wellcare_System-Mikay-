<?php

namespace App\Console\Commands;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\ByteMatrix;
use BaconQrCode\Encoder\Encoder;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Prints a URL as a QR code in the terminal, for `wellcare.ps1 share`.
 *
 * Typing a random trycloudflare.com URL into a phone is slow and error-prone;
 * scanning it with the camera is not. The encoder is BaconQrCode, already
 * installed by Fortify for two-factor enrolment, so this needs no new package.
 *
 * Two modules per character cell (half blocks) keep the code square: a full
 * block per module would come out twice as tall as it is wide. LIGHT modules
 * are the ones drawn, so on the usual dark terminal it reads as dark-on-light,
 * the polarity every phone camera expects.
 *
 * The whole code goes out in ONE write. It runs inside `concurrently` next to
 * the server log, and separate writes would let a request line land in the
 * middle of the code and break it.
 */
class ShowTunnelQrCode extends Command
{
    protected $signature = 'wellcare:qr {url : The text to encode}';

    protected $description = 'Print a URL as a scannable QR code in the terminal';

    /** Quiet-zone width, in modules, around the code. */
    private const MARGIN = 2;

    public function handle(): int
    {
        $matrix = Encoder::encode((string) $this->argument('url'), ErrorCorrectionLevel::L())->getMatrix();

        $this->output->write($this->render($matrix), false, OutputInterface::OUTPUT_RAW);

        return self::SUCCESS;
    }

    private function render(ByteMatrix $matrix): string
    {
        $size = $matrix->getWidth();
        $isLight = fn (int $x, int $y): bool => $x < 0 || $y < 0 || $x >= $size || $y >= $size
            || $matrix->get($x, $y) !== 1;

        $lines = [];

        for ($y = -self::MARGIN; $y < $size + self::MARGIN; $y += 2) {
            $line = '';

            for ($x = -self::MARGIN; $x < $size + self::MARGIN; $x++) {
                $top = $isLight($x, $y);
                $bottom = $isLight($x, $y + 1);

                $line .= match (true) {
                    $top && $bottom => '█',
                    $top => '▀',
                    $bottom => '▄',
                    default => ' ',
                };
            }

            $lines[] = $line;
        }

        return implode(PHP_EOL, $lines).PHP_EOL;
    }
}
