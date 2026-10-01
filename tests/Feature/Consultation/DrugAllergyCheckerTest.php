<?php

use App\Models\Patient;
use App\Models\PatientAllergy;
use App\Models\User;
use App\Services\DrugAllergyChecker;

/**
 * Task 1.1 — the drug-allergy check.
 *
 * Two failure directions, both tested, because they fail differently:
 *
 *   • A missed conflict is a patient given a drug they react to.
 *   • A spurious warning is worse than it looks — alert fatigue is why
 *     clinicians learn to dismiss warnings without reading them, and a checker
 *     that cries wolf destroys the value of the one alert that mattered.
 *
 * The `does not fire` block is therefore not padding; it is half the point.
 */
function patientAllergicTo(string ...$allergens): Patient
{
    $patient = Patient::factory()->create();
    $recorder = User::factory()->create();

    foreach ($allergens as $allergen) {
        PatientAllergy::create([
            'patient_id' => $patient->id,
            'recorded_by' => $recorder->id,
            'allergen' => $allergen,
            'severity' => 'severe',
            'reaction' => 'Anaphylaxis',
        ]);
    }

    return $patient->load('allergies');
}

function checker(): DrugAllergyChecker
{
    return app(DrugAllergyChecker::class);
}

// ── The case this whole task exists for ──────────────────────────────────────

test('amoxicillin is flagged for a patient allergic to penicillin', function () {
    $patient = patientAllergicTo('Penicillin');

    $conflicts = checker()->check($patient, 'Amoxicillin');

    expect($conflicts)->toHaveCount(1)
        ->and($conflicts[0]['match'])->toBe(DrugAllergyChecker::MATCH_FAMILY)
        ->and($conflicts[0]['allergen'])->toBe('Penicillin')
        ->and($conflicts[0]['severity'])->toBe('severe');
});

test('the exact drug named in the allergy is flagged as a direct match', function () {
    $patient = patientAllergicTo('Amoxicillin');

    expect(checker()->check($patient, 'Amoxicillin')[0]['match'])
        ->toBe(DrugAllergyChecker::MATCH_DIRECT);
});

// ── Real-world writing, not tidy inputs ──────────────────────────────────────

test('dosage, form and frequency noise does not hide the ingredient', function (string $written) {
    $patient = patientAllergicTo('Penicillin');

    expect(checker()->check($patient, $written))->not->toBeEmpty();
})->with([
    'strength' => ['Amoxicillin 500mg'],
    'strength + form' => ['Amoxicillin 500 mg capsule'],
    'with frequency' => ['Amoxicillin 500mg cap TID'],
    'syrup' => ['Amoxicillin 250mg/5ml syrup'],
    'brand' => ['Augmentin 625mg'],
    'hyphenated' => ['Co-amoxiclav 625mg'],
    'lowercase' => ['amoxicillin'],
    'padded' => ['   Amoxicillin   '],
]);

test('philippine brand names resolve to their ingredient family', function (string $brand, string $allergen) {
    $patient = patientAllergicTo($allergen);

    expect(checker()->check($patient, $brand))->not->toBeEmpty();
})->with([
    'biogesic → paracetamol' => ['Biogesic 500mg', 'Paracetamol'],
    'alaxan → nsaid' => ['Alaxan FR', 'Ibuprofen'],
    'ponstan → mefenamic' => ['Ponstan 500mg', 'Mefenamic acid'],
    'bactrim → sulfa' => ['Bactrim forte', 'Sulfa'],
]);

test('an allergy written as a family name catches a specific drug', function () {
    $patient = patientAllergicTo('NSAIDs');

    expect(checker()->check($patient, 'Ibuprofen 400mg'))->not->toBeEmpty();
});

// ── Cross-reactivity is reported, but as a weaker signal ─────────────────────

test('penicillin allergy raises a cross-reactivity caution for cephalosporins', function () {
    $patient = patientAllergicTo('Penicillin');

    $conflicts = checker()->check($patient, 'Cefuroxime 500mg');

    expect($conflicts)->toHaveCount(1)
        ->and($conflicts[0]['match'])->toBe(DrugAllergyChecker::MATCH_CROSS_REACTIVE);
});

test('cross-reactivity is not reported as a direct conflict', function () {
    // Reporting a partial overlap as a hard contraindication is how a warning
    // system teaches people to ignore it.
    $patient = patientAllergicTo('Penicillin');

    expect(checker()->check($patient, 'Cephalexin')[0]['match'])
        ->not->toBe(DrugAllergyChecker::MATCH_DIRECT);
});

// ── It does not fire when it should not ──────────────────────────────────────

test('an unrelated drug raises nothing', function (string $drug) {
    $patient = patientAllergicTo('Penicillin');

    expect(checker()->check($patient, $drug))->toBeEmpty();
})->with([
    'paracetamol' => ['Paracetamol 500mg'],
    'metformin' => ['Metformin 850mg'],
    'losartan' => ['Losartan 50mg'],
    'salbutamol' => ['Salbutamol nebule'],
]);

test('a patient with no recorded allergies raises nothing', function () {
    $patient = Patient::factory()->create()->load('allergies');

    expect(checker()->check($patient, 'Amoxicillin 500mg'))->toBeEmpty();
});

test('an empty or whitespace drug name raises nothing', function (string $name) {
    expect(checker()->check(patientAllergicTo('Penicillin'), $name))->toBeEmpty();
})->with(['empty' => [''], 'spaces' => ['   ']]);

test('matching respects word boundaries', function () {
    // A substring match would fire "codeine" on "cod". Alert fatigue is caused
    // by exactly this kind of sloppiness, and a warning clinicians learn to
    // click through protects nobody.
    $patient = patientAllergicTo('Codeine');

    expect(checker()->check($patient, 'Cod liver oil'))->toBeEmpty();
});

test('a longer word merely containing the allergen does not match', function () {
    // "Penicillinase" is an enzyme, not a penicillin. The boundary rule is what
    // keeps it out.
    //
    // The trade-off is real and accepted: a drug written as
    // "penicillinase-resistant penicillin" would also fail to match on the
    // first word — but it matches on the second, and the drugs in that class
    // (cloxacillin, oxacillin) are in the family table under their own names.
    $patient = patientAllergicTo('Penicillin');

    expect(checker()->check($patient, 'Penicillinase enzyme assay'))->toBeEmpty();
});

test('a whole-class allergy written in the plural still matches', function (string $written) {
    // The bug this caught: "NSAIDs" is how a chart actually records the class,
    // and the singular-only family table matched none of them.
    $patient = patientAllergicTo($written);

    expect(checker()->check($patient, 'Ibuprofen 400mg'))->not->toBeEmpty();
})->with([
    'plural' => ['NSAIDs'],
    'singular' => ['NSAID'],
    'lowercase plural' => ['nsaids'],
]);

// ── Several allergies, several drugs ─────────────────────────────────────────

test('every conflicting allergy is reported, not just the first', function () {
    $patient = patientAllergicTo('Penicillin', 'Amoxicillin');

    expect(checker()->check($patient, 'Amoxicillin 500mg'))->toHaveCount(2);
});

test('checkAll reports only the medications that conflict', function () {
    $patient = patientAllergicTo('Penicillin');

    $results = checker()->checkAll($patient, [
        ['name' => 'Paracetamol 500mg'],
        ['name' => 'Amoxicillin 500mg'],
        ['name' => ''],
        ['name' => 'Losartan 50mg'],
    ]);

    expect($results)->toHaveCount(1)
        ->and($results[0]['name'])->toBe('Amoxicillin 500mg')
        ->and($results[0]['conflicts'])->toHaveCount(1);
});

test('the severity and reaction on the chart reach the warning', function () {
    $patient = Patient::factory()->create();
    PatientAllergy::create([
        'patient_id' => $patient->id,
        'recorded_by' => User::factory()->create()->id,
        'allergen' => 'Penicillin',
        'severity' => 'moderate',
        'reaction' => 'Hives',
    ]);

    $conflict = checker()->check($patient->load('allergies'), 'Amoxicillin')[0];

    // The prescriber needs to know how bad it was last time, not just that
    // something matched.
    expect($conflict['severity'])->toBe('moderate')
        ->and($conflict['reaction'])->toBe('Hives');
});
