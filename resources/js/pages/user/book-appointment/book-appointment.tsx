// resources/js/pages/generals/book-appointment.tsx
// ─────────────────────────────────────────────────
// Composer — only imports layout + sections. Nothing else.

import { useEffect }       from "react";
import WellcareLayout      from "@/layouts/app-gen-layout";
import BookingHero         from "@/pages/user/book-appointment/sections/booking-hero";
import BookingForm         from "@/pages/user/book-appointment/sections/booking-form";
import BookingSuccess      from "@/pages/user/book-appointment/sections/booking-success";
import { useBookingStore, resetBookingStore } from "@/hooks/use-booking-store";

export default function BookAppointmentPage() {
  const { submitted } = useBookingStore();

  // Reset store on unmount so next visit starts fresh at step 1
  useEffect(() => {
    return () => { resetBookingStore(); };
  }, []);

  return (
    <WellcareLayout>
      {submitted ? (
        <BookingSuccess />
      ) : (
        <>
          <BookingHero />
          <BookingForm />
        </>
      )}
    </WellcareLayout>
  );
}