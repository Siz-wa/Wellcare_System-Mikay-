<?php

namespace App\Contracts;

/**
 * One outbound SMS transport.
 *
 * Deliberately tiny. The clinic has not chosen a provider yet, and the point of
 * this seam is that choosing one later is a class rather than an edit to every
 * caller. Anything provider-specific — retries, delivery receipts, per-segment
 * billing — belongs behind an implementation, not in this contract.
 */
interface SmsDriver
{
    /**
     * Send one message.
     *
     * Returns false rather than throwing on a provider-side refusal, because a
     * failed notification must never take down the clinical action that
     * triggered it: a doctor finalising a note should not see an error because
     * an SMS gateway was unreachable. The caller logs the false.
     *
     * @param  string  $to  E.164 or local Philippine format; the driver normalises.
     */
    public function send(string $to, string $message): bool;
}
