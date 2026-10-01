<?php

use Symfony\Component\Finder\Finder;

/**
 * Guards the typography system against the drift it was just pulled out of.
 *
 * A Unit test rather than a Feature one: it only reads source files off disk,
 * so it has no business booting a database. Keeping it here means the guard
 * still runs when MySQL is not up.
 *
 * Before this was normalized the app ran five font families (two of which were
 * never loaded), ~450 hardcoded px font sizes ranging down to 9px, and text
 * colors as low as 2.56:1. None of that is visible in a code review of any
 * single file — it only shows up in aggregate, which is what these tests look
 * at.
 *
 * The rules encoded here:
 *   1. Text is never smaller than 14px (--text-xs), the floor for a reader with
 *      significantly reduced acuity.
 *   2. Sizes are declared in rem via the shared scale, never px — px ignores
 *      both the browser's font-size setting and the in-app Text size control,
 *      so hardcoding it silently disables the accessibility feature.
 *   3. Text colors come from the semantic --wc-text-* tokens, which are all
 *      >= 7:1 on white, not from the raw grey ramp.
 */

/** Source files that are ours to hold to the rules. */
function typographySourceFiles(string $in, string $extension): Finder
{
    return Finder::create()
        ->files()
        ->in(sourcePath($in))
        ->name('*.'.$extension)
        // Wayfinder regenerates these on every Vite run; they are gitignored
        // and contain no styling.
        ->notPath('actions')
        ->notPath('routes')
        ->notPath('wayfinder');
}

test('no component hardcodes an inline px font size', function () {
    $offenders = [];

    foreach (typographySourceFiles('resources/js', 'tsx') as $file) {
        $contents = withoutComments($file->getContents());

        // `fontSize: 12` (React treats a bare number as px) and
        // `fontSize: '12px'` alike.
        if (preg_match_all("/fontSize:\s*(?:'\d+(?:\.\d+)?px'|\"\d+(?:\.\d+)?px\"|\d)/", $contents, $matches)) {
            $offenders[$file->getRelativePathname()] = $matches[0];
        }
    }

    expect($offenders)->toBe(
        [],
        'Inline px font sizes do not scale with the reader\'s browser setting or the in-app Text size control. '
        ."Use the scale instead: fontSize: 'var(--text-sm)'."
    );
});

test('no stylesheet hardcodes a px font size', function () {
    $offenders = [];

    foreach (typographySourceFiles('resources/css', 'css') as $file) {
        if (preg_match_all('/font-size:\s*\d+px/', withoutComments($file->getContents()), $matches)) {
            $offenders[$file->getRelativePathname()] = $matches[0];
        }
    }

    expect($offenders)->toBe([], 'Use the shared scale: font-size: var(--text-sm).');
});

test('no component drops below the 14px floor with a Tailwind arbitrary size', function () {
    $offenders = [];

    foreach (typographySourceFiles('resources/js', 'tsx') as $file) {
        $contents = withoutComments($file->getContents());

        if (! preg_match_all('/text-\[(\d+(?:\.\d+)?)px\]/', $contents, $matches)) {
            continue;
        }

        $tooSmall = array_filter($matches[1], fn (string $px): bool => (float) $px < 14);

        if ($tooSmall !== []) {
            $offenders[$file->getRelativePathname()] = array_values($tooSmall);
        }
    }

    expect($offenders)->toBe([], 'Nothing in the product renders below 14px. Use text-xs, which is the floor.');
});

test('the type scale floor is 14px and body copy is at least 16px', function () {
    $theme = withoutComments(file_get_contents(sourcePath('resources/css/app.css')));

    preg_match('/--text-xs:\s*([\d.]+)rem/', $theme, $xs);
    preg_match('/--text-base:\s*([\d.]+)rem/', $theme, $base);

    expect($xs)->not->toBeEmpty('--text-xs must be declared in the @theme block.');
    expect($base)->not->toBeEmpty('--text-base must be declared in the @theme block.');

    // rem values, against a 16px root.
    expect((float) $xs[1] * 16)->toBeGreaterThanOrEqual(14.0);
    expect((float) $base[1] * 16)->toBeGreaterThanOrEqual(16.0);
});

test('every step of the type scale is declared in rem, never px', function () {
    $theme = withoutComments(file_get_contents(sourcePath('resources/css/app.css')));

    preg_match_all('/--text-(?:xs|sm|base|lg|xl|\dxl):\s*([^;]+);/', $theme, $matches);

    expect($matches[1])->not->toBeEmpty();

    foreach ($matches[1] as $value) {
        expect(trim($value))->toEndWith('rem');
    }
});

test('body line height is at least 1.5 so the text-spacing override cannot break the layout', function () {
    $theme = withoutComments(file_get_contents(sourcePath('resources/css/app.css')));

    foreach (['xs', 'sm', 'base', 'lg'] as $step) {
        preg_match('/--text-'.$step.'--line-height:\s*([\d.]+)/', $theme, $match);

        expect($match)->not->toBeEmpty("--text-{$step}--line-height must be declared.");
        expect((float) $match[1])->toBeGreaterThanOrEqual(1.5, "--text-{$step} needs >= 1.5 line height (WCAG 1.4.12).");
    }
});

test('text is never colored from the raw grey ramp', function () {
    // gray-400 is 2.56:1 on white and gray-500 is 4.36:1 on the app background.
    // Both fail for body-sized text; the --wc-text-* tokens exist instead.
    $banned = ['--wc-gray-400', '--wc-gray-500', '--wc-sky-500', '--wc-sky-600'];
    $offenders = [];

    foreach (typographySourceFiles('resources/js', 'tsx') as $file) {
        foreach ($banned as $token) {
            if (str_contains(withoutComments($file->getContents()), "color: 'var({$token})'")) {
                $offenders[] = $file->getRelativePathname().' -> '.$token;
            }
        }
    }

    expect($offenders)->toBe([], 'Use the semantic tokens: --wc-text-muted, --wc-text-secondary, --wc-text-primary, --wc-link.');
});

test('only the accessible type families are referenced', function () {
    // Bricolage Grotesque, DM Sans, Instrument Sans and a bare Inter were all
    // in play at once, and two of them were never actually loaded.
    $retired = ['Bricolage Grotesque', 'DM Sans', 'Instrument Sans', 'instrument-sans', 'fonts.bunny.net'];
    $offenders = [];

    $sources = [
        typographySourceFiles('resources/js', 'tsx'),
        typographySourceFiles('resources/css', 'css'),
        typographySourceFiles('resources/views', 'php'),
    ];

    foreach ($sources as $finder) {
        foreach ($finder as $file) {
            foreach ($retired as $family) {
                if (str_contains(withoutComments($file->getContents()), $family)) {
                    $offenders[] = $file->getRelativePathname().' -> '.$family;
                }
            }
        }
    }

    expect($offenders)->toBe([], 'The product uses one family: Atkinson Hyperlegible Next (plus its Mono companion).');
});
