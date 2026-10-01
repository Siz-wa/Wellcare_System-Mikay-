// resources/js/pages/user/dashboard/components/appointment-card.tsx
// ─────────────────────────────────────────────────────────────────────────────
// One upcoming appointment. Three things had to become unmissable:
//
//   who   — the patient chip leads the card, because the account holder may be
//           booking for four different people and the old card named none of them
//   when  — a fixed left rail carries the time (date-grouped view) or the date
//           (person-grouped view), so scanning a column reads chronologically
//   where it stands — the accent bar is the status colour before any text is read

import { Link, router } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    CheckCircle2,
    ShieldCheck,
    Stethoscope,
    Video,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { AppointmentItem } from '../dashboard-data';
import { dashboardCopy } from '../dashboard-data';
import { splitTime, statusTone } from '../dashboard-data';
import { PatientChip } from './patient-chip';
import { ProgressRail } from './progress-rail';
import { StatusBadge } from './status-badge';

interface AppointmentCardProps {
    appt: AppointmentItem;
    /** What the left rail shows — time inside a day group, date inside a person group. */
    lead: 'time' | 'date';
    /** Suppressed inside a person group, where the header already names them. */
    showPatient: boolean;
    onCancel: (id: number) => void;
    onReschedule?: (appt: AppointmentItem) => void;
}

/** ₱1,234.00 — matches the Payments page, which is where this badge leads. */
function peso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function AppointmentCard({
    appt,
    lead,
    showPatient,
    onCancel,
    onReschedule,
}: AppointmentCardProps): ReactElement {
    const [busy, setBusy] = useState(false);
    const tone = statusTone(appt.status);
    const { clock, meridiem } = splitTime(appt.time);

    function handleCheckIn(): void {
        setBusy(true);
        router.post(
            `/user/appointments/${appt.id}/check-in`,
            {},
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    }

    const doctorLabel = appt.doctor
        ? appt.doctor.startsWith('Dr.')
            ? appt.doctor
            : `Dr. ${appt.doctor}`
        : 'Next available doctor';

    const isVirtual = appt.consultationType === 'virtual';

    /*
     * `cash` is the stored enum value, never the word shown to a patient.
     *
     * The booking wizard's coverage step renamed this option to "Self-Pay"
     * because "Cash" on a video consultation promises a cashier who does not
     * exist. This card was still rendering the raw column, so the same visit
     * read "Self-Pay" while booking it and "Cash" the moment it was booked.
     */
    const coverageLabel =
        appt.coverage === 'hmo' && appt.hmo
            ? `HMO · ${appt.hmo}`
            : appt.coverage === 'cash'
              ? 'Self-Pay'
              : appt.coverage;

    // The overdue banner already explains a passed date, and a live "Check in"
    // button explains itself. Everything else gets a line saying what is being
    // waited on — including the "check-in opens on…" case the previous card
    // had copy for but could never reach, because canCheckIn ignored the date.
    const hint = (() => {
        if (appt.isPast || appt.canCheckIn) {
            return null;
        }

        if (appt.status === 'confirmed') {
            // dayLabel is "Tomorrow", "Friday" or "Fri, 12 Sep 2026" — only
            // the first of those reads wrong after "on".
            return appt.isTomorrow
                ? 'Check-in opens tomorrow'
                : `Check-in opens on ${appt.dayLabel}`;
        }

        if (isVirtual && tone.virtualHint) {
            return tone.virtualHint;
        }

        return tone.hint;
    })();

    return (
        <article className="wc-appt">
            <span
                className="wc-appt-accent"
                style={{ background: tone.accent }}
                aria-hidden="true"
            />

            <div className="wc-appt-rail">
                {lead === 'time' ? (
                    <>
                        <span className="wc-appt-rail-lead">{clock}</span>
                        <span className="wc-appt-rail-sub">{meridiem}</span>
                    </>
                ) : (
                    <>
                        <span className="wc-appt-rail-sub">{appt.weekday}</span>
                        <span className="wc-appt-rail-lead">
                            {appt.dayNumber}
                        </span>
                        <span className="wc-appt-rail-sub">
                            {appt.monthShort}
                        </span>
                    </>
                )}
            </div>

            <div className="wc-appt-body">
                <div className="wc-appt-top">
                    <div
                        style={{
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                        }}
                    >
                        {showPatient && (
                            <PatientChip
                                name={appt.patientName}
                                initials={appt.patientInitials}
                                colorKey={appt.patientKey}
                                relation={appt.patientRelation}
                            />
                        )}
                        <p
                            style={{
                                margin: 0,
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 800,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {appt.service}
                        </p>
                        {/* The day lives in the group header of the date view,
                            so it is only worth repeating in the person view. */}
                        {!showPatient && (
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                }}
                            >
                                {appt.dayLabel} · {appt.time}
                            </p>
                        )}
                    </div>

                    <StatusBadge status={appt.status} />
                </div>

                <div className="wc-appt-meta">
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        <Stethoscope size={13} aria-hidden="true" />
                        {/* Linked to the doctor's public profile where there is
                            one. The DOH Patient's Bill of Rights expects a
                            patient to know who is treating them and on what
                            credentials; this is the shortest path from "I have
                            an appointment" to that. */}
                        {appt.doctorProfileUrl ? (
                            <Link
                                href={appt.doctorProfileUrl}
                                className="wc-link"
                            >
                                {doctorLabel}
                            </Link>
                        ) : (
                            doctorLabel
                        )}
                    </span>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        {isVirtual ? (
                            <Video size={13} aria-hidden="true" />
                        ) : (
                            <Building2 size={13} aria-hidden="true" />
                        )}
                        {isVirtual
                            ? 'Video consultation'
                            : (appt.branch ?? 'In person')}
                    </span>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            textTransform: 'capitalize',
                        }}
                    >
                        <ShieldCheck size={13} aria-hidden="true" />
                        {coverageLabel}
                    </span>
                </div>

                {/* Unpaid video consultation — the one thing on this card the
                    patient must act on somewhere else, and the one that costs
                    them the booking if they do not. Above the past-date notice
                    because it is still actionable. */}
                {appt.payment && (
                    <a
                        href="/user/payments"
                        style={{
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: appt.payment.isOverdue
                                ? '#fef2f2'
                                : '#fffbeb',
                            border: `1px solid ${
                                appt.payment.isOverdue ? '#fecaca' : '#fde68a'
                            }`,
                            color: appt.payment.isOverdue
                                ? '#b91c1c'
                                : '#92400e',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        <Wallet size={13} aria-hidden="true" />
                        {appt.payment.status === 'submitted'
                            ? `${peso(appt.payment.amountDue)} — the clinic is checking your payment`
                            : appt.payment.isOverdue
                              ? `${peso(appt.payment.amountDue)} unpaid past the deadline — settle now or this booking is released`
                              : `${peso(appt.payment.amountDue)} due before ${appt.payment.dueAt ?? 'your schedule'} — tap to settle`}
                    </a>
                )}

                {appt.isPast && (
                    <p
                        style={{
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                        }}
                    >
                        <CalendarClock size={13} aria-hidden="true" />
                        This date has passed. Rebook if you still need to be
                        seen.
                    </p>
                )}

                <div className="wc-appt-foot">
                    <ProgressRail status={appt.status} />

                    <div className="wc-appt-actions">
                        {hint && (
                            <span
                                style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                    fontStyle: 'italic',
                                }}
                            >
                                {hint}
                            </span>
                        )}

                        {/* A passed date has no action left on it that the
                            patient can take against THIS row — the useful one
                            is booking a replacement. */}
                        {appt.isPast && (
                            <Link
                                href="/book"
                                className="wc-btn wc-btn-outline wc-btn-sm wc-btn-pill"
                            >
                                Rebook
                            </Link>
                        )}

                        {appt.canCheckIn && (
                            <button
                                type="button"
                                onClick={handleCheckIn}
                                disabled={busy}
                                aria-busy={busy}
                                className="wc-btn wc-btn-primary wc-btn-sm wc-btn-pill"
                                style={{ gap: 6 }}
                            >
                                <CheckCircle2 size={14} aria-hidden="true" />
                                {busy ? 'Checking in…' : 'Check in'}
                            </button>
                        )}

                        {appt.canReschedule && onReschedule && (
                            <button
                                type="button"
                                onClick={() => onReschedule(appt)}
                                className="wc-btn wc-btn-secondary wc-btn-sm wc-btn-pill"
                            >
                                {dashboardCopy.rescheduleAction}
                            </button>
                        )}

                        {appt.canCancel && (
                            <button
                                type="button"
                                onClick={() => onCancel(appt.id)}
                                className="wc-btn wc-btn-quiet-danger wc-btn-sm wc-btn-pill"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
