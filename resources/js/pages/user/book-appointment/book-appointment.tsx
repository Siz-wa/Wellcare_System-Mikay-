// resources/js/pages/user/book-appointment/book-appointment.tsx

import { router, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import WellcareLayout from '@/layouts/app-gen-layout';
import type { PageProps } from '@/types';
import BookingForm from './sections/booking-form';
import BookingHero from './sections/booking-hero';
import BookingSuccess from './sections/booking-success';
import type {
    BookingWindow,
    DoctorOption,
    PatientOption,
} from './sections/bookingdata';
import PatientGate from './sections/patient-gate';

interface BookAppointmentProps extends PageProps {
    doctors: DoctorOption[];
    patients: PatientOption[];
    selectedPatientId: number | null;
    bookingWindow: BookingWindow;
}

export default function BookAppointmentPage(): ReactElement {
    const { props } = usePage<BookAppointmentProps>();

    // Booking redirects back to /book with a success flash, and the flash only
    // survives that one render — so the success screen is derived from it
    // rather than stored.
    //
    // It used to be a `submitted` flag in a hand-rolled store whose state lived
    // in module-level `let` bindings, read during render. That broke twice
    // over: React Compiler saw a hook return with no reactive dependencies and
    // cached it, so "Continue" mutated the step but never repainted; and
    // because the bindings outlived the component, returning to /book resumed a
    // stale step and kept showing the success screen from a previous booking.
    const submitted = Boolean(props.flash?.success);

    const selectedPatient =
        props.patients.find((p) => p.id === props.selectedPatientId) ?? null;

    // The choice lives in the URL, so a refresh or a back-button keeps it and
    // "Change" is just another navigation rather than hidden state.
    const choosePatient = (id: number | null) => {
        router.get('/book', id === null ? {} : { patient: id }, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <WellcareLayout>
            <BookingHero />

            {submitted ? (
                <BookingSuccess />
            ) : selectedPatient ? (
                <BookingForm
                    doctors={props.doctors}
                    patient={selectedPatient}
                    bookingWindow={props.bookingWindow}
                    onChangePatient={() => choosePatient(null)}
                />
            ) : (
                <PatientGate
                    patients={props.patients}
                    onSelect={choosePatient}
                />
            )}
        </WellcareLayout>
    );
}
