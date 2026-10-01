<?php

namespace App\Services;

use App\Contracts\SmsDriver;
use Illuminate\Support\Facades\Log;

/**
 * Everything that is true of an SMS regardless of who carries it.
 *
 * Number normalisation, length limits and failure handling live here rather
 * than in a driver, so swapping providers cannot quietly change them.
 */
class SmsSender
{
    public function __construct(private readonly SmsDriver $driver) {}

    /**
     * Send one message, returning whether it was accepted for delivery.
     *
     * Never throws. A notification is a side effect of a clinical action, and
     * an unreachable gateway must not roll back the consultation that produced
     * it.
     */
    public function send(?string $number, string $message): bool
    {
        $normalised = $this->normalise($number);

        if ($normalised === null) {
            Log::warning('SMS skipped — no usable number', ['raw' => $number]);

            return false;
        }

        try {
            return $this->driver->send($normalised, $this->truncate($message));
        } catch (\Throwable $e) {
            Log::error('SMS delivery failed', [
                'to' => $normalised,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Philippine mobile numbers to E.164.
     *
     * Charts hold these in every format a person might type — `09171234567`,
     * `+639171234567`, `0917 123 4567`, `(0917) 123-4567`. A provider will
     * accept one of them. Normalising here means the chart does not have to be
     * clean for the message to arrive.
     *
     * Returns null when the value cannot be a mobile number, rather than
     * guessing: sending a clinical message to a wrong number is a disclosure.
     */
    private function normalise(?string $number): ?string
    {
        if ($number === null) {
            return null;
        }

        $digits = preg_replace('/[^\d+]/', '', $number) ?? '';

        // Already international.
        if (str_starts_with($digits, '+63')) {
            return strlen($digits) === 13 ? $digits : null;
        }

        // 639171234567
        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return '+'.$digits;
        }

        // 09171234567 — the form the booking form collects.
        if (str_starts_with($digits, '09') && strlen($digits) === 11) {
            return '+63'.substr($digits, 1);
        }

        // 9171234567
        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '+63'.$digits;
        }

        return null;
    }

    /**
     * Keep a message inside its configured length.
     *
     * Silent truncation is the wrong default for prose, but right here: an
     * over-long clinical SMS is billed per segment and may be split by the
     * carrier in an arbitrary place. Cutting at a known boundary with an
     * ellipsis is more predictable than either.
     */
    private function truncate(string $message): string
    {
        $max = (int) config('sms.max_length', 320);

        if (mb_strlen($message) <= $max) {
            return $message;
        }

        return mb_substr($message, 0, $max - 1).'…';
    }
}
