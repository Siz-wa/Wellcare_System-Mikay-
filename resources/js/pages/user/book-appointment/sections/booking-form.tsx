// resources/js/pages/user/book-appointment/sections/booking-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The wizard shell. Three steps now, not four: who the appointment is for is
// settled at the gate before this component renders, so the form only asks
// what actually changes from visit to visit.

import { useForm } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useStepValidators } from '@/hooks/use-step-validators';
import { useInView } from '@/hooks/useInView';
import { BOOKING_FORM_DEFAULTS } from '@/pages/user/book-appointment/sections/bookingdata';
import type {
    BookingWindow,
    DoctorOption,
    PatientOption,
    StepId,
} from '@/pages/user/book-appointment/sections/bookingdata';
import { store } from '@/routes/appointments';
import { PatientSummaryCard, StepIndicator } from '../components';
import StepAppointment from './step-appointment';
import StepCoverage from './step-coverage';
import StepReview from './step-review';
// Wayfinder generates route files keyed by the first segment of the route name.
// Route `appointments.store` → file @/routes/appointments, named export `store`.
// Run `php artisan wayfinder:generate` after adding the routes.

// ── Props ─────────────────────────────────────────────────────────────────────

interface BookingFormProps {
    /** Active doctors from doctor_profiles, passed via Inertia page prop */
    doctors: DoctorOption[];
    /** The person this appointment is for, chosen at the gate */
    patient: PatientOption;
    /** Bookable date range, computed server-side */
    bookingWindow: BookingWindow;
    /** Reopens the gate */
    onChangePatient: () => void;
}

export default function BookingForm({
    doctors,
    patient,
    bookingWindow,
    onChangePatient,
}: BookingFormProps): ReactElement {
    const { ref, inView } = useInView();

    // Ordinary component state. The previous module-level store was cached by
    // React Compiler (no reactive dependencies) so clicking Continue changed
    // the step without repainting, and it outlived the page so returning to
    // /book resumed mid-wizard. See book-appointment.tsx for the full note.
    const [step, setStep] = useState<StepId>(1);
    const [completed, setCompleted] = useState<Set<StepId>>(() => new Set());

    // Coverage is seeded from the patient's record, so a repeat HMO visit is
    // not retyped — but it stays editable, because the same person may pay cash
    // one visit and use their HMO the next.
    //
    // A minor is the exception: they are billed to their guarantor, so the visit
    // is cash and the Coverage step does not ask. Seeding it here rather than in
    // the step keeps the submitted value and the rendered one in agreement.
    const {
        data,
        setData,
        post,
        processing,
        errors: serverErrors,
    } = useForm({
        ...BOOKING_FORM_DEFAULTS,
        patientId: patient.id,
        coverage: patient.isMinor ? 'cash' : (patient.defaultCoverage ?? ''),
        hmo: patient.isMinor ? '' : (patient.hmoProvider ?? ''),
        hmoId: patient.isMinor ? '' : (patient.hmoId ?? ''),
    });

    const [attempted1, setAttempted1] = useState(false);
    const [attempted2, setAttempted2] = useState(false);

    const { step1Valid, step2Valid, errors1, errors2 } = useStepValidators(
        data,
        bookingWindow,
    );

    // ── Navigation handlers ────────────────────────────────────────────────────

    const goTo = (target: StepId) => setStep(target);

    const markDone = (s: StepId) =>
        setCompleted((prev) => new Set([...prev, s]));

    const handleNext1 = () => {
        setAttempted1(true);

        if (!step1Valid) {
            return;
        }

        markDone(1);
        goTo(2);
    };

    const handleNext2 = () => {
        setAttempted2(true);

        if (!step2Valid) {
            return;
        }

        markDone(2);
        goTo(3);
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(store().url);
    };

    const cardStyle: React.CSSProperties = {
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition:
            'opacity var(--duration-slower) var(--ease-out), transform var(--duration-slower) var(--ease-out)',
        transitionDelay: '80ms',
    };

    return (
        <section
            className="wc-section"
            style={{
                background: 'var(--wc-gray-50)',
                paddingTop: 'var(--space-4)',
            }}
        >
            <div className="wc-container" style={{ maxWidth: 860 }}>
                <PatientSummaryCard
                    patient={patient}
                    onChange={onChangePatient}
                />

                <StepIndicator current={step} completed={completed} />

                <div
                    ref={ref}
                    className="wc-card wc-card-elevated"
                    style={cardStyle}
                >
                    <div
                        className="wc-card-body"
                        style={{ padding: 'var(--space-8)' }}
                    >
                        {step === 1 && (
                            <StepAppointment
                                data={data}
                                errors={attempted1 ? errors1 : {}}
                                setData={setData}
                                patient={patient}
                                bookingWindow={bookingWindow}
                                valid={step1Valid}
                                onNext={handleNext1}
                            />
                        )}

                        {step === 2 && (
                            <StepCoverage
                                data={data}
                                errors={attempted2 ? errors2 : {}}
                                setData={setData}
                                patient={patient}
                                valid={step2Valid}
                                onNext={handleNext2}
                                onBack={() => goTo(1)}
                                doctors={doctors}
                            />
                        )}

                        {step === 3 && (
                            <form onSubmit={handleSubmit} noValidate>
                                <StepReview
                                    data={data}
                                    errors={serverErrors}
                                    setData={setData}
                                    patient={patient}
                                    isProcessing={processing}
                                    onBack={() => goTo(2)}
                                    onGoToStep={(s: StepId) => goTo(s)}
                                    onChangePatient={onChangePatient}
                                    doctors={doctors}
                                />
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
