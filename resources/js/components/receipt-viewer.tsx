// resources/js/components/receipt-viewer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A payment receipt opened in the page instead of downloaded.
//
// Shared by the patient (checking the screenshot before and after they send
// it) and the HR officer (reading it against the declared reference). Both
// sides used to get a download prompt, which left a copy of a billing record
// on whatever machine they were using just to glance at one number.
//
// A plain centred dialog at --z-modal, the same shape as DecisionDialog and
// AdminModal. Copy comes in through `labels` so each feature keeps its own
// wording in its *-data.ts file.

import { Download, ExternalLink, FileText, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

export type ReceiptKind = 'image' | 'pdf' | null;

export interface ReceiptViewerLabels {
    close: string;
    download: string;
    openInNewTab: string;
    noPreview: string;
}

export interface ReceiptDetail {
    label: string;
    value: string;
}

interface ReceiptViewerProps {
    title: string;
    fileName: string | null;
    kind: ReceiptKind;
    /** Where the browser can render the file — an inline URL or a blob: URL. */
    src: string;
    /** Omitted for a file not yet uploaded: there is nothing to download. */
    downloadUrl?: string;
    /** What the receipt should be read against, shown beside it. */
    details?: ReceiptDetail[];
    labels: ReceiptViewerLabels;
    onClose: () => void;
}

export function ReceiptViewer({
    title,
    fileName,
    kind,
    src,
    downloadUrl,
    details = [],
    labels,
    onClose,
}: ReceiptViewerProps): ReactElement {
    // Escape closes, registered only while open so a closed viewer does not
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

    const linkStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        color: 'var(--wc-link)',
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-xl, 16px)',
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-2xl)',
                    overflow: 'hidden',
                }}
            >
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4) var(--space-5)',
                        borderBottom: '1px solid var(--wc-gray-200)',
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-lg)',
                                fontWeight: 700,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {title}
                        </h2>
                        {fileName && (
                            <p
                                style={{
                                    margin: '2px 0 0',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-text-muted)',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                {fileName}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={labels.close}
                        style={{
                            flexShrink: 0,
                            display: 'inline-flex',
                            padding: 6,
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--wc-gray-100)',
                            color: 'var(--wc-text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                {details.length > 0 && (
                    <dl
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: 'var(--space-3)',
                            margin: 0,
                            padding: 'var(--space-3) var(--space-5)',
                            background: 'var(--wc-gray-50)',
                            borderBottom: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        {details.map((detail) => (
                            <div key={detail.label}>
                                <dt
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--wc-text-muted)',
                                    }}
                                >
                                    {detail.label}
                                </dt>
                                <dd
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 700,
                                        color: 'var(--wc-text-primary)',
                                        fontVariantNumeric: 'tabular-nums',
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {detail.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        background: 'var(--wc-gray-100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {kind === 'image' && (
                        <img
                            src={src}
                            alt={title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '70vh',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                    {kind === 'pdf' && (
                        <iframe
                            src={src}
                            title={title}
                            style={{
                                width: '100%',
                                height: '70vh',
                                border: 'none',
                                background: '#fff',
                            }}
                        />
                    )}
                    {kind === null && (
                        <p
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                margin: 0,
                                padding: 'var(--space-8) var(--space-5)',
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            <FileText size={18} aria-hidden="true" />
                            {labels.noPreview}
                        </p>
                    )}
                </div>

                <footer
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-5)',
                        flexWrap: 'wrap',
                        padding: 'var(--space-3) var(--space-5)',
                        borderTop: '1px solid var(--wc-gray-200)',
                    }}
                >
                    {/* Phone browsers often will not draw a PDF inside a
                        frame; a new tab hands it to their own viewer. */}
                    {kind !== null && (
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={linkStyle}
                        >
                            <ExternalLink size={14} aria-hidden="true" />
                            {labels.openInNewTab}
                        </a>
                    )}
                    {downloadUrl && (
                        <a href={downloadUrl} style={linkStyle}>
                            <Download size={14} aria-hidden="true" />
                            {labels.download}
                        </a>
                    )}
                </footer>
            </div>
        </div>
    );
}
