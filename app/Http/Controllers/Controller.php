<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    /**
     * SC-2 in WELLCARE-COMPLIANCE-PLAN.md.
     *
     * Laravel 11 removed this from the generated base controller, and this
     * application never put it back — which is part of why authorization here
     * grew as `role:` route middleware plus hand-rolled private `authorize*()`
     * helpers scattered across four controllers, with several record endpoints
     * carrying no check at all. `$this->authorize()` had no meaning to reach
     * for, so nobody reached for it.
     *
     * The rules themselves live in app/Policies and are asserted as a matrix by
     * tests/Feature/Compliance/RecordAccessPolicyTest.php.
     */
    use AuthorizesRequests;
}
