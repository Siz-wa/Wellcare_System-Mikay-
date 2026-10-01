// resources/js/pages/user/book-appointment/book-appointment.tsx

import { router, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { PatientDashboardLayout } from '@/pages/user/layout/patient-dashboard-layout';
import type { PageProps } from '@/types';
import BookingForm from './sections/booking-form';
import BookingHero from './sections/booking-hero';
import BookingSuccess from './sections/booking-success';
import type {
    BookingPrefill,
    BookingWindow,
    ConsentDocument,
    DoctorOption,
    PatientOption,
    ServiceDefinition,
} from './sections/bookingdata';
import PatientGate from './sections/patient-gate';

interface BookAppointmentProps extends PageProps {
    doctors: DoctorOption[];
    patients: PatientOption[];
    selectedPatientId: number | null;
    /** What `?service=` and `?type=` asked the wizard to open with. */
    prefill: BookingPrefill;
    bookingWindow: BookingWindow;
    /** SC-4 / C-5. Served from config/consent.php, so the text the patient
     *  reads and the version stamped on the consent row are the same thing. */
    telemedicineConsent: ConsentDocument;
    /** The bookable catalogue, from the `services` table. Served rather than
     *  bundled so an administrator retiring a service takes it off this form
     *  immediately — see App\Models\Service::catalogue(). */
    services: ServiceDefinition[];
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
    //
    // `service` and `type` are carried across that navigation. Without it a
    // patient who arrived from "Book this service" on the public services page
    // lost their choice the moment they picked who the visit was for, which is
    // the one step of the gate they cannot skip.
    const choosePatient = (id: number | null) => {
        const query: Record<string, string | number> = {};

        if (id !== null) {
            query.patient = id;
        }

        if (props.prefill?.service) {
            query.service = props.prefill.service;
        }

        if (props.prefill?.consultationType === 'virtual') {
            query.type = 'virtual';
        }

        if (props.prefill?.doctorId) {
            query.doctor = props.prefill.doctorId;
        }

        router.get('/book', query, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    // The patient shell, not the public marketing layout.
    //
    // `/book` sits inside `middleware(['auth', 'role:user'])` — there is no
    // guest booking on this route, so every visitor here is a signed-in
    // patient, and wrapping them in the public navbar signed them out of their
    // own portal visually: no sidebar, no bottom tab bar, and the only way back
    // was the marketing site's menu. That is the "blurry line between website
    // and portal" that patient-portal research names as a top cause of people
    // abandoning a booking half-finished.
    return (
        <PatientDashboardLayout activeId="schedule">
            <BookingHero />

            {submitted ? (
                <BookingSuccess />
            ) : selectedPatient ? (
                <BookingForm
                    doctors={props.doctors}
                    patient={selectedPatient}
                    prefill={props.prefill}
                    bookingWindow={props.bookingWindow}
                    telemedicineConsent={props.telemedicineConsent}
                    services={props.services}
                    onChangePatient={() => choosePatient(null)}
                />
            ) : (
                <PatientGate
                    patients={props.patients}
                    onSelect={choosePatient}
                />
            )}
        </PatientDashboardLayout>
    );
}
