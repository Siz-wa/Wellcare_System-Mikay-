<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureAssetPreloading();
        $this->configureSignallingRelay();
    }

    /**
     * Exempt the WebRTC signalling relay from request-input transformation.
     *
     * `TrimStrings` runs `Str::trim()` over every string in the request,
     * including nested array values. An SDP is a CRLF-delimited format in which
     * **every** line, including the last, must be terminated — so trimming the
     * payload silently deletes the final `\r\n` and the receiving peer answers:
     *
     *     Failed to execute 'setRemoteDescription' on 'RTCPeerConnection':
     *     Failed to parse SessionDescription. a=ssrc:… Invalid SDP line.
     *
     * The whole offer is rejected over one absent line ending. This is a
     * genuinely nasty failure: the POST succeeds, the event broadcasts, the
     * server logs nothing, and only the *other* device throws — so it presents
     * as "the call never connects" with no evidence on the side that caused it.
     *
     * It is also selective in a way that misleads. `hello` carries an empty
     * payload and ICE candidate strings have no trailing whitespace, so those
     * relay perfectly; only the offer and answer are damaged. Signalling looks
     * half-working, which points the investigation at the socket rather than at
     * the request pipeline.
     *
     * Scoped to the one route by design. This endpoint alone is a pass-through
     * for opaque peer data — ConsultationRoomController never parses SDP or
     * inspects a candidate, and trimming is exactly the kind of inspection it
     * promises not to do. Every other route in the app still wants trimming.
     * `ConvertEmptyStringsToNull` is skipped for the same reason: transforming
     * a relayed payload is not this application's business.
     */
    protected function configureSignallingRelay(): void
    {
        $isSignalRelay = fn (Request $request): bool => $request->is('consultations/rooms/*/signal');

        TrimStrings::skipWhen($isSignalRelay);
        ConvertEmptyStringsToNull::skipWhen($isSignalRelay);
    }

    /**
     * Stop emitting `<link rel="preload">` tags for built assets when the app
     * is served by the PHP development server.
     *
     * `php artisan serve` is the PHP built-in server, which handles exactly one
     * request at a time. `PHP_CLI_SERVER_WORKERS` would raise that, but it is
     * implemented with fork() and therefore does nothing on Windows — this
     * project's dev platform.
     *
     * Laravel's `@vite` emits a preload tag *and* a stylesheet tag for the same
     * file, so the browser requests a 101 KB stylesheet twice before it can
     * paint. Behind a tunnel — where the consultation room has to run, because
     * getUserMedia needs a secure context — that doubling lands on a
     * single-threaded server alongside the Inertia request, the page chunks and
     * a WebSocket upgrade. Requests queue, and Vite's `__vitePreload` helper
     * has no retry: when it gives up it rejects, and a rejected preload rejects
     * the dynamic page import behind it, so Inertia renders nothing.
     *
     * Preload tags are a production optimisation against a real web server.
     * They are a liability against a one-request-at-a-time dev server, so they
     * are disabled only there — production keeps them.
     */
    protected function configureAssetPreloading(): void
    {
        if (app()->isProduction()) {
            return;
        }

        Vite::usePreloadTagAttributes(false);

        /*
         * Emit asset URLs as root-relative paths instead of absolute ones.
         *
         * This is the actual fix for
         * `Uncaught (in promise) Error: Unable to preload CSS for
         * /build/assets/app-*.css`, and it is not a cosmetic preference.
         *
         * Vite's runtime preload helper dedupes against the document with a
         * literal attribute selector:
         *
         *     if (document.querySelector(`link[href="${h}"][rel="stylesheet"]`)) return;
         *
         * `h` is the build-time path, `/build/assets/app-*.css`. Laravel's
         * `asset()` renders `href="https://<host>/build/assets/app-*.css"`.
         * An attribute selector compares the literal attribute value, so an
         * absolute href never matches a relative `h` — the guard always misses,
         * and Vite appends a SECOND `<link rel="stylesheet" crossOrigin="">`
         * for a stylesheet the page already has. That duplicate is the
         * `sec-fetch-mode: cors` request in the network log, and when it fails
         * its `error` listener rejects with the message above.
         *
         * It fails here because `php artisan serve` is single-threaded (and
         * `PHP_CLI_SERVER_WORKERS` is fork-based, so it is a no-op on Windows).
         * The duplicate is requested last, after ~25 other assets, through a
         * tunnel — measured latency under that load went 0.15s -> ~1s.
         *
         * Making the href relative lets the dedupe match, so the duplicate is
         * never requested and there is nothing left to fail.
         *
         * Local only: overriding this in production would break any deployment
         * that serves assets from a CDN via ASSET_URL.
         */
        Vite::createAssetPathsUsing(
            fn (string $path, ?bool $secure = null): string => '/'.ltrim($path, '/')
        );
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
