// resources/js/pages/hr/payment-verifications/components/decision-dialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The note an officer writes when they confirm, refuse or waive a payment.
//
// A plain centred dialog rather than the shadcn Dialog primitive, matching
// AdminModal and the rest of the staff surfaces. It stacks at --z-modal, and
// the Select inside it portals to --z-popover above that — see the layer scale
// in tokens.css, which is what stopped dropdowns rendering behind modals.

import { router, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Textarea } from '@/design-system';
import {
    counter,
    reject,
    verify,
    waive,
} from '@/routes/hr/payment-verifications';
import type { QueuePayment } from '../payment-verifications-data';
import { formatPeso, queueMeta } from '../payment-verifications-data';

export type DecisionKind = 'verify' | 'reject' | 'waive' | 'counter';

interface DecisionDialogProps {
    payment: QueuePayment;
    kind: DecisionKind;
    onClose: () => void;
}

export function DecisionDialog({
    payment,
    kind,
    onClose,
}: DecisionDialogProps): ReactElement {
    const { actions } = queueMeta;
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);

    /*
     * Server-side refusals, read off the shared Inertia errors bag.
     *
     * Without this the dialog swallowed them. Every decision here can be
     * refused by a guard — deciding a payment twice, collecting on a settled
     * one — and `back()->withErrors()` put the sentence somewhere this
     * component never looked. The officer saw the dialog stay open with no
     * explanation, which reads as a broken button rather than as a rule.
     */
    const { errors } = usePage().props as unknown as {
        errors: Record<string, string>;
    };
    /*
     * Gated on having actually tried. The shared errors bag survives until the
     * next request, and opening a dialog makes none — so without this flag a
     * refusal from the PREVIOUS payment would greet the officer on the next
     * row they opened, blaming a decision they have not made yet.
     */
    const [attempted, setAttempted] = useState(false);
    const serverError = attempted
        ? (errors?.official_receipt ??
          errors?.reason ??
          errors?.remarks ??
          null)
        : null;

    // Counter payments carry two more fields. Seeded with what is owed,
    // because that is what a cashier collects in all but the rare case.
    const isCounter = kind === 'counter';
    const [amount, setAmount] = useState(payment.amountDue.toFixed(2));
    const [receipt, setReceipt] = useState('');

    // Escape closes, registered only while open so a closed dialog does not
    // swallow Escape from the page behind it.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Only a confirmation may be silent. A refusal is the only thing the
    // patient can act on, and a waiver is the thing an audit asks about. A
    // counter payment carries its own required fields instead of a note.
    const noteRequired = kind === 'reject' || kind === 'waive';
    const canSubmit =
        !processing &&
        (!noteRequired || note.trim().length > 0) &&
        (!isCounter || (receipt.trim().length > 0 && Number(amount) > 0));

    const submit = () => {
        setProcessing(true);
        setAttempted(true);

        const route =
            kind === 'verify'
                ? verify(payment.id)
                : kind === 'reject'
                  ? reject(payment.id)
                  : kind === 'waive'
                    ? waive(payment.id)
                    : counter(payment.id);

        const payload = isCounter
            ? {
                  amount_paid: amount,
                  official_receipt: receipt,
                  remarks: note,
              }
            : kind === 'verify'
              ? { remarks: note }
              : { reason: note };

        router.post(route.url, payload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: onClose,
        });
    };

    const heading =
        kind === 'verify'
            ? actions.verify
            : kind === 'reject'
              ? actions.reject
              : kind === 'waive'
                ? actions.waive
                : actions.counter;

    const prompt =
        kind === 'verify'
            ? actions.verifyPrompt
            : kind === 'reject'
              ? actions.rejectPrompt
              : kind === 'waive'
                ? actions.waivePrompt
                : actions.counterPrompt;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={heading}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                // The scale from tokens.css, never a literal.
                zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                background: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-6)',
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-xl, 16px)',
                    width: '100%',
                    maxWidth: 480,
                    padding: 'var(--space-6)',
                    boxShadow: 'var(--shadow-2xl)',
                }}
            >
                <h2
                    style={{
                        margin: '0 0 4px',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                    }}
                >
                    {heading}
                </h2>
                <p
                    style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.55,
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {prompt}
                </p>

                <div
                    style={{
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        borderRadius: 'var(--radius-md, 8px)',
                        background: 'var(--wc-gray-50)',
                        border: '1px solid var(--wc-gray-200)',
                        fontSize: 'var(--text-sm)',
                    }}
                >
                    <strong>{payment.patient}</strong> · {payment.reference}
                    <br />
                    {formatPeso(payment.amountDue)}
                    {payment.remittanceReference &&
                        ` · ref ${payment.remittanceReference}`}
                </div>

                {isCounter && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 'var(--space-3)',
                        }}
                    >
                        <Field label={actions.counterAmountLabel} required>
                            <Input
                                type="number"
                                step="0.01"
                                min="1"
                                inputMode="decimal"
                                value={amount}
                                onChange={(event) =>
                                    setAmount(event.target.value)
                                }
                            />
                        </Field>
                        <Field label={actions.counterReceiptLabel} required>
                            <Input
                                value={receipt}
                                onChange={(event) =>
                                    setReceipt(event.target.value)
                                }
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                                autoComplete="off"
                            />
                        </Field>
                    </div>
                )}

                <Field
                    label={noteRequired ? 'Reason' : 'Note (optional)'}
                    required={noteRequired}
                >
                    <Textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        maxLength={500}
                    />
                </Field>

                {serverError && (
                    <p
                        role="alert"
                        style={{
                            margin: 'var(--space-3) 0 0',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md, 8px)',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            fontSize: 'var(--text-sm)',
                            lineHeight: 1.5,
                        }}
                    >
                        {serverError}
                    </p>
                )}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-4)',
                    }}
                >
                    <Button variant="secondary" onClick={onClose}>
                        {actions.cancel}
                    </Button>
                    <Button onClick={submit} disabled={!canSubmit}>
                        {heading}
                    </Button>
                </div>
            </div>
        </div>
    );
}
