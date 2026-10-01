import { Form } from '@inertiajs/react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { useClipboard } from '@/hooks/use-clipboard';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

/**
 * Recovery codes, styled to sit inside the security card rather than beside it.
 *
 * This used to render its own shadcn Card, which put a card inside the
 * SettingsCard that already wraps it — two borders, two paddings, and a heading
 * repeating the section it was already under.
 *
 * Copy-all is new. The codes were selectable text and nothing else, so the only
 * way to store them was to drag-select eight lines and hope none were missed —
 * on the one screen where missing one means being locked out.
 */
export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const [copiedText, copy] = useClipboard();
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;
    const allCodes = recoveryCodesList.join('\n');
    const copiedAll = copiedText === allCodes && allCodes.length > 0;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const VisibilityIcon = codesAreVisible ? EyeOff : Eye;

    return (
        <div className="wc-settings-stack-sm">
            <p className="wc-settings-note">
                Recovery codes get you back in if you lose the phone with your
                authenticator on it. Store them somewhere other than that phone.
            </p>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={toggleCodesVisibility}
                    className="wc-btn wc-btn-outline wc-btn-md"
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <VisibilityIcon size={16} aria-hidden="true" />
                    {codesAreVisible ? 'Hide' : 'View'} recovery codes
                </button>

                {canRegenerateCodes && (
                    <>
                        <button
                            type="button"
                            onClick={() => copy(allCodes)}
                            className="wc-btn wc-btn-outline wc-btn-md"
                        >
                            {copiedAll ? (
                                <Check size={16} />
                            ) : (
                                <Copy size={16} />
                            )}
                            {copiedAll ? 'Copied' : 'Copy all'}
                        </button>

                        <Form
                            {...regenerateRecoveryCodes.form()}
                            options={{ preserveScroll: true }}
                            onSuccess={fetchRecoveryCodes}
                        >
                            {({ processing }) => (
                                <button
                                    type="submit"
                                    disabled={processing}
                                    aria-describedby="regenerate-warning"
                                    className="wc-btn wc-btn-ghost wc-btn-md"
                                >
                                    <RefreshCw size={16} />
                                    {processing
                                        ? 'Regenerating…'
                                        : 'Regenerate codes'}
                                </button>
                            )}
                        </Form>
                    </>
                )}
            </div>

            <div
                id="recovery-codes-section"
                className={`relative overflow-hidden transition-all duration-300 ${
                    codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'
                }`}
                aria-hidden={!codesAreVisible}
            >
                <div className="wc-settings-stack-sm mt-1">
                    {errors?.length ? (
                        <AlertError errors={errors} />
                    ) : (
                        <>
                            <div
                                ref={codesSectionRef}
                                className="grid gap-1.5 rounded-[var(--radius-2xl)] p-4 sm:grid-cols-2"
                                style={{
                                    background: 'var(--wc-gray-50)',
                                    border: '1.5px solid var(--wc-gray-200)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-sm)',
                                    letterSpacing: '0.04em',
                                }}
                                role="list"
                                aria-label="Recovery codes"
                            >
                                {recoveryCodesList.length
                                    ? recoveryCodesList.map((code, index) => (
                                          <div
                                              key={index}
                                              role="listitem"
                                              className="select-text"
                                              style={{
                                                  color: 'var(--wc-text-primary)',
                                              }}
                                          >
                                              {code}
                                          </div>
                                      ))
                                    : Array.from({ length: 8 }, (_, index) => (
                                          <div
                                              key={index}
                                              className="wc-skeleton"
                                              style={{ height: 16 }}
                                              aria-hidden="true"
                                          />
                                      ))}
                            </div>

                            <div className="wc-alert wc-alert-warning">
                                <span id="regenerate-warning">
                                    Each code works <strong>once</strong> and
                                    disappears after use. Regenerating replaces
                                    every code above — any copy you have saved
                                    stops working immediately.
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
