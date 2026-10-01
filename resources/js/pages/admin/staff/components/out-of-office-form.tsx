// resources/js/pages/admin/staff/components/out-of-office-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Close one day for a doctor who cannot attend (sick call, emergency leave).
//
// The same action as the doctor's own "Block this date", taken for them by the
// clinic. It applies immediately, cancels that day's open appointments and
// notifies each patient.

import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import {
    Button,
    ConfirmDialog,
    DateField,
    Field,
    Input,
} from '@/design-system';
import { todayIsoDate } from '@/lib/local-date';
import { staffCopy } from '@/pages/admin/staff/staff-data';
import { outOfOffice } from '@/routes/admin/doctors';

interface OutOfOfficeFormProps {
    doctorId: number;
}

export function OutOfOfficeForm({
    doctorId,
}: OutOfOfficeFormProps): ReactElement {
    const copy = staffCopy.outOfOffice;
    const [confirming, setConfirming] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        date: '',
        reason: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (data.date) {
            setConfirming(true);
        }
    };

    const apply = () => {
        post(outOfOffice.url(doctorId), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onFinish: () => setConfirming(false),
        });
    };

    return (
        <form
            onSubmit={submit}
            style={{ display: 'grid', gap: 'var(--space-3)' }}
        >
            <p
                style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--wc-text-muted)',
                }}
            >
                {copy.intro}
            </p>
            <Field label={copy.dateLabel} error={errors.date}>
                <DateField
                    kind="date"
                    min={todayIsoDate()}
                    value={data.date}
                    onChange={(e) => setData('date', e.target.value)}
                />
            </Field>
            <Field
                label={copy.reasonLabel}
                hint={copy.reasonHint}
                error={errors.reason}
            >
                <Input
                    value={data.reason}
                    maxLength={255}
                    onChange={(e) => setData('reason', e.target.value)}
                />
            </Field>
            <div>
                <Button
                    type="submit"
                    variant="secondary"
                    disabled={!data.date || processing}
                >
                    {copy.submit}
                </Button>
            </div>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={copy.confirmTitle}
                description={copy.confirmBody}
                confirmLabel={copy.confirmLabel}
                processing={processing}
                onConfirm={apply}
            />
        </form>
    );
}
