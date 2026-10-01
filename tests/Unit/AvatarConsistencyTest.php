<?php

/**
 * Guards the surfaces that show a person's face against re-fragmenting.
 *
 * DoctorAvatar exists because the same coloured circle had been written four
 * times over, and each copy is a chance for one surface to keep rendering
 * initials for someone who has a photograph — or, worse, to render a photograph
 * for a doctor who has withdrawn consent.
 *
 * That is not a hypothetical. When photographs were added, the public
 * directory, the profile page, the booking picker and the settings preview all
 * showed them, while the dashboard topbar and the private profile page — the
 * two places a doctor looks at their OWN account — went on drawing their
 * initials, because each had its own hand-rolled circle.
 *
 * A Unit test: it only reads source files, so it needs no database.
 */
$avatarSurfaces = [
    // Patient-facing: shows a photograph only once it is published.
    'resources/js/pages/generals/doctors/sections/doctors-grid.tsx',
    'resources/js/pages/generals/doctors/sections/doctor-profile.tsx',
    'resources/js/pages/user/book-appointment/components/doctor-picker.tsx',
    'resources/js/pages/user/book-appointment/sections/step-coverage.tsx',
    // The doctor's own account, published or not.
    'resources/js/pages/settings/professional/sections/public-preview.tsx',
    'resources/js/pages/settings/profile/sections/identity-summary.tsx',
    'resources/js/design-system/components/user-menu.tsx',
];

test('every surface that shows a face renders it through DoctorAvatar', function (string $relative) {
    $path = sourcePath(str_replace('/', DIRECTORY_SEPARATOR, $relative));

    expect(file_exists($path))->toBeTrue("{$relative} has moved — update this list rather than deleting the guard.");

    $rendersAvatar = str_contains(
        withoutComments((string) file_get_contents($path)),
        '<DoctorAvatar',
    );

    expect($rendersAvatar)->toBeTrue(
        "{$relative} draws its own avatar. Use { DoctorAvatar } from '@/components/doctor-avatar' so one place decides photograph-or-initials."
    );
})->with($avatarSurfaces);
