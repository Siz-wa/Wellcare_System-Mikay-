<?php

use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Database\Seeders\ServiceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // Almost everything in this app is gated on a Spatie role: the `role:`
        // route middleware, and CreateNewUser which assigns "user" on register.
        // RefreshDatabase truncates the roles table, so re-seed it per test.
        $this->seed(RoleAndPermissionSeeder::class);

        // The service catalogue is reference data on exactly the same footing,
        // and for the same reason it belongs here rather than in each file.
        //
        // It used to be App\Enums\Service — eleven PHP cases that existed
        // whether or not anything seeded them. Moving it into a table (see
        // create_services_table) made it something a test has to CREATE, and
        // twelve files that book appointments never learned that: their
        // hand-rolled seeder lists predate the table. BookAppointmentRequest
        // validates `service` against it, so every booking POST failed with
        // "Please select a valid service.", and AppointmentSeeder divides by
        // `count(Service::bookableSlugs())`, so it raised DivisionByZeroError
        // on an empty catalogue. Thirty tests, one missing row set.
        //
        // Seeded globally rather than added to those twelve files because it
        // is not a fixture any single test owns — it is the clinic's own list,
        // present in every real request. Idempotent (`firstOrNew` on slug), so
        // the two files that seed it themselves are unaffected, and no test
        // depends on an empty or fixed-size catalogue.
        $this->seed(ServiceSeeder::class);
    })
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * A user with a Spatie role attached.
 *
 * Bare User::factory() users have no role, so every `role:`-gated route
 * returns 403 for them — which is why the starter-kit settings tests failed.
 *
 * Staff roles also come 2FA-enrolled, because X-01 made two-factor mandatory
 * for them. That lives in `UserFactory::role()` rather than here, so tests that
 * build a staff user directly through the factory get it too.
 */
function userWithRole(string $role = 'user'): User
{
    return User::factory()->role($role)->create();
}

/*
|--------------------------------------------------------------------------
| Source-scanning helpers
|--------------------------------------------------------------------------
|
| Used by the design-system guard tests in tests/Unit, which assert properties
| of the source itself — that nothing renders a raw <select>, that no font size
| is hardcoded in px — rather than of a running request. They read files off
| disk, so they deliberately avoid booting the framework.
|
*/

/** The project root. `base_path()` needs an application; these tests have none. */
function sourcePath(string $path = ''): string
{
    return dirname(__DIR__).($path === '' ? '' : DIRECTORY_SEPARATOR.$path);
}

/**
 * Strip comments from a source file.
 *
 * The guards are about CODE, not prose. A comment explaining why a retired
 * font or a banned element was retired is exactly what a future reader needs,
 * so it must not trip the guard that enforces the retirement.
 */
function withoutComments(string $source): string
{
    $patterns = [
        '#/\*.*?\*/#s',        // /* ... */  (CSS and JS)
        '#\{\{--.*?--\}\}#s',  // {{-- ... --}}  (Blade)
        '#(?<!:)//[^\n]*#',      // // to end of line, but not a URL scheme
    ];

    return preg_replace($patterns, '', $source) ?? $source;
}
