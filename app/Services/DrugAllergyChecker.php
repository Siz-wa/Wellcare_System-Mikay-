<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientAllergy;
use Illuminate\Support\Collection;

/**
 * Task 1.1 — warn before a prescription contradicts a recorded allergy.
 *
 * ## What this is, and what it is emphatically not
 *
 * This is **name matching over a small hand-written ingredient table**. It is
 * not a drug database, not a formulary, and not a clinical decision support
 * system. It will miss things: a brand it has never heard of, a misspelling, a
 * compound preparation, an allergy recorded as "antibiotics" rather than a
 * named drug. Every one of those is a false negative, and a false negative here
 * looks exactly like "no allergy recorded".
 *
 * It is worth building anyway, and the reason is the gap it closes. The system
 * already records allergies with a severity grade and shows them as red flags
 * on the chart, and it is about to be able to issue prescriptions. Connecting
 * the two catches the case that actually happens — a doctor prescribing
 * amoxicillin to a patient whose chart says "Penicillin, severe" — for a
 * fraction of the cost of a real drug reference.
 *
 * ONC criterion §170.315(a)(4) requires that a certified system, before a
 * medication order is completed, "automatically indicate to a user drug-drug
 * and drug-allergy contraindications based on a patient's medication list and
 * medication allergy list". This does the drug-allergy half against the allergy
 * list. The drug-drug half needs the structured medication list that is task
 * 3.2, and is not attempted here.
 *
 * **The clinician remains responsible for the prescription.** A silent result
 * from this class means "nothing matched the table", never "this drug is safe".
 * The UI wording must say so.
 *
 * ## Why the matching happens in PHP
 *
 * `patient_allergies.allergen` is encrypted at rest (SC-5), so `LIKE` over it
 * returns nothing rather than failing. Matching therefore has to load the rows
 * and compare decrypted values in memory. That is acceptable precisely because
 * the set is tiny — a patient has a handful of allergies, not thousands.
 */
class DrugAllergyChecker
{
    /**
     * Ingredient families, keyed by family name.
     *
     * A prescription and an allergy that resolve to the same family are treated
     * as a match. Generic names first, then the Philippine brand names a doctor
     * or a patient is actually likely to have typed — "Biogesic" is what ends up
     * in a chart here far more often than "paracetamol".
     *
     * Deliberately shallow. A long list maintained by hand rots; these are the
     * families behind the great majority of real allergy entries.
     *
     * @var array<string, array<int, string>>
     */
    private const FAMILIES = [
        'penicillin' => [
            'penicillin', 'amoxicillin', 'amoxycillin', 'ampicillin', 'cloxacillin',
            'oxacillin', 'piperacillin', 'co-amoxiclav', 'coamoxiclav', 'amoxiclav',
            'augmentin', 'penicilin',
        ],
        'cephalosporin' => [
            'cephalosporin', 'cephalexin', 'cefalexin', 'cefuroxime', 'ceftriaxone',
            'cefixime', 'cefaclor', 'cefazolin', 'ceftazidime',
        ],
        'sulfonamide' => [
            'sulfa', 'sulfonamide', 'sulfamethoxazole', 'cotrimoxazole',
            'co-trimoxazole', 'trimethoprim', 'bactrim', 'sulfadiazine',
        ],
        'nsaid' => [
            'nsaid', 'ibuprofen', 'mefenamic', 'mefenamic acid', 'naproxen',
            'diclofenac', 'celecoxib', 'ketorolac', 'etoricoxib', 'alaxan',
            'ponstan', 'advil', 'medicol',
        ],
        'salicylate' => [
            'aspirin', 'acetylsalicylic', 'acetylsalicylic acid', 'salicylate',
        ],
        'macrolide' => [
            'macrolide', 'erythromycin', 'azithromycin', 'clarithromycin',
            'zithromax',
        ],
        'paracetamol' => [
            'paracetamol', 'acetaminophen', 'biogesic', 'tempra', 'calpol',
        ],
        'quinolone' => [
            'quinolone', 'fluoroquinolone', 'ciprofloxacin', 'levofloxacin',
            'ofloxacin', 'moxifloxacin',
        ],
        'tetracycline' => [
            'tetracycline', 'doxycycline', 'minocycline',
        ],
    ];

    /**
     * Families with clinically recognised cross-reactivity.
     *
     * Penicillin and cephalosporin allergy overlap in a minority of patients —
     * real enough that a prescriber should be told, uncertain enough that
     * reporting it as a direct contraindication would be wrong and would train
     * people to dismiss the warning. Surfaced as its own weaker match type so
     * the UI can word it as a caution rather than a conflict.
     *
     * Aspirin and the other NSAIDs sit the same way round.
     *
     * @var array<string, array<int, string>>
     */
    private const CROSS_REACTIVE = [
        'penicillin' => ['cephalosporin'],
        'cephalosporin' => ['penicillin'],
        'nsaid' => ['salicylate'],
        'salicylate' => ['nsaid'],
    ];

    /** A recorded allergy names the drug itself, or its ingredient family. */
    public const MATCH_DIRECT = 'direct';

    /** The drug and the allergy belong to the same ingredient family. */
    public const MATCH_FAMILY = 'family';

    /** Different families, with recognised partial cross-reactivity. */
    public const MATCH_CROSS_REACTIVE = 'cross_reactive';

    /**
     * Every recorded allergy that the given drug name may contradict.
     *
     * Returns an empty array when nothing matched — which, to say it once more,
     * means "not found in the table", not "safe".
     *
     * @return array<int, array{allergen: string, severity: string, reaction: string|null, match: string, family: string|null}>
     */
    public function check(Patient $patient, string $drugName): array
    {
        $normalisedDrug = $this->normalise($drugName);

        if ($normalisedDrug === '') {
            return [];
        }

        $drugFamily = $this->familyFor($normalisedDrug);

        return $patient->allergies
            ->map(fn (PatientAllergy $allergy) => $this->compare($allergy, $normalisedDrug, $drugFamily))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Check a whole prescription list in one pass.
     *
     * @param  array<int, array{name?: string|null}>  $medications
     * @return array<int, array{name: string, conflicts: array<int, array<string, mixed>>}>
     */
    public function checkAll(Patient $patient, array $medications): array
    {
        $results = [];

        foreach ($medications as $medication) {
            $name = trim((string) ($medication['name'] ?? ''));

            if ($name === '') {
                continue;
            }

            $conflicts = $this->check($patient, $name);

            if ($conflicts !== []) {
                $results[] = ['name' => $name, 'conflicts' => $conflicts];
            }
        }

        return $results;
    }

    /**
     * @return array{allergen: string, severity: string, reaction: string|null, match: string, family: string|null}|null
     */
    private function compare(PatientAllergy $allergy, string $normalisedDrug, ?string $drugFamily): ?array
    {
        $normalisedAllergen = $this->normalise((string) $allergy->allergen);

        if ($normalisedAllergen === '') {
            return null;
        }

        $allergenFamily = $this->familyFor($normalisedAllergen);

        $matchType = $this->matchType($normalisedDrug, $normalisedAllergen, $drugFamily, $allergenFamily);

        if ($matchType === null) {
            return null;
        }

        return [
            'allergen' => (string) $allergy->allergen,
            'severity' => (string) $allergy->severity,
            'reaction' => $allergy->reaction,
            'match' => $matchType,
            'family' => $drugFamily ?? $allergenFamily,
        ];
    }

    private function matchType(
        string $drug,
        string $allergen,
        ?string $drugFamily,
        ?string $allergenFamily,
    ): ?string {
        // Whole-word containment either way: "Amoxicillin 500mg" against an
        // allergy recorded as "amoxicillin", or an allergy recorded as
        // "amoxicillin trihydrate" against a prescription of "amoxicillin".
        if ($this->containsWord($drug, $allergen) || $this->containsWord($allergen, $drug)) {
            return self::MATCH_DIRECT;
        }

        if ($drugFamily !== null && $drugFamily === $allergenFamily) {
            return self::MATCH_FAMILY;
        }

        if ($drugFamily !== null && $allergenFamily !== null
            && in_array($allergenFamily, self::CROSS_REACTIVE[$drugFamily] ?? [], true)) {
            return self::MATCH_CROSS_REACTIVE;
        }

        return null;
    }

    /**
     * Which ingredient family a normalised name belongs to, if any.
     */
    private function familyFor(string $normalised): ?string
    {
        foreach (self::FAMILIES as $family => $members) {
            foreach ($members as $member) {
                if ($this->containsWord($normalised, $member)) {
                    return $family;
                }
            }
        }

        return null;
    }

    /**
     * Is `$needle` present in `$haystack` on a word boundary?
     *
     * Boundaries matter more than they look. A naive `str_contains` matches
     * "penicillin" inside a hypothetical "…penicillinase" and, worse, matches
     * short tokens inside unrelated longer words — and a warning that fires on
     * nonsense is a warning clinicians learn to click through, which is the
     * failure mode that makes alerting useless.
     */
    private function containsWord(string $haystack, string $needle): bool
    {
        if ($needle === '' || $haystack === '') {
            return false;
        }

        // Optional trailing "s". Class names get written both ways and a chart
        // is far more likely to say "NSAIDs" or "sulfonamides" than the
        // singular — without this, the commonest way of recording a whole-class
        // allergy silently matched nothing.
        //
        // Only a trailing "s", not general stemming: aggressive stemming
        // collapses unrelated drug names into each other, and a checker that
        // fires on the wrong drug trains people to dismiss it.
        return preg_match('/\b'.preg_quote($needle, '/').'s?\b/u', $haystack) === 1;
    }

    /**
     * Reduce a written drug or allergen to comparable words.
     *
     * Strips the dosage, form and packaging noise that a doctor types alongside
     * the ingredient — "Amoxicillin 500mg cap TID" and "amoxicillin" have to
     * compare equal, or the check silently never fires in real use.
     */
    private function normalise(string $value): string
    {
        $value = mb_strtolower(trim($value));

        // Strengths and quantities: 500mg, 250 mg, 5ml, 1g, 80mcg, 10%.
        $value = preg_replace('/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|l|iu|%)\b/u', ' ', $value) ?? $value;

        // Bare numbers left behind by the above, and by "2x a day".
        $value = preg_replace('/\b\d+(\.\d+)?\b/u', ' ', $value) ?? $value;

        // Dose forms and routes that carry no ingredient information.
        $noise = [
            'tablet', 'tablets', 'tab', 'tabs', 'capsule', 'capsules', 'cap', 'caps',
            'syrup', 'suspension', 'susp', 'drops', 'injection', 'inj', 'iv', 'im',
            'cream', 'ointment', 'gel', 'patch', 'inhaler', 'nebule', 'sachet',
            'oral', 'topical', 'po', 'prn', 'od', 'bid', 'tid', 'qid', 'hs',
        ];
        $value = preg_replace('/\b('.implode('|', $noise).')\b/u', ' ', $value) ?? $value;

        // Punctuation to spaces, except the hyphen, which is load-bearing in
        // "co-amoxiclav" and "co-trimoxazole".
        $value = preg_replace('/[^\p{L}\p{N}\-]+/u', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }

    /**
     * The families table, for a UI that wants to explain what was matched.
     *
     * @return Collection<string, array<int, string>>
     */
    public function families(): Collection
    {
        return collect(self::FAMILIES);
    }
}
