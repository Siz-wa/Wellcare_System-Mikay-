// resources/js/pages/auth/register/sections/register-form-panel.tsx
import { Form, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { WellcareLogo } from '@/design-system/components/navbar';
import { StepProgressBar } from '@/pages/auth/register/components/register-ui';
import {
    useRegisterForm,
    STEP_FIELDS,
} from '@/pages/auth/register/hooks/use-register-form';
import type { StepErrors } from '@/pages/auth/register/hooks/use-register-form';
import { onboardingSteps } from '@/pages/auth/register/sections/register-data';
import StepAccount from '@/pages/auth/register/steps/step-account';
import StepMedical from '@/pages/auth/register/steps/step-medical';
import StepPersonal from '@/pages/auth/register/steps/step-personal';
import { login, home } from '@/routes';
import { store } from '@/routes/register';

interface RegisterFormPanelProps {
    onStepChange: (step: number) => void;
}

export default function RegisterFormPanel({
    onStepChange,
}: RegisterFormPanelProps) {
    const {
        step,
        totalSteps,
        fields,
        clientErrors,
        set,
        setRadio,
        handleNext,
        handleBack,
        handleSubmitValidation,
        goToStep,
    } = useRegisterForm(onStepChange);

    // ── Server error redirection ──────────────────────────────────────────────
    //
    // Inertia returns Laravel 422 validation errors by updating usePage().props.errors
    // directly — router.on("error") does NOT fire for these (that's only for network
    // errors). So we must watch the errors prop via usePage().
    //
    // Problem with naive JSON-key approach:
    //   Submitting the same invalid email twice produces the same JSON string →
    //   useEffect dependency doesn't change → the step redirect never fires again.
    //
    // Fix: track a submission counter via router.on("before") so every new
    // submission increments a ref. The effect depends on BOTH the error content
    // AND the submission count, so it always fires on a fresh submit even if
    // the error bag is identical to the last one.

    const pageErrors =
        (usePage().props as { errors?: Record<string, string> }).errors ?? {};
    const submitCount = useRef(0);
    const effectKey = `${submitCount.current}:${JSON.stringify(pageErrors)}`;
    const isFirstMount = useRef(true);

    // Increment the counter before every Inertia visit so effectKey is always
    // unique for a new submission — even when the error bag doesn't change.
    useEffect(() => {
        const unsubscribe = router.on('before', () => {
            submitCount.current += 1;
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Skip the very first render — no submission has happened yet.
        if (isFirstMount.current) {
            isFirstMount.current = false;

            return;
        }

        if (Object.keys(pageErrors).length === 0) {
            return;
        }

        // Walk steps 1 → 2 in priority order.
        // Jump to the first step that owns at least one returned error key.
        for (let s = 1; s <= totalSteps - 1; s++) {
            const stepErrors: StepErrors = {};

            for (const field of STEP_FIELDS[s]) {
                if (pageErrors[field]) {
                    stepErrors[field] = pageErrors[field];
                }
            }

            if (Object.keys(stepErrors).length > 0) {
                goToStep(s, stepErrors);

                return;
            }
        }

        // Step 3 errors (payment_method, classification, etc.) are already
        // rendered inline by the Form render prop — nothing extra needed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectKey]);

    // Merge client-side errors with server errors so step 3 always shows both
    const mergeErrors = (serverErrors: Record<string, string>): StepErrors => ({
        ...serverErrors,
        ...clientErrors,
    });

    return (
        <div
            className="flex flex-col justify-center overflow-y-auto px-6 py-12 md:px-16 lg:px-20"
            style={{ background: 'var(--wc-white)' }}
        >
            {/* Mobile logo */}
            <div className="mb-8 lg:hidden">
                <WellcareLogo />
            </div>

            <div className="mx-auto w-full max-w-[440px]">
                {/* Step heading */}
                <div className="mb-6">
                    <h1
                        className="mb-1 text-[clamp(1.5rem,3vw,2rem)]"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {onboardingSteps[step - 1].title}
                    </h1>
                    <p
                        className="text-sm"
                        style={{ color: 'var(--wc-gray-500)' }}
                    >
                        {onboardingSteps[step - 1].description}
                    </p>
                </div>

                <StepProgressBar current={step} total={totalSteps} />

                {/* ── Steps 1 & 2 — No form wrapper, just fields + Next button ── */}
                {step < totalSteps && (
                    <div className="flex flex-col gap-5">
                        {step === 1 && (
                            <StepAccount
                                fields={fields}
                                errors={clientErrors}
                                set={set}
                            />
                        )}
                        {step === 2 && (
                            <StepPersonal
                                fields={fields}
                                errors={clientErrors}
                                set={set}
                                setRadio={setRadio}
                            />
                        )}

                        {/* Navigation */}
                        <div
                            className={`mt-2 flex gap-3 ${step > 1 ? 'justify-between' : 'justify-end'}`}
                        >
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
                                >
                                    ← Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleNext}
                                className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill flex-1"
                            >
                                Continue →
                            </button>
                        </div>

                        {/* Login link */}
                        <p
                            className="mt-2 text-center text-sm"
                            style={{ color: 'var(--wc-gray-500)' }}
                        >
                            Already have an account?{' '}
                            <TextLink
                                href={login.url()}
                                tabIndex={99}
                                className="font-semibold"
                                style={{ color: 'var(--wc-blue-600)' }}
                            >
                                Log in
                            </TextLink>
                        </p>

                        <div className="pt-1 text-center">
                            <Link
                                href={home.url()}
                                className="text-xs"
                                style={{ color: 'var(--wc-gray-400)' }}
                            >
                                ← Back to Wellcare Clinics
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Step 3 — Inside Form so fields submit to server ── */}
                {step === totalSteps && (
                    <Form
                        {...store.form()}
                        resetOnSuccess={['password', 'password_confirmation']}
                        disableWhileProcessing
                        className="flex flex-col gap-5"
                    >
                        {({ processing, errors: serverErrors }) => {
                            const errors = mergeErrors(serverErrors);

                            return (
                                <>
                                    {/*
                    Hidden inputs carry over Step 1 + 2 field values
                    since they live outside this Form element.
                  */}
                                    <input
                                        type="hidden"
                                        name="first_name"
                                        value={fields.first_name}
                                    />
                                    <input
                                        type="hidden"
                                        name="last_name"
                                        value={fields.last_name}
                                    />
                                    <input
                                        type="hidden"
                                        name="email"
                                        value={fields.email}
                                    />
                                    <input
                                        type="hidden"
                                        name="password"
                                        value={fields.password}
                                    />
                                    <input
                                        type="hidden"
                                        name="password_confirmation"
                                        value={fields.password_confirmation}
                                    />
                                    <input
                                        type="hidden"
                                        name="address"
                                        value={fields.address}
                                    />
                                    <input
                                        type="hidden"
                                        name="company"
                                        value={fields.company}
                                    />
                                    <input
                                        type="hidden"
                                        name="contact_number"
                                        value={fields.contact_number}
                                    />
                                    <input
                                        type="hidden"
                                        name="gender"
                                        value={fields.gender}
                                    />
                                    <input
                                        type="hidden"
                                        name="birthdate"
                                        value={fields.birthdate}
                                    />
                                    <input
                                        type="hidden"
                                        name="civil_status"
                                        value={fields.civil_status}
                                    />
                                    {/* payment_method and preferred_doctor intentionally omitted — collected post-registration */}

                                    {/* Step 3 visible fields */}
                                    <StepMedical
                                        fields={fields}
                                        errors={errors}
                                        set={set}
                                        setRadio={setRadio}
                                    />

                                    {/* Navigation */}
                                    <div className="mt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="wc-btn wc-btn-outline wc-btn-md wc-btn-pill"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="wc-btn wc-btn-primary wc-btn-lg wc-btn-pill flex-1 justify-center"
                                            aria-busy={processing}
                                            onClick={(e) => {
                                                if (!handleSubmitValidation()) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        >
                                            {processing && <Spinner />}
                                            {processing
                                                ? 'Creating account…'
                                                : 'Create Account'}
                                        </button>
                                    </div>

                                    {/* Login link */}
                                    <p
                                        className="mt-2 text-center text-sm"
                                        style={{ color: 'var(--wc-gray-500)' }}
                                    >
                                        Already have an account?{' '}
                                        <TextLink
                                            href={login.url()}
                                            tabIndex={99}
                                            className="font-semibold"
                                            style={{
                                                color: 'var(--wc-blue-600)',
                                            }}
                                        >
                                            Log in
                                        </TextLink>
                                    </p>

                                    <div className="pt-1 text-center">
                                        <Link
                                            href={home.url()}
                                            className="text-xs"
                                            style={{
                                                color: 'var(--wc-gray-400)',
                                            }}
                                        >
                                            ← Back to Wellcare Clinics
                                        </Link>
                                    </div>
                                </>
                            );
                        }}
                    </Form>
                )}
            </div>
        </div>
    );
}
