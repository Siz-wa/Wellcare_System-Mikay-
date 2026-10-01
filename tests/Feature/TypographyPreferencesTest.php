<?php

/**
 * Text size and contrast are reader accessibility controls, so they have to be
 * resolved on the SERVER and stamped into the first byte of HTML. If they were
 * applied from localStorage in a client effect instead, a reader on 150% would
 * be shown a frame of 100% text on every navigation — which is exactly the
 * flash that makes an enlarged-text setting unusable in practice.
 *
 * These tests pin that contract: the cookie reaches <html>, and a junk cookie
 * cannot inject anything into the attribute.
 */
test('the root view defaults to standard text size and contrast', function () {
    $this->actingAs(userWithRole('user'))
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertSee('data-text-size="base"', false)
        ->assertSee('data-contrast="standard"', false);
});

test('the text size cookie is stamped onto the html element', function (string $size) {
    $this->actingAs(userWithRole('user'))
        ->withUnencryptedCookie('text_size', $size)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertSee('data-text-size="'.$size.'"', false);
})->with(['base', 'lg', 'xl', 'xxl']);

test('the contrast cookie is stamped onto the html element', function (string $contrast) {
    $this->actingAs(userWithRole('user'))
        ->withUnencryptedCookie('contrast', $contrast)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertSee('data-contrast="'.$contrast.'"', false);
})->with(['standard', 'high']);

/**
 * Both cookies are excluded from encryption in bootstrap/app.php so the client
 * can write them directly, which means their contents are attacker-controlled
 * and land in an HTML attribute. Blade escaping already handles the quoting;
 * the allowlist in HandleAppearance is the second line, and it is what keeps a
 * stale value from a previous release from producing an unstyled page too.
 */
test('an unrecognised preference cookie falls back to the default', function (string $cookie, string $attribute, string $default) {
    $this->actingAs(userWithRole('user'))
        ->withUnencryptedCookie($cookie, '" onload="alert(1)')
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertSee($attribute.'="'.$default.'"', false)
        ->assertDontSee('onload="alert(1)"', false);
})->with([
    ['text_size', 'data-text-size', 'base'],
    ['contrast', 'data-contrast', 'standard'],
]);

/**
 * Every page in this app is a sidebar or nav shell wrapped around one region of
 * content. Without a skip link, a screen-reader or magnifier user re-traverses
 * the whole sidebar on every navigation.
 */
test('the root view renders a skip link to the main landmark', function () {
    $this->actingAs(userWithRole('user'))
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertSee('href="#main-content"', false)
        ->assertSee('Skip to main content', false);
});

/**
 * The previous root view loaded Instrument Sans from fonts.bunny.net, which no
 * stylesheet in the project ever referenced, while the real families were
 * pulled by a CSS `@import` that cannot start downloading until app.css has
 * itself parsed. Preloading the real ones is what puts the accessible face on
 * screen before first paint.
 *
 * They are self-hosted: the system is demonstrated on a laptop with no
 * internet, where a Google Fonts link never resolves and every page falls back
 * to a system font.
 */
test('the root view preloads the accessible type families and nothing else', function () {
    $response = $this->actingAs(userWithRole('user'))
        ->get(route('user.dashboard'))
        ->assertOk();

    $response->assertSee('fonts/atkinson/atkinson.css', false);
    $response->assertSee('fonts/atkinson/atkinson-hyperlegible-next-normal-latin.woff2', false);

    $response->assertDontSee('fonts.googleapis.com', false);
    $response->assertDontSee('fonts.gstatic.com', false);
    $response->assertDontSee('fonts.bunny.net', false);
    $response->assertDontSee('instrument-sans', false);
});

test('every self-hosted font file the stylesheet names exists', function () {
    $stylesheet = file_get_contents(public_path('fonts/atkinson/atkinson.css'));

    preg_match_all('~url\(\./([^)]+)\)~', $stylesheet, $matches);

    expect($stylesheet)
        ->toContain("font-family: 'Atkinson Hyperlegible Next'")
        ->toContain("font-family: 'Atkinson Hyperlegible Mono'");

    expect($matches[1])->toHaveCount(8);

    foreach ($matches[1] as $file) {
        expect(public_path("fonts/atkinson/{$file}"))->toBeFile();
    }
});

/**
 * WCAG 1.4.4: a low-vision reader's last resort is pinch-zoom, and a viewport
 * meta that pins maximum-scale or sets user-scalable=no takes it away.
 */
test('the viewport meta never disables zoom', function () {
    $response = $this->actingAs(userWithRole('user'))
        ->get(route('user.dashboard'))
        ->assertOk();

    $response->assertSee('name="viewport"', false);
    $response->assertDontSee('user-scalable=no', false);
    $response->assertDontSee('maximum-scale', false);
});

/**
 * The setting is stored per DEVICE (a cookie), not per account. That is the
 * promise the Appearance page makes — "the workstation at the clinic and your
 * phone can differ" — and it is the right shape for a shared clinic terminal,
 * where the enlarged text belongs to the machine the low-vision staffer sits
 * at rather than following them onto every other screen.
 *
 * Same user, second device: back to the default.
 */
test('the text size preference is per-device, not per-account', function () {
    $reader = userWithRole('user');

    $this->actingAs($reader)
        ->withUnencryptedCookie('text_size', 'xxl')
        ->get(route('user.dashboard'))
        ->assertSee('data-text-size="xxl"', false);

    // A second device for the same account carries none of the first one's
    // cookies.
    $this->unencryptedCookies = [];
    $this->defaultCookies = [];

    $this->actingAs($reader)
        ->get(route('user.dashboard'))
        ->assertSee('data-text-size="base"', false);
});
