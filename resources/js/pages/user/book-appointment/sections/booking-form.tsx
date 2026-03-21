// resources/js/pages/generals/book-appointment/sections/booking-form.tsx

import type { ReactElement }     from "react";
import { useState }              from "react";
import { useForm }               from "@inertiajs/react";
import { useInView }             from "@/hooks/useInView";
import { useBookingStore }       from "@/hooks/use-booking-store";
import { useStepValidators }     from "@/hooks/use-step-validators";
import { BOOKING_FORM_DEFAULTS } from "@/pages/user/book-appointment/sections/bookingdata";
import type { StepId }           from "@/pages/user/book-appointment/sections/bookingdata";
import { StepIndicator }         from "../components";
import StepPersonal              from "./step-personal";
import StepAppointment           from "./step-appointment";
import StepCoverage              from "./step-coverage";
import StepReview                from "./step-review";
import { store }                 from "@/routes/book";

export default function BookingForm(): ReactElement {
  const { ref, inView }                                           = useInView();
  const { step, completed, goTo, markDone, setSubmitted }         = useBookingStore();
  const { data, setData, post, processing, errors: serverErrors } = useForm(BOOKING_FORM_DEFAULTS);

  // Errors are hidden until the user first attempts to proceed from that step.
  // This prevents a red form on first load before the user has done anything.
  const [attempted1, setAttempted1] = useState(false);
  const [attempted2, setAttempted2] = useState(false);
  const [attempted3, setAttempted3] = useState(false);

  const {
    step1Valid, step2Valid, step3Valid,
    errors1, errors2, errors3,
  } = useStepValidators(data);

  // ── Navigation handlers ────────────────────────────────────────────────

  const handleNext1 = () => {
    setAttempted1(true);
    if (!step1Valid) return;
    markDone(1);
    goTo(2);
  };

  const handleNext2 = () => {
    setAttempted2(true);
    if (!step2Valid) return;
    markDone(2);
    goTo(3);
  };

  const handleNext3 = () => {
    setAttempted3(true);
    if (!step3Valid) return;
    markDone(3);
    goTo(4);
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(store().url, {
      onSuccess: () => setSubmitted(true),
    });
  };

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
                errors={attempted1 ? errors1 : {}}
                setData={setData}
                valid={step1Valid}
                onNext={handleNext1}
              />
            )}

            {step === 2 && (
              <StepAppointment
                data={data}
                errors={attempted2 ? errors2 : {}}
                setData={setData}
                valid={step2Valid}
                onNext={handleNext2}
                onBack={() => goTo(1)}
              />
            )}

            {step === 3 && (
              <StepCoverage
                data={data}
                errors={attempted3 ? errors3 : {}}
                setData={setData}
                valid={step3Valid}
                onNext={handleNext3}
                onBack={() => goTo(2)}
              />
            )}

            {step === 4 && (
              <form onSubmit={handleSubmit} noValidate>
                <StepReview
                  data={data}
                  errors={serverErrors}
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