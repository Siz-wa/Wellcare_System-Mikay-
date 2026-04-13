// resources/js/pages/user/book-appointment/book-appointment.tsx

import type { ReactElement }     from "react";
import { useEffect }             from "react";
import { usePage }               from "@inertiajs/react";
import WellcareLayout            from "@/layouts/app-gen-layout";
import BookingHero               from "./sections/booking-hero";
import BookingForm               from "./sections/booking-form";
import BookingSuccess            from "./sections/booking-success";
import { useBookingStore }       from "@/hooks/use-booking-store";
import type { DoctorOption }     from "./sections/bookingdata";
import type { PageProps }        from "@/types";

interface BookAppointmentProps extends PageProps {
  doctors: DoctorOption[];
}

export default function BookAppointmentPage(): ReactElement {
  const { props }                   = usePage<BookAppointmentProps>();
  const { submitted, setSubmitted } = useBookingStore();

  // When Laravel redirects back to /book with a success flash after booking,
  // trigger the success screen instead of re-showing the form.
  useEffect(() => {
    if (props.flash?.success) {
      setSubmitted(true);
    }
  }, [props.flash?.success]);

  return (
    <WellcareLayout>
      <BookingHero />
      {submitted
        ? <BookingSuccess />
        : <BookingForm doctors={props.doctors} />
      }
    </WellcareLayout>
  );
}