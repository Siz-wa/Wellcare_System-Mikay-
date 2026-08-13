<?php

namespace App\Console\Commands;

use App\Models\ConsultationSession;
use App\Services\ConsultationSessionService;
use Illuminate\Console\Command;

/**
 * Close video rooms that nobody ever closed.
 *
 * **This is a privacy sweep, not housekeeping.** Nothing in the application
 * ends an abandoned call. Every close path is a deliberate act by a person —
 * End Call, Finalize, Complete — and none of them runs when the doctor shuts
 * the laptop, the browser crashes, or the shift ends. The row stays `waiting`
 * or `active` with `ended_at` NULL forever, and while it does, gate 2 of
 * `mayJoinRoom()` keeps returning true: the room remains a live, subscribable,
 * private audio/video channel for both participants. Reopening a months-old
 * consultation should not be one bookmark away.
 *
 * Deliberately ends through the service rather than with a bulk UPDATE. Going
 * through `endCall()` means the `bye` broadcast fires here exactly as it does
 * everywhere else, so a participant who genuinely is still sitting on the page
 * is told the room closed instead of watching a frozen frame — the same reason
 * the broadcast lives in the service at all.
 */
class CloseStaleConsultationRooms extends Command
{
    /**
     * Hours are the right unit. A consultation runs for tens of minutes and a
     * dropped connection recovers in seconds, so anything still open after the
     * default has not been "in progress" for a long time. Overridable because a
     * clinic that runs long visits may want more slack.
     */
    protected $signature = 'consultations:close-stale {--hours=6 : Close rooms opened more than this many hours ago}';

    protected $description = 'Close video consultation rooms that were left open, and tell anyone still on the page';

    public function handle(ConsultationSessionService $sessions): int
    {
        $hours = max(1, (int) $this->option('hours'));
        $cutoff = now()->subHours($hours);

        $open = ConsultationSession::query()
            ->where('mode', 'virtual')
            ->whereIn('consultation_status', ['waiting', 'active']);

        // Counted separately so "closed 0" is never ambiguous. There are two
        // completely different reasons for a zero — nothing was open at all, or
        // everything open is younger than the cutoff — and reporting only the
        // total made the command look broken when it was working correctly on an
        // empty set.
        $openCount = (clone $open)->count();

        $stale = $open
            // started_at, not updated_at. It is set on every openVirtualRoom()
            // and is the only timestamp that tracks the CALL — `updated_at`
            // moves every time the doctor saves a SOAP draft, which would keep
            // resetting the clock on exactly the rooms most likely to be
            // abandoned mid-visit.
            ->where('started_at', '<', $cutoff)
            ->get();

        foreach ($stale as $session) {
            $sessions->endCall($session);
        }

        $this->info(sprintf(
            'Closed %d of %d open virtual room(s) — those opened before %s (--hours=%d).',
            $stale->count(),
            $openCount,
            $cutoff->toDateTimeString(),
            $hours,
        ));

        if ($openCount === 0) {
            $this->line('No rooms were open, so there was nothing to close.');
        }

        return self::SUCCESS;
    }
}
