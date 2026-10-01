<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline browser hardening for every response.
 *
 * These are the headers a security scan looks for first, and the application
 * sent none of them. They matter more here than on a typical site because the
 * pages behind auth render medical records: a clickjacked consultation room or
 * a referrer leaking `/user/records/41` to a third-party host is a disclosure
 * of patient data, not just a bad grade on a report.
 *
 * Deliberately NOT a full Content-Security-Policy. A real CSP for this app has
 * to admit Vite's dev server, its HMR websocket, the inline styles this
 * codebase uses everywhere (every layout is a `style={{…}}` object), and
 * Reverb's websocket origin. A policy loose enough to allow all of that is
 * mostly decorative, and a policy tight enough to be useful breaks the dev
 * server — so what is here instead are the headers that are unambiguously
 * correct with no per-environment tuning. `frame-ancestors` is the one CSP
 * directive included, because it is the modern spelling of X-Frame-Options and
 * costs nothing.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        return self::applyTo($request, $next($request));
    }

    /**
     * Stamp the headers onto a response.
     *
     * Public and static because the middleware pipeline is not the only place
     * that needs it. A middleware that THROWS — `auth` rejecting a guest,
     * route-model binding missing a record — never returns through this class:
     * the exception propagates past the whole pipeline and the response is
     * built by the exception handler afterwards. So every 401 redirect, 403,
     * 404 and 500 in the application would go out bare.
     *
     * bootstrap/app.php therefore calls this from `withExceptions()->respond()`
     * as well. Two call sites, one definition — which is the point of it being
     * here rather than duplicated there.
     */
    public static function applyTo(Request $request, Response $response): Response
    {
        $headers = [
            // No MIME sniffing: an uploaded document must never be executed as
            // whatever the browser guesses it might be. This app lets doctors
            // and nurses upload patient documents, so it is load-bearing.
            'X-Content-Type-Options' => 'nosniff',

            // The consultation room and every records page must not be
            // embeddable. Both spellings, because frame-ancestors is ignored by
            // older browsers and X-Frame-Options by the CSP-only ones.
            'X-Frame-Options' => 'SAMEORIGIN',
            'Content-Security-Policy' => "frame-ancestors 'self'",

            // Send the origin but not the path to other sites, so an outbound
            // link from a page whose URL contains a patient id does not hand
            // that id to the destination.
            'Referrer-Policy' => 'strict-origin-when-cross-origin',

            // The consultation room needs the camera and microphone; nothing
            // else does, and nothing needs them in a cross-origin frame.
            'Permissions-Policy' => 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()',
        ];

        foreach ($headers as $name => $value) {
            // Never clobber a header a controller set deliberately — the
            // consultation room may one day need its own Permissions-Policy.
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        // HSTS only over HTTPS, and only in production. Sending it from a local
        // http:// dev server does nothing; sending it from a *staging* domain
        // pins that host to HTTPS in every developer's browser for a year,
        // which is a genuinely painful thing to undo.
        if ($request->secure() && app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
