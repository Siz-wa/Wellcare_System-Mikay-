<?php

namespace App\Policies;

use App\Models\Service;
use App\Models\User;

/**
 * Who may administer the bookable catalogue.
 *
 * The route group already carries `permission:services.manage`, so this looks
 * redundant and is not. The middleware says which door the request came
 * through; the policy is where "who may do this" is actually written down, and
 * the reasoning AdminPatientController gives for the same duplication applies
 * unchanged: a capability that is only enforced by a route definition is a
 * capability that stops being enforced the moment someone adds a second route.
 *
 * Note who is absent. The OWNER is in the `role:admin|owner` group and does not
 * hold `services.manage`, so these actions 403 for them — the same §5.1 line
 * that keeps the appointing tier out of the patient record keeps it out of
 * clinic operations.
 */
class ServicePolicy
{
    /**
     * Reading and writing the catalogue are one capability on purpose.
     *
     * There is no useful "may look at the service list but not change it"
     * role: the list is already public — every patient reads it in the booking
     * wizard and on the services page — so a view-only permission would guard
     * nothing.
     */
    public function manage(User $user): bool
    {
        return $user->can('services.manage');
    }

    public function viewAny(User $user): bool
    {
        return $this->manage($user);
    }

    public function view(User $user, Service $service): bool
    {
        return $this->manage($user);
    }

    public function create(User $user): bool
    {
        return $this->manage($user);
    }

    public function update(User $user, Service $service): bool
    {
        return $this->manage($user);
    }

    /**
     * Never. A service is retired by deactivating it, not deleted — see the
     * note on AdminServiceController.
     */
    public function delete(User $user, Service $service): bool
    {
        return false;
    }
}
