<?php

namespace App\Http\Responses\Auth;

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        // Role → landing route lives in one place, shared with /dashboard.
        return redirect()->route(
            DashboardController::routeForUser(Auth::user())
        );
    }
}
