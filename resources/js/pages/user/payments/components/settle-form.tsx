// resources/js/pages/user/payments/components/settle-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// What the patient tells the clinic after they have sent the money.
//
// Note what this form does NOT do: it takes no card number, contacts no
// processor, and moves no funds. It records a CLAIM — a channel, an amount and
// a reference the patient read off their own receipt — which a staff member
// then matches against the clinic's statement. That separation is the reason
// the system needs no payment gateway, and it is why submitting here shows
// "being checked" rather than "paid".

import { useForm } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import type { ReceiptKind } from '@/components/receipt-viewer';
import { ReceiptViewer } from '@/components/receipt-viewer';
import { Button, Field, Input, Select } from '@/design-system';
import { store } from '@/routes/user/payments';
import type { PaymentChannel, PaymentRecord } from '../payments-data';
import { formatPeso, paymentsMeta } from '../payments-data';
import { ChannelList } from './channel-list';

interface SettleFormProps {
    payment: PaymentRecord;
    channels: PaymentChannel[];
}

export function SettleForm({
    payment,
    channels,
}: SettleFormProps): ReactElement {
    const { form, receiptViewer } = paymentsMeta;

    /*
     * snake_case field names, deliberately, against the camelCase the rest of
     * the booking forms use.
     *
     * Laravel keys its validation errors by the name of the RULE, and
     * SubmitPaymentRequest's rules are `amount_paid` and
     * `remittance_reference`. A form posting `amountPaid` still validates —
     * prepareForValidation() accepts either spelling — but the error comes back
     * as `errors.amount_paid`, so a camelCase lookup reads undefined and the
     * field silently shows no message. The patient would see their payment
     * refused with nothing on screen marked wrong.
     *
     * booking-form.tsx solves the same problem with a local toCamelCaseKeys()
     * mapper. Matching the server's own spelling is one less moving part.
     */
    const { data, setData, post, processing, errors, reset } = useForm<{
        method: string;
        amount_paid: string;
        remittance_reference: string;
        proof: File | null;
    }>({
        method: '',
        // Pre-filled with what is owed, because that is what the patient sent
        // in all but the rare case — and a mismatch is precisely what the
        // clinic's check is looking for, so it must stay editable.
        amount_paid: payment.amountDue.toFixed(2),
        remittance_reference: '',
        proof: null,
    });

    /*
     * The chosen receipt, shown back before it is sent.
     *
     * A blurry or cropped screenshot is the commonest reason the clinic cannot
     * match a payment, and the patient only learns that hours later from a
     * rejection. Seeing the file here catches it while they still have the
     * receipt open. The blob: URL never leaves the browser; it is revoked as
     * soon as the file is replaced or removed.
     */
    const fileInput = useRef<HTMLInputElement>(null);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [isViewingProof, setIsViewingProof] = useState(false);

    const proofKind: ReceiptKind =
        data.proof?.type === 'application/pdf'
            ? 'pdf'
            : data.proof?.type.startsWith('image/')
              ? 'image'
              : null;

    const chooseProof = (file: File | null) => {
        if (proofUrl) {
            URL.revokeObjectURL(proofUrl);
        }

        setProofUrl(file ? URL.createObjectURL(file) : null);
        setData('proof', file);

        if (!file && fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        // forceFormData: the payload carries a File. Without it Inertia sends
        // JSON and the upload is silently dropped — the request succeeds and
        // the receipt simply never arrives.
        post(store(payment.id).url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                chooseProof(null);
            },
        });
    };

    return (
        <div style={{ borderTop: '1px solid var(--wc-gray-200)' }}>
            <div style={{ padding: 'var(--space-5)' }}>
                <h3
                    style={{
                        margin: '0 0 4px',
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--wc-text-primary)',
                    }}
                >
                    {form.heading}
                </h3>
                <p
                    style={{
                        margin: '0 0 var(--space-4)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.55,
                        color: 'var(--wc-text-muted)',
                    }}
                >
                    {form.preamble}
                </p>

                <div style={{ marginBottom: 'var(--space-5)' }}>
                    <ChannelList channels={channels} />
                </div>

                <form onSubmit={handleSubmit}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 'var(--space-4)',
                        }}
                    >
                        <Field
                            label={form.methodLabel}
                            error={errors.method}
                            required
                        >
                            <Select
                                value={data.method}
                                onChange={(value) => setData('method', value)}
                                options={channels.map((channel) => ({
                                    value: channel.value,
                                    label: channel.label,
                                }))}
                                placeholder="Select a channel"
                            />
                        </Field>

                        <Field
                            label={form.amountLabel}
                            error={errors.amount_paid}
                            required
                        >
                            <Input
                                type="number"
                                step="0.01"
                                min="1"
                                inputMode="decimal"
                                value={data.amount_paid}
                                onChange={(event) =>
                                    setData('amount_paid', event.target.value)
                                }
                            />
                        </Field>
                    </div>

                    <Field
                        label={form.referenceLabel}
                        hint={form.referenceHint}
                        error={errors.remittance_reference}
                        required
                    >
                        <Input
                            value={data.remittance_reference}
                            onChange={(event) =>
                                setData(
                                    'remittance_reference',
                                    event.target.value,
                                )
                            }
                            // The one field the clinic actually searches on.
                            // Tabular figures make a transcription slip visible
                            // to the patient before they submit it.
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                            autoComplete="off"
                        />
                    </Field>

                    <Field
                        label={form.proofLabel}
                        hint={form.proofHint}
                        error={errors.proof}
                    >
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(event) =>
                                chooseProof(event.target.files?.[0] ?? null)
                            }
                            style={{
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-secondary)',
                            }}
                        />

                        {data.proof && proofUrl && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-3)',
                                    border: '1px solid var(--wc-gray-200)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--wc-gray-50)',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsViewingProof(true)}
                                    aria-label={form.proofView}
                                    style={{
                                        flexShrink: 0,
                                        width: 72,
                                        height: 72,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        border: '1px solid var(--wc-gray-200)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: '#fff',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {proofKind === 'image' ? (
                                        <img
                                            src={proofUrl}
                                            alt=""
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <FileText
                                            size={28}
                                            color="var(--wc-text-muted)"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {form.proofPreviewTitle}
                                    </p>
                                    <p
                                        style={{
                                            margin: '2px 0 var(--space-2)',
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: 600,
                                            color: 'var(--wc-text-primary)',
                                            overflowWrap: 'anywhere',
                                        }}
                                    >
                                        {data.proof.name}
                                    </p>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 'var(--space-4)',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsViewingProof(true)
                                            }
                                            style={proofActionStyle}
                                        >
                                            {form.proofView}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => chooseProof(null)}
                                            style={{
                                                ...proofActionStyle,
                                                color: 'var(--wc-text-muted)',
                                            }}
                                        >
                                            {form.proofRemove}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Field>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            flexWrap: 'wrap',
                            marginTop: 'var(--space-4)',
                        }}
                    >
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? form.submitting
                                : payment.status === 'rejected'
                                  ? form.resubmit
                                  : form.submit}
                        </Button>
                        <span
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {formatPeso(payment.amountDue)} —{' '}
                            {payment.reference}
                        </span>
                    </div>
                </form>
            </div>

            {isViewingProof && data.proof && proofUrl && (
                <ReceiptViewer
                    title={form.proofPreviewTitle}
                    fileName={data.proof.name}
                    kind={proofKind}
                    src={proofUrl}
                    labels={receiptViewer}
                    onClose={() => setIsViewingProof(false)}
                />
            )}
        </div>
    );
}

const proofActionStyle: React.CSSProperties = {
    padding: 0,
    border: 'none',
    background: 'none',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--wc-link)',
    textDecoration: 'underline',
    cursor: 'pointer',
};
