<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Revoking every other session is a destructive, irreversible action taken
 * from a page that a walk-up attacker on an unlocked machine can already
 * reach — so it re-asks for the password, exactly as account deletion does.
 */
class LogoutOtherSessionsRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => $this->currentPasswordRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.current_password' => 'That is not your current password.',
        ];
    }
}
