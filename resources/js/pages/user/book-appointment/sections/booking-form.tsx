// resources/js/pages/generals/book-appointment/sections/booking-form.tsx
// ──────────────────────────────────────────────────────────────────────────
// Orchestrator — owns the Inertia form, wires step state, renders the
// correct step component. Does NOT contain any field JSX itself.

import type { ReactElement }       from "react";
import { useForm }                 from "@inertiajs/react";
import { useInView }               from "@/hooks/useInView";
import { useBookingStore }         from "@/hooks/use-booking-store";
import { useStepValidators }       from "@/hooks/use-step-validators";
import { BOOKING_FORM_DEFAULTS }   from "@/pages/user/book-appointment/sections/bookingdata";
import type { StepId }             from "@/pages/user/book-appointment/sections/bookingdata";
import { StepIndicator }           from "../components";
import StepPersonal                from "./step-personal";
import StepAppointment             from "./step-appointment";
import StepCoverage                from "./step-coverage";
import StepReview                  from "./step-review";

// Wayfinder — generated from your named routes in web.php
// Run `php artisan wayfinder:generate` to regenerate after route changes
import { store } from "@/routes/book";

export default function BookingForm(): ReactElement {
  const { ref, inView }                                   = useInView();
  const { step, completed, goTo, markDone, setSubmitted } = useBookingStore();
  const { data, setData, post, processing, errors }       = useForm(BOOKING_FORM_DEFAULTS);
  const { step1Valid, step2Valid, step3Valid }             = useStepValidators(data);

  // ── Advance to next step only when valid ──────────────────────────────

  const advance = (current: StepId, next: StepId, valid: boolean) => {
    if (!valid) return;
    markDone(current);
    goTo(next);
  };

  // ── Form submit — posts to POST /appointments (appointments.store) ────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(store().url, {
      onSuccess: () => setSubmitted(true),
    });
  };

  // ── Card entrance animation ────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    opacity:         inView ? 1 : 0,
    transform:       inView ? "translateY(0)" : "translateY(24px)",
    transition:      "opacity var(--duration-slower) var(--ease-out), transform var(--duration-slower) var(--ease-out)",
    transitionDelay: "80ms",
  };

  return (
    <section className="wc-section" style={{ background: "var(--wc-gray-50)", paddingTop: "var(--space-4)" }}>
      <div className="wc-container" style={{ maxWidth: 860 }}>

        <StepIndicator current={step} completed={completed} />

        <div ref={ref} className="wc-card wc-card-elevated" style={cardStyle}>
          <div className="wc-card-body" style={{ padding: "var(--space-8)" }}>

            {step === 1 && (
              <StepPersonal
                data={data}
                errors={errors}
                setData={setData}
                valid={step1Valid}
                onNext={() => advance(1, 2, step1Valid)}
              />
            )}

            {step === 2 && (
              <StepAppointment
                data={data}
                errors={errors}
                setData={setData}
                valid={step2Valid}
                onNext={() => advance(2, 3, step2Valid)}
                onBack={() => goTo(1)}
              />
            )}

            {step === 3 && (
              <StepCoverage
                data={data}
                errors={errors}
                setData={setData}
                valid={step3Valid}
                onNext={() => advance(3, 4, step3Valid)}
                onBack={() => goTo(2)}
              />
            )}

            {step === 4 && (
              <form onSubmit={handleSubmit} noValidate>
                <StepReview
                  data={data}
                  errors={errors}
                  setData={setData}
                  isProcessing={processing}
                  onBack={() => goTo(3)}
                  onGoToStep={(s: StepId) => goTo(s)}
                />
              </form>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}