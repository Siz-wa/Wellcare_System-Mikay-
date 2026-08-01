<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Figure 3's "Manage Patient" use case.
 *
 * Scope is deliberately **demographic and administrative only** — name,
 * contact details, address, coverage defaults, guarantor. Allergies,
 * diagnoses, lab results and consultation notes are NOT reachable from here:
 * they belong to Doctor\PatientRecordController, behind `role:doctor`. An
 * administrator is a records clerk in this system, not a clinician, and the
 * paper's own role split (Fig. 8 admin vs Fig. 9 doctor) draws the same line.
 */
class AdminPatientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $coverage = $request->string('coverage')->toString();

        $patients = Patient::query()
            ->with('guarantor.profile')
            ->withCount('appointments')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"])
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('clinic_id', 'like', "%{$search}%");
            }))
            ->when(
                in_array($coverage, ['cash', 'hmo', 'philhealth', 'corporate'], true),
                fn ($q) => $q->where('default_coverage', $coverage),
            )
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(200)
            ->get();

        return Inertia::render('admin/patients/patients', [
            'patients' => $patients->map(fn (Patient $p) => $this->mapPatient($p))->values(),
            'filters' => [
                'search' => $search,
                'coverage' => $coverage,
            ],
            'stats' => [
                'total' => Patient::count(),
                'withGuarantor' => Patient::whereNotNull('guarantor_id')->count(),
                'hmo' => Patient::where('default_coverage', 'hmo')->count(),
                'archived' => Patient::onlyTrashed()->count(),
            ],
        ]);
    }

    public function update(Request $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'contact_number' => ['required', 'string', 'regex:/^(\+639|09)\d{9}$/'],
            'age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'address' => ['nullable', 'string', 'max:500'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed'])],
            'company' => ['nullable', 'string', 'max:255'],
            'default_coverage' => ['nullable', Rule::in(['cash', 'hmo', 'philhealth', 'corporate'])],
            // hmo_provider is editable (it is already visible to HR and nurses
            // on the LOA screens); `hmo_id` deliberately is not. The member ID
            // is captured at booking and never rendered or accepted here — see
            // mapPatient() and the Patient model's activityLogAttributes().
            'hmo_provider' => ['nullable', 'required_if:default_coverage,hmo', 'string', 'max:100'],
        ], [
            'contact_number.regex' => 'Please enter a valid PH number (e.g. +639XXXXXXXXX or 09XXXXXXXXX).',
            'hmo_provider.required_if' => 'Please name the HMO provider.',
        ]);

        $patient->update($validated);

        return back()->with(
            'success',
            trim($patient->first_name.' '.$patient->last_name).'\'s details were updated.'
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPatient(Patient $patient): array
    {
        return [
            'id' => $patient->id,
            'name' => trim($patient->first_name.' '.$patient->last_name),
            'firstName' => $patient->first_name,
            'lastName' => $patient->last_name,
            'initials' => strtoupper(
                substr($patient->first_name, 0, 1).substr($patient->last_name, 0, 1)
            ),
            'clinicId' => $patient->clinic_id,
            'email' => $patient->email,
            'contactNumber' => $patient->contact_number,
            'age' => $patient->age,
            'gender' => $patient->gender,
            'birthdate' => $patient->birthdate?->format('Y-m-d'),
            'address' => $patient->address,
            'civilStatus' => $patient->civil_status,
            'company' => $patient->company,
            'coverage' => $patient->default_coverage,
            'hmoProvider' => $patient->hmo_provider,
            // hmo_id is deliberately NOT sent to the list view — see the
            // Patient model's activityLogAttributes() for the same reasoning.
            // It is insurance identity, and the admin list has no use for it.
            'guarantor' => $patient->guarantor?->name ?: $patient->guarantor?->email,
            'appointmentCount' => $patient->appointments_count,
        ];
    }
}
