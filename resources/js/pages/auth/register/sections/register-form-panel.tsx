// resources/js/pages/auth/register/sections/RegisterFormPanel.tsx
import { Form } from "@inertiajs/react";
import { Link } from "@inertiajs/react";
import TextLink from "@/components/text-link";
import { Spinner } from "@/components/ui/spinner";
import { WellcareLogo } from "@/design-system/components/navbar";
import { login, home } from "@/routes";
import { store } from "@/routes/register";
import { onboardingSteps } from "@/pages/auth/register/sections/register-data";
import { useRegisterForm } from "@/pages/auth/register/hooks/use-register-form";
import { StepProgressBar } from "@/pages/auth/register/components/register-ui";
import StepAccount  from "@/pages/auth/register/steps/step-account";
import StepPersonal from "@/pages/auth/register/steps/step-personal";
import StepMedical  from "@/pages/auth/register/steps/step-medical";
interface RegisterFormPanelProps {
  onStepChange: (step: number) => void;
}

export default function RegisterFormPanel({ onStepChange }: RegisterFormPanelProps) {
  const {
    step, totalSteps,
    fields, clientErrors,
    set, setRadio,
    handleNext, handleBack,
    handleSubmitValidation,
  } = useRegisterForm(onStepChange);

  // Merge client errors with any server errors passed via form render prop
  // Client errors take priority while navigating between steps
  const mergeErrors = (serverErrors: Record<string, string>) => ({
    ...serverErrors,
    ...clientErrors,
  });

  return (
    <div
      className="flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20 overflow-y-auto"
      style={{ background: "var(--wc-white)" }}
    >
      {/* Mobile logo */}
      <div className="lg:hidden mb-8">
        <WellcareLogo />
      </div>

      <div className="w-full max-w-[440px] mx-auto">

        {/* Step heading */}
        <div className="mb-6">
          <h1
            className="text-[clamp(1.5rem,3vw,2rem)] mb-1"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--wc-dark)" }}
          >
            {onboardingSteps[step - 1].title}
          </h1>
          <p className="text-sm" style={{ color: "var(--wc-gray-500)" }}>
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
            <div className={`flex gap-3 mt-2 ${step > 1 ? "justify-between" : "justify-end"}`}>
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
            <p className="text-center text-sm mt-2" style={{ color: "var(--wc-gray-500)" }}>
              Already have an account?{" "}
              <TextLink
                href={login.url()}
                tabIndex={99}
                className="font-semibold"
                style={{ color: "var(--wc-blue-600)" }}
              >
                Log in
              </TextLink>
            </p>

            <div className="text-center pt-1">
              <Link href={home.url()} className="text-xs" style={{ color: "var(--wc-gray-400)" }}>
                ← Back to Wellcare Clinics
              </Link>
            </div>
          </div>
        )}

        {/* ── Step 3 — Inside Form so fields submit to server ── */}
        {step === totalSteps && (
          <Form
            {...store.form()}
            resetOnSuccess={["password", "password_confirmation"]}
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
                  <input type="hidden" name="first_name"     value={fields.first_name} />
                  <input type="hidden" name="last_name"      value={fields.last_name} />
                  <input type="hidden" name="email"          value={fields.email} />
                  <input type="hidden" name="password"       value={fields.password} />
                  <input type="hidden" name="password_confirmation" value={fields.password_confirmation} />
                  <input type="hidden" name="address"        value={fields.address} />
                  <input type="hidden" name="company"        value={fields.company} />
                  <input type="hidden" name="contact_number" value={fields.contact_number} />
                  <input type="hidden" name="gender"         value={fields.gender} />
                  <input type="hidden" name="birthdate"      value={fields.birthdate} />
                  <input type="hidden" name="civil_status"   value={fields.civil_status} />

                  {/* Step 3 visible fields */}
                  <StepMedical
                    fields={fields}
                    errors={errors}
                    set={set}
                    setRadio={setRadio}
                  />

                  {/* Navigation */}
                  <div className="flex gap-3 mt-2">
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
                      {processing ? "Creating account…" : "Create Account"}
                    </button>
                  </div>

                  {/* Login link */}
                  <p className="text-center text-sm mt-2" style={{ color: "var(--wc-gray-500)" }}>
                    Already have an account?{" "}
                    <TextLink
                      href={login.url()}
                      tabIndex={99}
                      className="font-semibold"
                      style={{ color: "var(--wc-blue-600)" }}
                    >
                      Log in
                    </TextLink>
                  </p>

                  <div className="text-center pt-1">
                    <Link href={home.url()} className="text-xs" style={{ color: "var(--wc-gray-400)" }}>
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