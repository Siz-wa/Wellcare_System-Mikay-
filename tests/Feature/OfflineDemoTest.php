<?php

/**
 * `OFFLINE_DEMO` (set by offline.cmd / offline.ps1) reaches every page, so the
 * UI can replace internet-only content — the Google Maps embed on Contact —
 * with a local stand-in on a laptop with no connection.
 */
it('tells every page the app is online by default', function () {
    $this->get(route('contact'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('offline', false));
});

it('tells every page when the app runs offline', function () {
    config(['app.offline_demo' => true]);

    $this->get(route('contact'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('offline', true));
});
