<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\SavePatientRequest;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The guarantor's own roster of patients — "My Patients".
 *
 * An account is a guarantor account: a mother books for herself and for her
 * child from one login. This controller is where those people are created and
 * maintained, so their details are typed once instead of on every booking.
 *
 * DELIBERATE NARROWING of the rule stated in PatientRecordController: that
 * controller is read-only because "every write path belongs to the clinical
 * staff." That still holds for anything clinical. What a guarantor may write is
 * strictly **demographics, contact details, relationship and coverage** — the
 * same surface AdminPatientController exposes to a records clerk. Allergies,
 * diagnoses, documents and lab results remain unreachable from here.
 *
 * SCOPING RULE, identical to PatientRecordController: a record is reachable only
 * through `patients.guarantor_id === Auth::id()`. Route-model binding resolves
 * any {patient} in the URL, so without authorizePatient() a signed-in user could
 * edit anyone's record by changing the id.
 */
class GuarantorPatientController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();

        // Idempotent. Gives a brand-new account its "Myself" row so the booking
        // gate and this page are never empty for someone with a filled profile.
        Patient::ensureSelfPatient($user);

        $patients = Patient::where('guarantor_id', $user->id)
            ->withCount(['appointments', 'documents'])
            ->orderByRaw("relationship_to_guarantor = 'self' DESC")
            ->orderBy('first_name')
            ->get();

        return Inertia::render('user/patients/patients', [
            'patients' => $patients->map(fn (Patient $p) => self::mapPatient($p))->values(),
        ]);
    }

    public function store(SavePatientRequest $request): RedirectResponse
    {
        $patient = Patient::create([
            ...$request->validated(),
            'guarantor_id' => Auth::id(),
        ]);

        // Added from the booking gate: adding someone there *is* the act of
        // booking for them, so carry straight into the wizard rather than
        // returning to the gate for one more click. `bookAfterSave` is not a
        // patient attribute and never reaches validated(), so it cannot be
        // written to the record.
        if ($request->boolean('bookAfterSave')) {
            return redirect()->route('book', ['patient' => $patient->id]);
        }

        return back()->with('success', $patient->full_name.' was added to your patients.');
    }

    public function update(SavePatientRequest $request, Patient $patient): RedirectResponse
    {
        $this->authorizePatient($patient);

        $patient->update($request->validated());

        // Same carry-through as store(): the gate sends an incomplete record
        // here to have its age and sex filled in, and the point of that detour
        // is to get back to booking.
        if ($request->boolean('bookAfterSave')) {
            return redirect()->route('book', ['patient' => $patient->id]);
        }

        return back()->with('success', $patient->full_name."'s details were updated.");
    }

    /**
     * Archive, not erase — the medical record and its appointment history stay
     * intact behind the soft delete.
     *
     * Blocked while the patient still has an appointment that has not reached a
     * terminal state. Archiving then would leave the clinic holding a booking
     * for someone who has vanished from the guarantor's list, and the doctor
     * would find out at the appointment time.
     */
    public function destroy(Patient $patient): RedirectResponse
    {
        $this->authorizePatient($patient);

        // The account holder's own record cannot be archived. Soft-deleting it
        // would only hide it: ensureSelfPatient() runs on the next visit to
        // /book, finds nothing (the global scope skips trashed rows), and either
        // adopts another record or creates a fresh one — so "archived" would
        // silently come back, possibly as a different chart.
        if ($patient->relationship_to_guarantor === 'self') {
            return back()->withErrors([
                'patient' => 'This is your own record and cannot be archived. Edit it instead.',
            ]);
        }

        $hasOpenAppointment = $patient->appointments()
            ->whereNotIn('status', ['completed', 'cancelled', 'no_show'])
            ->exists();

        if ($hasOpenAppointment) {
            return back()->withErrors([
                'patient' => $patient->full_name.' still has an upcoming appointment. Cancel it first, then archive.',
            ]);
        }

        $name = $patient->full_name;
        $patient->delete();

        return back()->with('success', $name.' was archived.');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function authorizePatient(Patient $patient): void
    {
        abort_if($patient->guarantor_id !== Auth::id(), 403);
    }

    /**
     * The shape the booking gate and the My Patients page both consume.
     *
     * `hmoId` is included, unlike the admin list: the guarantor is the person
     * who holds the member number, and the Coverage step prefills from it.
     *
     * @return array<string, mixed>
     */
    public static function mapPatient(Patient $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->full_name,
            'firstName' => $p->first_name,
            'lastName' => $p->last_name,
            'initials' => $p->initials,
            'clinicId' => $p->clinic_id,
            'email' => $p->email,
            'contactNumber' => $p->contact_number,
            // Derived from birthdate where there is one, so a record typed years
            // ago does not keep reporting the age it was typed at.
            'age' => $p->current_age,
            'gender' => $p->gender,
            'birthdate' => $p->birthdate?->format('Y-m-d'),
            'address' => $p->address,
            'civilStatus' => $p->civil_status,
            'company' => $p->company,
            'relationship' => $p->relationship_to_guarantor,
            'relationshipNote' => $p->relationship_note,
            'relationshipLabel' => $p->relationship_label,
            // Billed to their guarantor, so the Coverage step does not ask them
            // to choose one — see BookAppointmentRequest::after().
            'isMinor' => $p->isMinor(),
            // Legacy and staff-created records may have neither age nor sex,
            // both of which appointments require. The gate offers "complete
            // their details" instead of a selection that would only fail at
            // submit — see BookAppointmentRequest::after().
            'needsDetails' => $p->current_age === null || $p->gender === null,
            'defaultCoverage' => $p->default_coverage,
            'hmoProvider' => $p->hmo_provider,
            'hmoId' => $p->hmo_id,
            'appointmentCount' => $p->appointments_count ?? 0,
            'documentCount' => $p->documents_count ?? 0,
        ];
    }

    // The "Myself" quick-add and its prefill are gone: registration collects the
    // name, contact number and birthdate, so ensureSelfPatient() promotes the
    // account holder's own record on its own and the gate has no reason to offer
    // adding one. An account whose profile is too thin for that still adds
    // themselves through the ordinary form by picking "Myself".
}
