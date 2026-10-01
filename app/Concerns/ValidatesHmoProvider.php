<?php

namespace App\Concerns;

use Illuminate\Validation\Rule;

/**
 * The one rule that says "Other" is not an HMO provider.
 *
 * The dropdown in `resources/js/lib/hmo-providers.ts` offers Other as an escape
 * hatch for a card the clinic is not accredited with, and every form that shows
 * it also shows a box asking which provider it actually is. The typed name is
 * what gets stored — there is no second column — so the literal `other` only
 * ever means the box was left empty.
 *
 * Refused here as well as client-side, because a value HR cannot act on is
 * worse than a missing one: the approvals queue shows a coverage to verify and
 * names no company to verify it with.
 */
trait ValidatesHmoProvider
{
    /** Mirrors HMO_OTHER in resources/js/lib/hmo-providers.ts. */
    private const HMO_OTHER = 'other';

    /**
     * Rules for an HMO provider field, required when the given coverage field
     * says the patient carries one.
     *
     * @return array<int, \Illuminate\Contracts\Validation\Rule|string>
     */
    protected function hmoProviderRules(string $coverageField): array
    {
        return [
            'nullable',
            'required_if:'.$coverageField.',hmo',
            'string',
            'max:100',
            Rule::notIn([self::HMO_OTHER]),
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function hmoProviderMessages(string $attribute = 'hmo'): array
    {
        return [
            $attribute.'.not_in' => 'Please type the name of the HMO provider.',
        ];
    }
}
