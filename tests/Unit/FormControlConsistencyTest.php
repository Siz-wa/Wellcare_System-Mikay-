<?php

use Symfony\Component\Finder\Finder;

/**
 * Guards the form controls against re-fragmenting.
 *
 * Dropdowns had drifted into five different things — a native <select> with
 * `wc-input wc-select`, a native one with `wc-input` alone (no chevron gutter,
 * so the value ran under the browser's own arrow), one styled entirely from a
 * local inline object, a bespoke `BrandSelect`, and raw shadcn primitives — and
 * date inputs into three. They disagreed on height, radius, padding and font
 * size, and several pinned a width narrower than their own longest option,
 * which is what made a value unreadable.
 *
 * The rules encoded here:
 *   1. Dropdowns go through design-system `Select`, never a raw <select>. A
 *      native select's dropped list is OS chrome: it cannot wrap a long label,
 *      cannot take the brand tokens, and ignores the Text size setting.
 *   2. Dates go through `DateField`, never a raw <input type="date">.
 *   3. No control pins its own height. The shared box sets a minimum so the
 *      value cannot be clipped when the type scale grows.
 *
 * A Unit test: it only reads source files, so it needs no database.
 */

/** Application components, excluding the primitives they are built from. */
function controlSourceFiles(): Finder
{
    return Finder::create()
        ->files()
        ->in(sourcePath('resources/js'))
        ->name('*.tsx')
        // Wayfinder output: regenerated every Vite run, gitignored, no styling.
        ->notPath('actions')
        ->notPath('routes')
        ->notPath('wayfinder')
        // The design system and the shadcn primitives are where the real
        // elements are allowed to live.
        ->notPath('design-system')
        ->notPath('components'.DIRECTORY_SEPARATOR.'ui');
}

test('no page renders a raw select element', function () {
    $offenders = [];

    foreach (controlSourceFiles() as $file) {
        if (str_contains(withoutComments($file->getContents()), '<select')) {
            $offenders[] = $file->getRelativePathname();
        }
    }

    expect($offenders)->toBe(
        [],
        "A native <select> drops an OS list that cannot wrap a long option or follow the Text size setting. Use { Select } from '@/design-system'."
    );
});

test('no page renders a raw date or time input', function () {
    $offenders = [];

    foreach (controlSourceFiles() as $file) {
        if (preg_match('/<input[^>]*type="(date|time|datetime-local|month)"/s', withoutComments($file->getContents()))) {
            $offenders[] = $file->getRelativePathname();
        }
    }

    expect($offenders)->toBe(
        [],
        "Use { DateField } from '@/design-system' so every date shares one box and one calendar glyph."
    );
});

test('no control pins its own height', function () {
    $offenders = [];

    foreach (controlSourceFiles() as $file) {
        $contents = withoutComments($file->getContents());

        // A `height:` inside the props of a Select, DateField or wc-input
        // element. `min-height` on the shared box is what sets the floor; a
        // fixed height clips the value as soon as the type scale grows.
        foreach (['<Select', '<DateField', '<Input'] as $tag) {
            $pattern = '/'.preg_quote($tag, '/').'\b(?:(?!\/>|<\/).){0,600}?\bheight:\s*\d/s';

            if (preg_match($pattern, $contents)) {
                $offenders[] = $file->getRelativePathname().' -> '.$tag;
            }
        }
    }

    expect($offenders)->toBe(
        [],
        'Remove the fixed height; .wc-input sets min-height so the control grows with its content.'
    );
});

test('no element wearing a control class pins its own height', function () {
    $offenders = [];

    foreach (controlSourceFiles() as $file) {
        $contents = withoutComments($file->getContents());

        // Any <input>, <button> or <textarea> carrying wc-input or wc-btn.
        // These sit in the same rows as the components above, so a height they
        // pin themselves is a row that no longer lines up — and at the larger
        // Text size settings it is a value that gets clipped.
        preg_match_all(
            '/<(?:input|button|textarea)\b((?:(?!\/>|>).)*)/s',
            $contents,
            $matches,
        );

        foreach ($matches[1] as $attrs) {
            if (! preg_match('/wc-input|wc-btn/', $attrs)) {
                continue;
            }

            if (preg_match('/(?<!min-)(?<!max-)(?<!line)\bheight:\s*\d/', $attrs)) {
                $offenders[] = $file->getRelativePathname();
                break;
            }
        }
    }

    expect($offenders)->toBe(
        [],
        'Drop the fixed height. .wc-input and .wc-btn-* set min-height, which is what keeps a form row aligned and lets it grow with the Text size setting.'
    );
});

/**
 * A button and an input side by side in a form row is the most common pairing
 * in this product — a date plus "Add", a search plus "Search". If their minimum
 * heights drift apart the row reads as broken, so the pairing is pinned here.
 */
test('the medium button matches the control box height', function () {
    $css = file_get_contents(sourcePath('resources/css/components.css'));

    preg_match('/\.wc-input \{(.*?)\}/s', $css, $input);
    preg_match('/\.wc-btn-md \{(.*?)\}/s', $css, $button);

    expect($input)->not->toBeEmpty('.wc-input must be defined.');
    expect($button)->not->toBeEmpty('.wc-btn-md must be defined.');

    preg_match('/min-height:\s*([^;]+);/', $input[1], $inputHeight);
    preg_match('/min-height:\s*([^;]+);/', $button[1], $buttonHeight);

    expect($inputHeight)->not->toBeEmpty('.wc-input needs a min-height.');
    expect($buttonHeight)->not->toBeEmpty('.wc-btn-md needs a min-height.');
    expect(trim($buttonHeight[1]))->toBe(trim($inputHeight[1]));
});

/**
 * A px width does not scale with the Text size setting, and it was tuned against
 * whatever typeface was current when it was written. Both bit here: widths sized
 * for 14px DM Sans left "30 min" wrapping and "08:00 AM" clipped once the face
 * became 15px Atkinson Hyperlegible. rem widths scale; `auto` sizes to content.
 */
test('no dropdown or date control pins a px width', function () {
    $offenders = [];

    foreach (controlSourceFiles() as $file) {
        $contents = withoutComments($file->getContents());

        foreach (['<Select', '<DateField'] as $tag) {
            $pattern = '/'.preg_quote($tag, '/').'((?:(?!\/>).){0,800})/s';
            preg_match_all($pattern, $contents, $matches);

            foreach ($matches[1] as $attrs) {
                // `width: 120` / `minWidth: 170` — a bare number is px in React.
                if (preg_match('/(?:width|minWidth|maxWidth):\s*\d/', $attrs)) {
                    $offenders[] = $file->getRelativePathname().' -> '.$tag;
                    break;
                }
            }
        }
    }

    expect($offenders)->toBe(
        [],
        "Use a rem width (\"8rem\") or width: 'auto', so the control follows the type scale instead of a number measured against a retired font."
    );
});

/**
 * The chevron is a real flex item with its own width and gap, unlike the
 * background-image arrow the native <select> used. Reserving padding for it as
 * well double-counted ~36px, which is what wrapped "30 min" onto two lines
 * inside a 120px control.
 */
test('the select trigger reserves chevron space exactly once', function () {
    $css = file_get_contents(sourcePath('resources/css/components.css'));

    preg_match('/\.wc-select-trigger \{(.*?)\}/s', $css, $trigger);
    expect($trigger)->not->toBeEmpty('.wc-select-trigger must be defined.');

    preg_match('/padding-right:\s*([^;]+);/', $trigger[1], $padding);
    expect($padding)->not->toBeEmpty('.wc-select-trigger needs a padding-right.');
    expect(trim($padding[1]))->toBe(
        'var(--wc-control-gutter)',
        'The chevron is a flex item; padding must not reserve room for it a second time.'
    );
});

test('the shared control box uses a minimum height, not a fixed one', function () {
    $css = file_get_contents(sourcePath('resources/css/components.css'));

    preg_match('/\.wc-input \{(.*?)\}/s', $css, $match);

    expect($match)->not->toBeEmpty('.wc-input must be defined.');
    expect($match[1])->toContain('min-height:');
    expect($match[1])->not->toMatch('/[^-]height:\s*\d/');
});

/**
 * The bug that started this: a 180px trigger listing HMO providers whose names
 * are far longer than 180px. The panel must be free to grow past the trigger,
 * and a row must be free to wrap — otherwise the label is unreadable in both
 * places at once.
 */
test('the dropdown panel can outgrow its trigger and its rows can wrap', function () {
    $css = file_get_contents(sourcePath('resources/css/components.css'));

    preg_match('/\.wc-select-panel \{(.*?)\}/s', $css, $panel);
    expect($panel)->not->toBeEmpty('.wc-select-panel must be defined.');
    expect($panel[1])->toContain('min-width: var(--radix-select-trigger-width)');
    expect($panel[1])->toContain('max-width:');

    preg_match('/\.wc-select-item \{(.*?)\}/s', $css, $item);
    expect($item)->not->toBeEmpty('.wc-select-item must be defined.');
    expect($item[1])->toContain('white-space: normal');
});

test('the design system exports exactly one dropdown and one date control', function () {
    $index = file_get_contents(sourcePath('resources/js/design-system/index.ts'));

    expect($index)->toContain("export { Select, NativeSelect } from './components/select';");
    expect($index)->toContain("export { DateField, DateRangeField } from './components/date-field';");

    // form.tsx used to export a second, native-select `Select`.
    $form = file_get_contents(sourcePath('resources/js/design-system/components/form.tsx'));
    expect($form)->not->toContain('export const Select');
});
