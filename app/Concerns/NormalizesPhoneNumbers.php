<?php

namespace App\Concerns;

/**
 * The one place a Philippine mobile number is given a shape.
 *
 * Six forms collect a contact number and three of them used to validate it as
 * `string|max:20`, so `not a number` was storable from the admin and nurse
 * screens while every other path enforced a mobile format. That is not a
 * cosmetic inconsistency: `Patient::findOrCreateFromBooking()` dedupes on
 * lowercased first name + last name + `contact_number`, so a number typed with
 * spaces on one screen and without them on another produces two patient
 * records for one person — precisely the split the dedupe exists to prevent.
 *
 * Normalization runs before validation rather than after it, so a number
 * pasted out of a phone's contacts (`+63 917 123 4567`) is accepted and
 * reshaped instead of rejected with an error the user cannot act on. The rule
 * then only has to describe the single stored form.
 */
trait NormalizesPhoneNumbers
{
    /**
     * The stored shape: an 11-digit PH mobile beginning `09`.
     *
     * Tighter than the `/^(\+639|09)\d{9}$/` this replaces, which is safe
     * because normalizePhoneNumber() has already folded `+639…` into `09…`
     * by the time any rule sees the value.
     */
    public const PH_MOBILE_REGEX = '/^09\d{9}$/';

    /**
     * @return array<int, string>
     */
    protected function phoneRules(bool $required = false): array
    {
        return [
            $required ? 'required' : 'nullable',
            'string',
            'regex:'.self::PH_MOBILE_REGEX,
        ];
    }

    /**
     * The message that goes with those rules, keyed for a `messages()` array.
     *
     * @return array<string, string>
     */
    protected function phoneMessages(string $field = 'contact_number'): array
    {
        return [
            $field.'.regex' => 'Please enter a valid PH mobile number (e.g. 09171234567).',
        ];
    }

    /**
     * Reduce anything phone-shaped to `09XXXXXXXXX`.
     *
     * Returns null for an absent or blank value so a nullable column stays
     * null rather than becoming an empty string.
     */
    protected function normalizePhoneNumber(mixed $raw): ?string
    {
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $trimmed = trim($raw);

        /*
          Only reshape something already phone-shaped.

          Stripping non-digits from anything at all is how "call me" becomes
          the empty string — which Laravel treats as *absent*, so a `nullable`
          rule skips it and the garbage passes as "no number given". A value
          carrying anything but digits and the punctuation people write numbers
          with is a typo or a note, and has to reach the rule intact so the
          rule can reject it.
        */
        if (preg_match('/[^\d\s()+.-]/', $trimmed) === 1) {
            return $trimmed;
        }

        $digits = preg_replace('/\D/', '', $trimmed) ?? '';

        // Punctuation and nothing else — same reasoning as above.
        if ($digits === '') {
            return $trimmed;
        }

        // +639XXXXXXXXX / 639XXXXXXXXX — country code, with or without the plus.
        if (strlen($digits) >= 12 && str_starts_with($digits, '639')) {
            return '0'.substr($digits, 2, 10);
        }

        // 9XXXXXXXXX — how the number is printed once the trunk 0 is dropped.
        if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            return '0'.$digits;
        }

        // Anything else is handed to the rule as-is; a number that is simply
        // wrong must fail validation, not be silently truncated into a
        // different valid number.
        return $digits;
    }
}
