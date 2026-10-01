<?php

use App\Http\Middleware\EnforceIdleTimeout;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureTwoFactorEnrolled;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandleReadingPreferences;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['text_size', 'contrast', 'sidebar_state']);
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
        $middleware->web(append: [
            // First in the list so the headers are stamped on even when a
            // later middleware short-circuits by RETURNING a response —
            // EnsureUserIsActive redirecting a deactivated account, Inertia
            // answering a version mismatch with a 409. A middleware that
            // THROWS (auth rejecting a guest, a missing route-model binding)
            // never returns through here at all, which is why the exception
            // handler below calls SecurityHeaders::applyTo() as well.
            SecurityHeaders::class,
            HandleReadingPreferences::class,
            // GV-8. Before EnsureUserIsActive on purpose: an expired session
            // should end as an expiry, with its own message, rather than
            // falling through to a deactivation notice that is not true. Reads
            // the per-role windows from config/security.php and self-filters,
            // so patients keep the framework default.
            EnforceIdleTimeout::class,
            // Deactivated accounts are booted here rather than route-by-route:
            // a deactivation that only applied to some pages is not a
            // deactivation. Runs before Inertia so a logged-out user never gets
            // shared props built from their account.
            EnsureUserIsActive::class,
            // GV-9. Ahead of the 2FA gate, in order of how live the risk is: a
            // password a colleague still knows is an exposure right now, where
            // a missing second factor is a weaker defence against an attacker
            // who does not have the first one yet. Change the password, then
            // enrol.
            EnsurePasswordIsChanged::class,
            // X-01. Global for the same reason, and in this order: an account
            // that is deactivated should be logged out before it is asked to
            // enrol in anything. The middleware self-filters by role, so
            // patients pass straight through and a future staff route group
            // cannot forget to opt in.
            EnsureTwoFactorEnrolled::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /*
         * Branded error pages.
         *
         * Without this, a 404 in this app renders Laravel's stock Symfony error
         * page: a bare white screen with no navigation, no clinic name, and no
         * way back other than the browser's back button. For a patient who
         * mistypes a URL while trying to reach a lab result, that page is
         * indistinguishable from the clinic's site being down.
         *
         * Only the statuses a real user can actually hit are re-rendered.
         * Everything else falls through to the framework's handling, and
         * `local` is excluded entirely so Ignition's stack trace is not
         * replaced by a friendly page while debugging.
         */
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            // Error responses are built after the middleware pipeline has
            // already unwound, so without this every 401 redirect, 403, 404 and
            // 500 the application produces would go out with no security
            // headers at all.
            SecurityHeaders::applyTo($request, $response);

            // A session that expired mid-form is not really an error — bounce
            // back to the same page so the person can submit again with a fresh
            // CSRF token, rather than reading about a token mismatch. Handled
            // before the error-page branch, and in every environment, because
            // it is the one status with a better answer than a page.
            if ($status === 419) {
                return SecurityHeaders::applyTo(
                    $request,
                    back()->with('error', 'Your session expired. Please try again.'),
                );
            }

            if (! app()->environment('local') && in_array($status, [403, 404, 429, 500, 503], true)) {
                return SecurityHeaders::applyTo($request, Inertia::render('errors/index', [
                    'status' => $status,
                    // Not $exception->getMessage(): an exception message can
                    // carry a file path, a SQL fragment, or a class name, and
                    // this page is rendered to whoever triggered the error.
                    // The copy shown to the user is chosen client-side from the
                    // status code alone.
                    'previousUrl' => url()->previous(),
                ])
                    ->toResponse($request)
                    ->setStatusCode($status));
            }

            return $response;
        });
    })->create();
