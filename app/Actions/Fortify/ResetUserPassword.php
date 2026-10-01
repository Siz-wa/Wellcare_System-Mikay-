<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $user->forceFill([
            'password' => $input['password'],
            // GV-9. The other exit from EnsurePasswordIsChanged, and the one
            // that matters for GV-1's recovery flow: an administrator triggers
            // a reset link, the account holder follows it and chooses a
            // password nobody else has seen. Without clearing the flag here,
            // completing that reset would still leave the account pinned to the
            // password screen — which is precisely where it should NOT be, since
            // the credential is now already its owner's alone.
            'must_change_password' => false,
        ])->save();
    }
}
