// resources/js/pages/generals/book-appointment/sections/step-review.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   - Receives `doctors: DoctorOption[]` prop to resolve the display name
//     from `data.doctorId` (number | null) instead of reading a string.
//   - ReviewRow for preferred doctor now looks up the name by id.

import type { ReactElement } from 'react';
import { formatIsoDate } from '@/lib/local-date';
import type {
    BookingFormData,
    StepId,
    DoctorOption,
    PatientOption,
    ServiceDefinition,
} from '@/pages/user/book-appointment/sections/bookingdata';
import {
    genderOptions,
    serviceOptions,
    consultationTypeOptions,
    coverageOptions,
    hmoOptions,
    REVIEW_LABELS,
    bookingMeta,
    STEP_HEADINGS,
} from '@/pages/user/book-appointment/sections/bookingdata';
import {
    ReviewRow,
    ReviewGroup,
    Field,
    StepNav,
    IconLock,
    IconMail,
} from '../components';

// ── Helper ────────────────────────────────────────────────────────────────────

function resolveLabel(
    value: string,
    options: { value: string; label: string }[],
): string {
    return options.find((o) => o.value === value)?.label ?? value;
}

function resolveDoctorName(id: number | null, doctors: DoctorOption[]): string {
    if (id === null) {
        return 'Next available';
    }

    return doctors.find((d) => d.id === id)?.name ?? 'Unknown';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StepReviewProps {
    data: BookingFormData;
    errors: Partial<Record<keyof BookingFormData, string>>;
    setData: <K extends keyof BookingFormData>(
        field: K,
        value: BookingFormData[K],
    ) => void;
    /** The person this appointment is for, chosen at the gate */
    patient: PatientOption;
    isProcessing: boolean;
    onBack: () => void;
    onGoToStep: (s: StepId) => void;
    /** Reopens the gate — the "Edit" affordance for the patient card */
    onChangePatient: () => void;
    /** Passed from the Inertia page prop to resolve display name from doctorId */
    doctors: DoctorOption[];
    /** The bookable catalogue, for resolving the service's display name. */
    services: ServiceDefinition[];
}

export default function StepReview({
    data,
    errors,
    setData,
    patient,
    isProcessing,
    onBack,
    onGoToStep,
    onChangePatient,
    doctors,
    services,
}: StepReviewProps): ReactElement {
    const { title, subtitle } = STEP_HEADINGS[3];
    const { disclaimer, dataPrivacy } = bookingMeta;

    // `additionalInfo` is excluded because it renders inline on its own field
    // below; everything else has no home on this screen and would otherwise be
    // invisible.
    const messages = Object.entries(errors)
        .filter(([field, message]) => field !== 'additionalInfo' && !!message)
        .map(([, message]) => message as string);

    // One column on a phone, two from `sm`. A hard `1fr 1fr` put two label +
    // value pairs into 358px, so a value like a full name or an HMO card
    // number wrapped over three lines against a half-empty neighbour.
    //
    // Row gap only matters once the pairs stack, hence `gap-y-3 sm:gap-y-0`.
    const twoColGrid =
        'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 sm:gap-y-0';

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                {/* Every rejection the server can return, not just the one the
                    slot check produces. A validation error on a Step 1 or
                    Step 2 field — an ineligible service, a minor filed under an
                    HMO, missing telemedicine consent — arrives while the
                    patient is standing on Step 3, and used to be dropped on the
                    floor: the page simply did not move, with nothing said. */}
                {messages.length > 0 && (
                    <div
                        style={{
                            marginBottom: 'var(--space-6)',
                            padding: 'var(--space-4) var(--space-5)',
                            borderRadius: 'var(--radius-lg)',
                            background: '#fee2e2',
                            border: '1px solid var(--wc-error)',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--wc-text-error)',
                            fontWeight: 600,
                        }}
                        role="alert"
                    >
                        {messages.length === 1 ? (
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                }}
                            >
                                ⚠ {messages[0]}
                            </span>
                        ) : (
                            <>
                                <span
                                    style={{
                                        display: 'block',
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    ⚠ This booking could not be submitted:
                                </span>
                                <ul
                                    style={{
                                        margin: 0,
                                        paddingLeft: 'var(--space-6)',
                                        fontWeight: 500,
                                    }}
                                >
                                    {messages.map((m) => (
                                        <li key={m}>{m}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
                <span
                    className="wc-label"
                    style={{
                        color: 'var(--wc-link)',
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    Step 3 of 3
                </span>
                <h2 style={{ marginBottom: 'var(--space-1)' }}>{title}</h2>
                <p style={{ margin: 0 }}>{subtitle}</p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* ── Patient ──
                    Read from the record, not from form inputs — these details
                    were typed once when the patient was added. "Edit" reopens
                    the gate rather than a step. */}
                <ReviewGroup
                    iconKey="personal"
                    title="Patient"
                    onEdit={onChangePatient}
                >
                    <div className={twoColGrid}>
                        <ReviewRow
                            label={REVIEW_LABELS.fullName}
                            value={patient.name}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.ageGender}
                            value={`${patient.age ?? '—'} yrs · ${resolveLabel(patient.gender ?? '', genderOptions)}`}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.relationship}
                            value={patient.relationshipLabel ?? '—'}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.contactNumber}
                            value={patient.contactNumber}
                        />
                    </div>
                </ReviewGroup>

                {/* ── Appointment ── */}
                <ReviewGroup
                    iconKey="appointment"
                    title="Appointment"
                    onEdit={() => onGoToStep(1)}
                >
                    <div className={twoColGrid}>
                        <ReviewRow
                            label={REVIEW_LABELS.service}
                            value={resolveLabel(
                                data.service,
                                serviceOptions(services),
                            )}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.consultationType}
                            value={resolveLabel(
                                data.consultationType,
                                consultationTypeOptions,
                            )}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.appointmentDate}
                            value={formatIsoDate(data.appointmentDate)}
                        />
                        <ReviewRow
                            label={REVIEW_LABELS.appointmentTime}
                            value={data.appointmentTime}
                        />
                    </div>
                </ReviewGroup>

                {/* ── Coverage & Doctor — full width ── */}
                <ReviewGroup
                    iconKey="coverage"
                    title="Coverage & Doctor"
                    onEdit={() => onGoToStep(2)}
                    fullWidth
                >
                    <div className={twoColGrid}>
                        <ReviewRow
                            label={REVIEW_LABELS.coverage}
                            value={resolveLabel(data.coverage, coverageOptions)}
                        />
                        {/* Only under HMO coverage. The wizard pre-fills these
                            from the patient's last visit, so a self-paid
                            booking by someone who used Maxicare in September
                            still carries the card in form state — and this
                            summary used to print "MODE OF COVERAGE Self-Pay"
                            directly above "HMO PROVIDER Maxicare". The request
                            now clears the pair server-side too, so the stored
                            row cannot disagree with itself either. */}
                        {data.coverage === 'hmo' && data.hmo && (
                            <ReviewRow
                                label={REVIEW_LABELS.hmo}
                                value={resolveLabel(data.hmo, hmoOptions)}
                            />
                        )}
                        {data.coverage === 'hmo' && data.hmoId && (
                            <ReviewRow
                                label={REVIEW_LABELS.hmoId}
                                value={data.hmoId}
                            />
                        )}
                        {/* Always show preferred doctor row; displays "Next available" if null */}
                        <ReviewRow
                            label={REVIEW_LABELS.preferredDoctor}
                            value={resolveDoctorName(data.doctorId, doctors)}
                        />
                    </div>
                </ReviewGroup>
            </div>

            {/* ── Additional info ── */}
            <Field
                label="Additional Information"
                hint="Optional — include anything else you'd like us to know about your visit."
                error={errors.additionalInfo}
            >
                <textarea
                    className="wc-input wc-textarea"
                    rows={4}
                    placeholder="e.g. I have a known allergy to penicillin, or I need wheelchair access…"
                    value={data.additionalInfo}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setData('additionalInfo', e.target.value)
                    }
                />
            </Field>

            {/* ── Disclaimer ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginTop: 'var(--space-5)',
                    marginBottom: 'var(--space-2)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--wc-blue-50)',
                    border: '1px solid var(--wc-blue-100)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-blue-700)',
                }}
            >
                <span style={{ color: 'var(--wc-blue-600)', flexShrink: 0 }}>
                    <IconMail />
                </span>
                {disclaimer}
            </div>

            <StepNav
                onBack={onBack}
                nextLabel="Submit Appointment Request"
                isSubmit
                isProcessing={isProcessing}
            />

            <p
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-1)',
                    marginTop: 'var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--wc-text-muted)',
                }}
            >
                <IconLock /> {dataPrivacy}
            </p>
        </div>
    );
}
