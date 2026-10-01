<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    data-text-size="{{ $textSize ?? 'base' }}"
    data-contrast="{{ $contrast ?? 'standard' }}"
>
    <head>
        <meta charset="utf-8">
        {{-- `maximum-scale` and `user-scalable=no` are deliberately absent:
             pinch-zoom is the last resort for a low-vision reader and must never
             be disabled (WCAG 1.4.4). --}}
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- The consultation room signals over fetch(), which — unlike axios —
             does not read the XSRF-TOKEN cookie. Without this every signalling
             POST would 419 and the call would silently never connect. --}}
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- Typography.

             Atkinson Hyperlegible Next (Braille Institute) is the single family
             for the whole product; Atkinson Hyperlegible Mono covers codes and
             tabular data. Both were chosen for low-vision legibility — the
             letterforms disambiguate I/l/1, O/0 and b/d/p/q, which on a
             prescription or an accession number is the difference between right
             and wrong rather than merely pretty.

             Self-hosted from public/fonts/atkinson, not fonts.googleapis.com:
             the app is demonstrated on a laptop with no internet, where the
             Google stylesheet never arrives and every page falls back to a
             system font. The upright text face is preloaded because it paints
             nearly every glyph on first render; `font-display: swap` keeps text
             visible while it loads. --}}
        <link
            rel="preload"
            as="font"
            type="font/woff2"
            href="{{ asset('fonts/atkinson/atkinson-hyperlegible-next-normal-latin.woff2') }}"
            crossorigin
        >
        <link rel="stylesheet" href="{{ asset('fonts/atkinson/atkinson.css') }}">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])

        {{-- Paints the page ground before the stylesheet lands, so a slow
             connection shows white rather than a flash of the browser default.
             There is no dark counterpart: the app has one theme. --}}
        <style>
            html { background-color: #f5f5f5; }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        {{-- Every page in this app is a sidebar-or-nav shell wrapped around one
             region of real content. Without this, a screen-reader or
             keyboard-only user tabs the whole sidebar on every navigation. --}}
        <a class="wc-sr-only wc-sr-only-focusable" href="#main-content">Skip to main content</a>

        @inertia
    </body>
</html>
