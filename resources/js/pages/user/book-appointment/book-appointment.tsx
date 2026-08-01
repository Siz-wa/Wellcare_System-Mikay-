// resources/js/pages/user/book-appointment/book-appointment.tsx

import { usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { useBookingStore } from '@/hooks/use-booking-store';
import WellcareLayout from '@/layouts/app-gen-layout';
import type { PageProps } from '@/types';
import BookingForm from './sections/booking-form';
import BookingHero from './sections/booking-hero';
import BookingSuccess from './sections/booking-success';
import type { DoctorOption, BookingPrefill } from './sections/bookingdata';

interface BookAppointmentProps extends PageProps {
    doctors: DoctorOption[];
    prefill: BookingPrefill;
}

export default function BookAppointmentPage(): ReactElement {
    const { props } = usePage<BookAppointmentProps>();
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
            {submitted ? (
                <BookingSuccess />
            ) : (
                <BookingForm doctors={props.doctors} prefill={props.prefill} />
            )}
        </WellcareLayout>
    );
}
