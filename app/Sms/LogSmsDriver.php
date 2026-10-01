<?php

namespace App\Sms;

use App\Contracts\SmsDriver;
use Illuminate\Support\Facades\Log;

/**
 * The default driver: writes the message to the log and sends nothing.
 *
 * This is not a stub to be replaced before the feature works — it is what makes
 * the feature complete and testable without committing the clinic to a vendor.
 * Every part of the path around it (preferences, queueing, truncation, failure
 * handling) is real and exercised; only the final hop is simulated.
 *
 * It also gives the clinic a way to watch exactly what WOULD be sent, and at
 * what volume, before agreeing to pay per message.
 */
class LogSmsDriver implements SmsDriver
{
    public function send(string $to, string $message): bool
    {
        Log::channel(config('sms.providers.log.channel', 'stack'))->info('SMS (not sent — log driver)', [
            'to' => $to,
            'from' => config('sms.from'),
            'message' => $message,
            'length' => mb_strlen($message),
        ]);

        return true;
    }
}
