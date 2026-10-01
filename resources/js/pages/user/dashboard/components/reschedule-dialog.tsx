// resources/js/pages/user/dashboard/components/reschedule-dialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Move a booking to another date and time with the same doctor.
//
// The server moves it in one transaction (the old slot is released only once
// the new one is secured), so a patient cannot end up with no booking at all,
// which is what "cancel and book again" risked.

import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DateField } from '@/design-system';
import { dashboardCopy } from '../dashboard-data';
import type { AppointmentItem } from '../dashboard-data';

interface RescheduleDialogProps {
    appointment: AppointmentItem | null;
    window: { min: string; max: string };
    onClose: () => void;
}

type SlotState =
    | { key: string; status: 'loaded'; slots: string[] }
    | { key: string; status: 'error' };

export function RescheduleDialog({
    appointment,
    window: bookable,
    onClose,
}: RescheduleDialogProps): ReactElement {
    const copy = dashboardCopy.reschedule;
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loaded, setLoaded] = useState<SlotState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const key = appointment && date ? `${appointment.id}:${date}` : '';

    useEffect(() => {
        if (!appointment?.doctorId || !date) {
            return;
        }

        let cancelled = false;
        const params = new URLSearchParams({
            doctor_id: String(appointment.doctorId),
            date,
            ...(appointment.patientId
                ? { patient_id: String(appointment.patientId) }
                : {}),
        });

        fetch(`/appointments/slots?${params}`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data: { slots?: string[] }) => {
                if (!cancelled) {
                    setLoaded({
                        key,
                        status: 'loaded',
                        slots: data.slots ?? [],
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoaded({ key, status: 'error' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [appointment, date, key]);

    const current = loaded?.key === key ? loaded : null;
    const loading = key !== '' && current === null;

    const close = () => {
        setDate('');
        setTime('');
        setError(null);
        onClose();
    };

    const submit = () => {
        if (!appointment || !date || !time) {
            return;
        }

        setSaving(true);
        router.post(
            `/appointments/${appointment.id}/reschedule`,
            { appointment_date: date, appointment_time: time },
            {
                preserveScroll: true,
                onSuccess: () => close(),
                onError: (errors) =>
                    setError(
                        errors.reschedule ??
                            errors.appointment_time ??
                            copy.failed,
                    ),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <Dialog open={appointment !== null} onOpenChange={(o) => !o && close()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{copy.title}</DialogTitle>
                    <DialogDescription>
                        {appointment
                            ? copy.description(
                                  appointment.service,
                                  appointment.doctor,
                                  appointment.date,
                                  appointment.time,
                              )
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                        <span
                            style={{
                                fontWeight: 600,
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            {copy.dateLabel}
                        </span>
                        <DateField
                            kind="date"
                            min={bookable.min}
                            max={bookable.max}
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setTime('');
                                setError(null);
                            }}
                        />
                    </label>

                    {date && (
                        <div style={{ display: 'grid', gap: 6 }}>
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: 'var(--text-sm)',
                                }}
                            >
                                {copy.timeLabel}
                            </span>
                            {loading && <span>{copy.loading}</span>}
                            {current?.status === 'error' && (
                                <span>{copy.loadFailed}</span>
                            )}
                            {current?.status === 'loaded' &&
                                current.slots.length === 0 && (
                                    <span>{copy.noSlots}</span>
                                )}
                            {current?.status === 'loaded' &&
                                current.slots.length > 0 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}
                                    >
                                        {current.slots.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setTime(slot)}
                                                aria-pressed={time === slot}
                                                className={`wc-btn wc-btn-sm wc-btn-pill ${
                                                    time === slot
                                                        ? 'wc-btn-primary'
                                                        : 'wc-btn-secondary'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </div>
                    )}

                    {error && (
                        <p
                            role="alert"
                            style={{ margin: 0, color: 'var(--wc-error)' }}
                        >
                            {error}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        className="wc-btn wc-btn-secondary wc-btn-md wc-btn-pill"
                        onClick={close}
                    >
                        {copy.keep}
                    </button>
                    <button
                        type="button"
                        className="wc-btn wc-btn-primary wc-btn-md wc-btn-pill"
                        disabled={!time || saving}
                        onClick={submit}
                    >
                        {saving ? copy.saving : copy.confirm}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
