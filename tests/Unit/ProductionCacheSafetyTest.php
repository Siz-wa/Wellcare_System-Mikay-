<?php

/**
 * QA gap G-12: production runs `php artisan optimize` (composer deploy). Once
 * config is cached, env() returns null everywhere outside config/, so a single
 * env() call in application code silently turns into null in production.
 */
arch('application code reads configuration, never env()')
    ->expect('env')
    ->not->toBeUsedIn('App');
