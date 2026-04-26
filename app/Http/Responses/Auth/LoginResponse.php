<?php

namespace App\Http\Responses\Auth;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Illuminate\Support\Facades\Auth;


class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        /** @var \App\Models\User $user */ // 
        $user = Auth::user();

        if( $user->hasRole('doctor') ) {
            return redirect()->route('doctor.appointments');
        }
        if( $user->hasRole('hr') ) {
            return redirect()->route('hr.dashboard');
        }
        return redirect()->route('user.dashboard');
    }
}


?>