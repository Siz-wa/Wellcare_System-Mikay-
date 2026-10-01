<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shares the viewer's reading preferences with the root Blade view so they can
 * be stamped onto <html> before anything renders.
 *
 * Text size has to be resolved before first paint: a reader who has chosen 150%
 * must not be shown a frame of 100% text first. Rendering it from the cookie
 * here — rather than from localStorage in a client effect — means the correct
 * size is in the very first byte of HTML.
 *
 * This used to share a light/dark `appearance` value as well. That theme was
 * never actually built: the `dark` class was applied to <html> but no dark
 * tokens were ever defined, so it changed only the page background.
 */
class HandleReadingPreferences
{
    /**
     * Text scale steps. These map to the `html[data-text-size]` rules in
     * resources/css/base.css: 100%, 112.5%, 125%, 150%.
     *
     * @var list<string>
     */
    private const TEXT_SIZES = ['base', 'lg', 'xl', 'xxl'];

    /**
     * Contrast modes. 'standard' is stamped explicitly rather than left empty,
     * because it also opts the reader OUT of the automatic
     * `prefers-contrast: more` escalation in base.css.
     *
     * @var list<string>
     */
    private const CONTRASTS = ['standard', 'high'];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        View::share('textSize', $this->preference($request, 'text_size', self::TEXT_SIZES, 'base'));
        View::share('contrast', $this->preference($request, 'contrast', self::CONTRASTS, 'standard'));

        return $next($request);
    }

    /**
     * Read a cookie and return it only if it is one of the values we render.
     *
     * @param  list<string>  $allowed
     */
    private function preference(Request $request, string $cookie, array $allowed, string $default): string
    {
        $value = $request->cookie($cookie);

        return is_string($value) && in_array($value, $allowed, true)
            ? $value
            : $default;
    }
}
