<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Hourly, because the thing it closes is a live audio/video channel.
 *
 * See CloseStaleConsultationRooms — an abandoned room stays joinable forever
 * otherwise. `withoutOverlapping()` matters here rather than being boilerplate:
 * the command ends each room through the service so the `bye` broadcast fires,
 * and two overlapping runs on a large backlog would each try to end the same
 * rows. endCall() is idempotent, so the duplicates are harmless — but the
 * broadcasts are not, and a peer would be told twice.
 *
 * Requires a scheduler process (`php artisan schedule:work`, or cron in
 * production). It is not part of `composer dev`, so on a local machine this is
 * documentation of intent until one is running.
 */
Schedule::command('consultations:close-stale')
    ->hourly()
    ->withoutOverlapping();
