<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\AccountActionNotAllowedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Services\StaffAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Figure 4's "Add New User", "Manage User Acc", "Manage User/Roles" and
 * "Deactivate/Reactivate Acc" flows; Figure 3's "User Management" oval;
 * Objectives 1.1 and 1.3.
 *
 * All account mutation lives in StaffAccountService — the same
 * controller/service split BookingService, LabResultService and LoaService
 * use. The refusals that stop an admin locking themselves out are domain
 * rules, so they live in the service and surface here as a flash error.
 */
class AdminUserController extends Controller
{
    public function __construct(private StaffAccountService $accounts) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $role = $request->string('role')->toString();
        $status = $request->string('status')->toString();

        $users = User::query()
            // profile and roles are read for every row by mapUser(); without
            // eager loading this is a 2N query across the whole staff list.
            ->with(['profile', 'roles'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhereHas('profile', fn ($p) => $p
                            ->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                        );
                });
            })
            ->when(
                in_array($role, StoreUserRequest::ROLES, true),
                fn ($query) => $query->role($role),
            )
            ->when($status === 'active', fn ($query) => $query->active())
            ->when($status === 'inactive', fn ($query) => $query->inactive())
            ->orderBy('email')
            ->get();

        return Inertia::render('admin/users/users', [
            'users' => $users->map(fn (User $user) => $this->mapUser($user))->values(),
            'roles' => StoreUserRequest::ROLES,
            'stats' => [
                'total' => User::count(),
                'active' => User::active()->count(),
                'inactive' => User::inactive()->count(),
                'admins' => User::role('admin')->active()->count(),
            ],
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
            ],
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = $this->accounts->create($validated, $validated['role']);

        return back()->with(
            'success',
            "{$user->name} was added as a {$validated['role']} account."
        );
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $this->accounts->update($user, $request->validated());

        return back()->with('success', "{$user->fresh()->name}'s account was updated.");
    }

    /**
     * Figure 4's "Manage User/Roles". Separate from update() because a role
     * change is an authorization event, not a profile edit — it gets its own
     * route, its own confirmation in the UI and its own audit entry.
     */
    public function assignRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(StoreUserRequest::ROLES)],
        ]);

        try {
            $this->accounts->changeRole($user, $validated['role'], Auth::user());
        } catch (AccountActionNotAllowedException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "{$user->name} is now a {$validated['role']} account."
        );
    }

    public function deactivate(User $user): RedirectResponse
    {
        return $this->changeActiveState($user, false);
    }

    public function activate(User $user): RedirectResponse
    {
        return $this->changeActiveState($user, true);
    }

    private function changeActiveState(User $user, bool $active): RedirectResponse
    {
        try {
            $this->accounts->setActive($user, $active, Auth::user());
        } catch (AccountActionNotAllowedException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "{$user->name}'s account was ".($active ? 'reactivated.' : 'deactivated.')
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function mapUser(User $user): array
    {
        $profile = $user->profile;
        $name = trim(($profile?->first_name ?? '').' '.($profile?->last_name ?? ''));

        return [
            'id' => $user->id,
            // Accounts created before this module may have no profile row, so
            // the email is the fallback rather than rendering an empty cell.
            'name' => $name !== '' ? $name : $user->email,
            'initials' => $this->initialsFor($profile?->first_name, $profile?->last_name, $user->email),
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'none',
            'isActive' => (bool) $user->is_active,
            'contactNumber' => $profile?->contact_number,
            'address' => $profile?->address,
            'company' => $profile?->company,
            'gender' => $profile?->gender,
            'birthdate' => $profile?->birthdate?->format('Y-m-d'),
            'civilStatus' => $profile?->civil_status,
            'clientNumber' => $profile?->client_number,
            'verified' => $user->hasVerifiedEmail(),
            'createdAt' => $user->created_at?->format('d M Y'),
            // Drives the disabled state on the row's own deactivate button, so
            // the refusal is visible before it is attempted.
            'isSelf' => $user->id === Auth::id(),
        ];
    }

    private function initialsFor(?string $first, ?string $last, string $email): string
    {
        $initials = strtoupper(substr($first ?? '', 0, 1).substr($last ?? '', 0, 1));

        return $initials !== '' ? $initials : strtoupper(substr($email, 0, 2));
    }
}
