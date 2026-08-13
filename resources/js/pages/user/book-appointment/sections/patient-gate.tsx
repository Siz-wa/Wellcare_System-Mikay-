// resources/js/pages/user/book-appointment/sections/patient-gate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Who is this appointment for?" — the step before the wizard.
//
// It renders on /book rather than intercepting every Book Appointment button in
// the app, so nothing else had to change and the choice can live in the URL
// (`/book?patient=12`), which keeps refresh and the back button honest.

import { Link } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { patientGateCopy } from '@/pages/user/book-appointment/sections/bookingdata';
import type { PatientOption } from '@/pages/user/book-appointment/sections/bookingdata';
import { dashboard } from '@/routes/user';
import { index as patientsIndex } from '@/routes/user/patients';
import PatientFormSheet from './patient-form-sheet';

interface PatientGateProps {
    patients: PatientOption[];
    onSelect: (id: number) => void;
}

export default function PatientGate({
    patients,
    onSelect,
}: PatientGateProps): ReactElement {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<PatientOption | null>(null);

    // No "add myself" affordance: registration collects the name, contact number
    // and birthdate, so Patient::ensureSelfPatient() has already put the account
    // holder in this list by the time the gate renders.
    const openAdd = () => {
        setEditing(null);
        setSheetOpen(true);
    };

    // A record with no age or sex cannot be booked — appointments require both.
    // Selecting it would only fail at submit, so send the guarantor to fill the
    // gap instead. Saving redirects straight into the wizard.
    const choose = (patient: PatientOption) => {
        if (patient.needsDetails) {
            setEditing(patient);
            setSheetOpen(true);

            return;
        }

        onSelect(patient.id);
    };

    return (
        <section
            className="wc-section"
            style={{
                background: 'var(--wc-gray-50)',
                paddingTop: 'var(--space-4)',
                minHeight: '40vh',
            }}
        >
            {/* Stays mounted while the sheet is open, so the sheet slides in over
                it instead of the whole gate blinking out and back.
                `modal` is handed to the sheet for the duration: two nested Radix
                modals would otherwise both trap focus, and the outer one wins —
                leaving the sheet's fields unreachable.

                Not dismissable: there is no booking form behind it to fall back
                to, so closing would strand the user on a blank page. The built-in
                X is hidden and Escape / outside-click are blocked; the way out is
                the explicit link at the bottom. */}
            <Dialog open modal={!sheetOpen}>
                {/* Explicit width, not `sm:max-w-lg`: tokens.css redefines
                    --container-lg to 1024px for the project's page containers,
                    so that utility would stretch the dialog to full width. */}
                <DialogContent
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                    className="max-h-[85vh] overflow-y-auto [&>button:last-of-type]:hidden"
                    style={{ width: 'min(30rem, calc(100vw - 2rem))' }}
                >
                    <DialogHeader>
                        <DialogTitle>{patientGateCopy.title}</DialogTitle>
                        <DialogDescription>
                            {patientGateCopy.subtitle}
                        </DialogDescription>
                    </DialogHeader>

                    {patients.length === 0 ? (
                        <div
                            style={{
                                padding: 'var(--space-6) var(--space-4)',
                                textAlign: 'center',
                            }}
                        >
                            <p
                                style={{
                                    margin: '0 0 var(--space-1)',
                                    fontWeight: 700,
                                    color: 'var(--wc-gray-900)',
                                }}
                            >
                                {patientGateCopy.emptyTitle}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                {patientGateCopy.emptyBody}
                            </p>
                        </div>
                    ) : (
                        <ul
                            style={{
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)',
                            }}
                        >
                            {patients.map((p) => (
                                <li key={p.id}>
                                    <PatientChoice
                                        patient={p}
                                        onClick={() => choose(p)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-4)',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--wc-gray-100)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={openAdd}
                            className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                        >
                            + {patientGateCopy.addLabel}
                        </button>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 'var(--space-4)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            <Link href={patientsIndex().url}>
                                {patientGateCopy.manageLabel}
                            </Link>
                            <Link href={dashboard().url}>
                                {patientGateCopy.cancelLabel}
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* bookAfterSave: adding someone here means booking for them, so the
                server redirects to /book?patient={id} and the wizard opens
                directly instead of dropping back to the gate for one more click. */}
            <PatientFormSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                patient={editing}
                bookAfterSave
            />
        </section>
    );
}

// ── One selectable patient ────────────────────────────────────────────────────

function PatientChoice({
    patient,
    onClick,
}: {
    patient: PatientOption;
    onClick: () => void;
}): ReactElement {
    const meta = [
        patient.relationshipLabel,
        patient.age !== null ? `${patient.age} yrs` : null,
        patient.gender,
    ].filter(Boolean);

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--wc-gray-200)',
                background: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--duration-base) var(--ease-out)',
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--wc-blue-50)',
                    color: 'var(--wc-blue-700)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                }}
            >
                {patient.initials}
            </span>

            <span style={{ minWidth: 0, flex: 1 }}>
                <span
                    style={{
                        display: 'block',
                        fontWeight: 600,
                        color: 'var(--wc-gray-900)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {patient.name}
                </span>
                {patient.needsDetails ? (
                    <span
                        style={{
                            display: 'block',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--wc-error)',
                            fontWeight: 600,
                        }}
                    >
                        {patientGateCopy.needsDetails}
                    </span>
                ) : (
                    meta.length > 0 && (
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-gray-500)',
                            }}
                        >
                            {meta.join(' · ')}
                        </span>
                    )
                )}
            </span>
        </button>
    );
}
