// resources/js/pages/user/book-appointment/sections/patient-form-sheet.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The sliding panel that captures a patient's details — once.
//
// Shared by the booking gate and the My Patients page, so "add a child" means
// the same thing and validates the same way from either entry point. The rules
// come from validatePatientDetails(), which mirrors SavePatientRequest.

import { useForm } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { validatePatientDetails } from '@/hooks/use-step-validators';
import type { PatientDetailsErrors } from '@/hooks/use-step-validators';
import {
    ageFromBirthdate,
    civilStatusOptions,
    coverageOptions,
    genderOptions,
    hmoOptions,
    MINOR_MAX_AGE,
    patientSheetCopy,
    PATIENT_FORM_DEFAULTS,
    relationshipOptions,
} from '@/pages/user/book-appointment/sections/bookingdata';
import type {
    PatientFormData,
    PatientOption,
} from '@/pages/user/book-appointment/sections/bookingdata';
import { store, update } from '@/routes/user/patients';
import { BrandSelect, Field } from '../components';
import { sanitizeHmoId } from '../utils/sanitizers';

interface PatientFormSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Editing an existing record; omit to add a new one. */
    patient?: PatientOption | null;
    /**
     * Booking gate only: continue straight into the wizard for the person just
     * added, instead of returning to the gate for another click.
     */
    bookAfterSave?: boolean;
}

function toFormData(patient: PatientOption): PatientFormData {
    return {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        contactNumber: patient.contactNumber,
        gender: patient.gender ?? '',
        relationship: patient.relationship ?? '',
        relationshipNote: patient.relationshipNote ?? '',
        birthdate: patient.birthdate ?? '',
        address: patient.address ?? '',
        civilStatus: patient.civilStatus ?? '',
        company: patient.company ?? '',
        defaultCoverage: patient.defaultCoverage ?? '',
        hmoProvider: patient.hmoProvider ?? '',
        hmoId: patient.hmoId ?? '',
    };
}

export default function PatientFormSheet({
    open,
    onOpenChange,
    patient = null,
    bookAfterSave = false,
}: PatientFormSheetProps): ReactElement {
    const isEditing = patient !== null;
    const panelRef = useRef<HTMLDivElement>(null);

    const initial: PatientFormData = patient
        ? toFormData(patient)
        : { ...PATIENT_FORM_DEFAULTS };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {/* Width is set here rather than with Tailwind's max-w-* utilities:
                tokens.css redefines --container-lg to 1024px for the project's
                own page containers, so `sm:max-w-lg` would mean 1024px, not the
                512px it reads as. The panel scrolls in its body, not as a whole,
                so the title stays put when a field takes focus. */}
            <SheetContent
                ref={panelRef}
                side="right"
                className="overflow-hidden"
                style={{ width: 'min(34rem, 100vw)', maxWidth: '100vw' }}
                // Radix focuses the first field on open, and the browser scrolls
                // it into view — which pushed the title off the top of the panel
                // (overflow:hidden still scrolls programmatically). Focus the
                // panel itself instead: the focus trap is kept, the header is not
                // scrolled away, and a screen reader still announces the title.
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    panelRef.current?.focus();
                }}
            >
                <SheetHeader style={{ flexShrink: 0 }}>
                    <SheetTitle>
                        {isEditing
                            ? patientSheetCopy.editTitle
                            : patientSheetCopy.addTitle}
                    </SheetTitle>
                    <SheetDescription>
                        {isEditing
                            ? patientSheetCopy.editSubtitle
                            : patientSheetCopy.addSubtitle}
                    </SheetDescription>
                </SheetHeader>

                {/* Keyed so switching which patient is being edited remounts the
                    form. The seed values are then just useForm's initial state —
                    no effect reaching in to overwrite fields after the fact,
                    which is what previously risked clobbering typing in flight. */}
                <PatientForm
                    key={patient?.id ?? 'new'}
                    initial={initial}
                    patientId={patient?.id ?? null}
                    bookAfterSave={bookAfterSave}
                    onDone={() => onOpenChange(false)}
                />
            </SheetContent>
        </Sheet>
    );
}

// ── The form body ─────────────────────────────────────────────────────────────

interface PatientFormProps {
    initial: PatientFormData;
    patientId: number | null;
    bookAfterSave: boolean;
    onDone: () => void;
}

function PatientForm({
    initial,
    patientId,
    bookAfterSave,
    onDone,
}: PatientFormProps): ReactElement {
    const isEditing = patientId !== null;

    const { data, setData, post, patch, processing, errors, transform } =
        useForm<PatientFormData>(initial);

    // Not a patient attribute, so it never reaches SavePatientRequest::validated()
    // — the controller reads it off the raw request to decide where to redirect.
    transform((d) => ({ ...d, bookAfterSave }));

    const [attempted, setAttempted] = useState(false);

    const clientErrors: PatientDetailsErrors = validatePatientDetails(data);
    const shown = attempted ? clientErrors : {};
    const isValid = Object.keys(clientErrors).length === 0;

    // Age follows the birthdate rather than being asked for: it is arithmetic,
    // and a stored number goes stale the day after it is typed.
    const derivedAge = ageFromBirthdate(data.birthdate);
    const isMinor = derivedAge !== null && derivedAge <= MINOR_MAX_AGE;

    /** The account holder's own record — editable, but not re-labelable. */
    const isSelf = data.relationship === 'self';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setAttempted(true);

        if (!isValid) {
            return;
        }

        if (isEditing) {
            patch(update(patientId).url, {
                onSuccess: onDone,
                preserveScroll: true,
            });
        } else {
            post(store().url, { onSuccess: onDone, preserveScroll: true });
        }
    };

    const col: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
    };

    // Server messages come back keyed snake_case (SavePatientRequest maps
    // camelCase in, but validation reports the snake_case attribute), so both
    // spellings are checked before falling back to the client-side message.
    const serverError = (snake: string, camel: keyof PatientFormData) =>
        (errors as Record<string, string | undefined>)[snake] ??
        (errors as Record<string, string | undefined>)[camel as string];

    return (
        <>
            <form
                onSubmit={handleSubmit}
                noValidate
                style={{
                    padding: '0 var(--space-5) var(--space-6)',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                <div style={col}>
                    {/* Your own record shows its relationship, it does not offer
                        to change it. "Myself" is not in the options — it is set
                        when the account is created — so a dropdown here would
                        render blank and quietly demote you to a "spouse". */}
                    {isSelf ? (
                        <Field label="Relationship to you">
                            <input
                                className="wc-input"
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value="Myself"
                                style={{
                                    background: 'var(--wc-gray-100)',
                                    color: 'var(--wc-gray-600)',
                                    cursor: 'default',
                                }}
                            />
                        </Field>
                    ) : (
                        <Field
                            label="Relationship to you"
                            required
                            error={
                                serverError(
                                    'relationship_to_guarantor',
                                    'relationship',
                                ) ?? shown.relationship
                            }
                        >
                            <BrandSelect
                                value={data.relationship}
                                onChange={(v) => setData('relationship', v)}
                                options={relationshipOptions}
                                aria-label="Relationship to you"
                            />
                        </Field>
                    )}

                    {/* "Other" on its own tells the clinic nothing, so ask. */}
                    {data.relationship === 'other' && (
                        <Field
                            label="How are they related to you?"
                            required
                            error={
                                serverError(
                                    'relationship_note',
                                    'relationshipNote',
                                ) ?? shown.relationshipNote
                            }
                            hint="For example: grandchild, ward, parent-in-law."
                        >
                            <input
                                className="wc-input"
                                type="text"
                                maxLength={60}
                                value={data.relationshipNote}
                                onChange={(e) =>
                                    setData('relationshipNote', e.target.value)
                                }
                            />
                        </Field>
                    )}

                    <Field
                        label="First Name"
                        required
                        error={
                            serverError('first_name', 'firstName') ??
                            shown.firstName
                        }
                    >
                        <input
                            className="wc-input"
                            type="text"
                            maxLength={50}
                            value={data.firstName}
                            onChange={(e) =>
                                setData(
                                    'firstName',
                                    e.target.value
                                        .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '')
                                        .slice(0, 50),
                                )
                            }
                        />
                    </Field>

                    <Field
                        label="Last Name"
                        required
                        error={
                            serverError('last_name', 'lastName') ??
                            shown.lastName
                        }
                    >
                        <input
                            className="wc-input"
                            type="text"
                            maxLength={50}
                            value={data.lastName}
                            onChange={(e) =>
                                setData(
                                    'lastName',
                                    e.target.value
                                        .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '')
                                        .slice(0, 50),
                                )
                            }
                        />
                    </Field>

                    <Field
                        label="Email Address"
                        required
                        error={errors.email ?? shown.email}
                        hint="Where confirmations for this patient are sent. It may be your own."
                    >
                        <input
                            className="wc-input"
                            type="email"
                            maxLength={255}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </Field>

                    <Field
                        label="Contact Number"
                        required
                        error={
                            serverError('contact_number', 'contactNumber') ??
                            shown.contactNumber
                        }
                    >
                        <input
                            className="wc-input"
                            type="tel"
                            maxLength={13}
                            value={data.contactNumber}
                            onChange={(e) =>
                                setData('contactNumber', e.target.value)
                            }
                        />
                    </Field>

                    {/* Birthdate is asked for; age is read-only beside it and
                        follows from it. A typed age is only correct on the day
                        it is typed, and two editable fields that mean the same
                        thing eventually disagree. */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 7rem',
                            gap: 'var(--space-3)',
                            alignItems: 'start',
                        }}
                    >
                        <Field
                            label="Birthdate"
                            required
                            error={errors.birthdate ?? shown.birthdate}
                        >
                            <input
                                className="wc-input"
                                type="date"
                                max={new Date().toLocaleDateString('en-CA')}
                                value={data.birthdate}
                                onChange={(e) => {
                                    const birthdate = e.target.value;
                                    const age = ageFromBirthdate(birthdate);

                                    // Editing the birthdate can turn an adult
                                    // into a minor, which hides the coverage
                                    // chooser. Drop the value with it, or the
                                    // form would fail validation on a field
                                    // that is no longer on screen to fix.
                                    if (age !== null && age <= MINOR_MAX_AGE) {
                                        setData({
                                            ...data,
                                            birthdate,
                                            defaultCoverage: '',
                                            hmoProvider: '',
                                            hmoId: '',
                                        });

                                        return;
                                    }

                                    setData('birthdate', birthdate);
                                }}
                            />
                        </Field>

                        <Field label="Age">
                            <input
                                className="wc-input"
                                type="text"
                                readOnly
                                tabIndex={-1}
                                aria-label="Age, worked out from the birthdate"
                                value={derivedAge === null ? '—' : derivedAge}
                                style={{
                                    background: 'var(--wc-gray-100)',
                                    color: 'var(--wc-gray-600)',
                                    cursor: 'default',
                                    textAlign: 'center',
                                }}
                            />
                        </Field>
                    </div>

                    <Field
                        label="Biological Sex"
                        required
                        error={errors.gender ?? shown.gender}
                    >
                        <BrandSelect
                            value={data.gender}
                            onChange={(v) => setData('gender', v)}
                            options={genderOptions}
                            aria-label="Biological sex"
                        />
                    </Field>

                    <Field
                        label="Address"
                        error={errors.address}
                        hint="Optional."
                    >
                        <input
                            className="wc-input"
                            type="text"
                            maxLength={500}
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                        />
                    </Field>

                    <Field
                        label="Civil Status"
                        error={serverError('civil_status', 'civilStatus')}
                        hint="Optional."
                    >
                        <BrandSelect
                            value={data.civilStatus}
                            onChange={(v) => setData('civilStatus', v)}
                            options={civilStatusOptions}
                            aria-label="Civil status"
                        />
                    </Field>

                    {/* A minor cannot hold their own HMO or PhilHealth
                        membership — they are billed to their guarantor — so the
                        chooser is not shown for them at all rather than offered
                        and then rejected. */}
                    {isMinor ? (
                        <p
                            style={{
                                margin: 0,
                                padding: 'var(--space-3) var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--wc-blue-50)',
                                border: '1px solid var(--wc-blue-100)',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-blue-700)',
                            }}
                        >
                            {patientSheetCopy.minorCoverageNotice}
                        </p>
                    ) : (
                        <Field
                            label="Usual Coverage"
                            error={
                                serverError(
                                    'default_coverage',
                                    'defaultCoverage',
                                ) ?? shown.defaultCoverage
                            }
                            hint={patientSheetCopy.coverageHint}
                        >
                            <BrandSelect
                                value={data.defaultCoverage}
                                onChange={(v) => setData('defaultCoverage', v)}
                                options={[
                                    { value: '', label: 'Not set' },
                                    ...coverageOptions,
                                ]}
                                aria-label="Usual coverage"
                            />
                        </Field>
                    )}

                    {!isMinor && data.defaultCoverage === 'hmo' && (
                        <>
                            <Field
                                label="HMO Provider"
                                required
                                error={
                                    serverError(
                                        'hmo_provider',
                                        'hmoProvider',
                                    ) ?? shown.hmoProvider
                                }
                            >
                                <BrandSelect
                                    value={data.hmoProvider}
                                    onChange={(v) => setData('hmoProvider', v)}
                                    options={hmoOptions}
                                    aria-label="HMO provider"
                                />
                            </Field>

                            <Field
                                label="HMO ID Number"
                                required
                                error={
                                    serverError('hmo_id', 'hmoId') ??
                                    shown.hmoId
                                }
                            >
                                <input
                                    className="wc-input"
                                    type="text"
                                    maxLength={20}
                                    value={data.hmoId}
                                    onChange={(e) =>
                                        setData(
                                            'hmoId',
                                            sanitizeHmoId(e.target.value),
                                        )
                                    }
                                />
                            </Field>
                        </>
                    )}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-3)',
                        marginTop: 'var(--space-8)',
                        paddingTop: 'var(--space-5)',
                        borderTop: '1px solid var(--wc-gray-100)',
                    }}
                >
                    <button
                        type="button"
                        className="wc-btn wc-btn-ghost wc-btn-md wc-btn-pill"
                        onClick={onDone}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        aria-busy={processing}
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                    >
                        {processing
                            ? 'Saving…'
                            : isEditing
                              ? 'Save changes'
                              : 'Add patient'}
                    </button>
                </div>
            </form>
        </>
    );
}
