<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class NotificationPreferenceUpdateRequest extends FormRequest
{
    /**
     * The switch map arrives as `preferences[<channel>.<category>] = bool`.
     *
     * Keys are validated by shape only. Which keys are *meaningful* is decided
     * by NotificationPreferenceController::update(), which rebuilds the stored
     * array from NotificationPreference::CATEGORIES and ignores anything else —
     * so an invented key cannot end up persisted, and a `preferences` payload
     * cannot be used to grow the JSON column without bound.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.*' => ['boolean'],
        ];
    }
}
