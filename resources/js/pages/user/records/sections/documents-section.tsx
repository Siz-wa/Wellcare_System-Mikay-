// resources/js/pages/user/records/sections/documents-section.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Download links are plain anchors, not Inertia <Link>s — the response is a
// file stream, so client-side navigation would try to parse it as a page.

import { Download, FileText } from 'lucide-react';
import type { ReactElement } from 'react';
import { SectionShell } from '../components/section-shell';
import type { RecordDocument } from '../records-data';
import { documentTypeLabels, recordsMeta } from '../records-data';

interface DocumentsSectionProps {
    documents: RecordDocument[];
}

export function DocumentsSection({
    documents,
}: DocumentsSectionProps): ReactElement {
    const { labels, sections, empty } = recordsMeta;

    return (
        <SectionShell
            title={sections.documents}
            icon={<FileText size={17} strokeWidth={1.8} />}
            accent="#0891b2"
            count={documents.length}
            isEmpty={documents.length === 0}
            emptyText={empty.documents}
        >
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
                {documents.map((doc) => (
                    <li
                        key={doc.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 10,
                            border: '1px solid var(--wc-gray-200)',
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: 'var(--wc-gray-900)',
                                }}
                            >
                                {doc.title}
                            </p>
                            <p
                                style={{
                                    margin: '2px 0 0',
                                    fontSize: 12,
                                    color: 'var(--wc-gray-500)',
                                }}
                            >
                                {documentTypeLabels[doc.type]} · {doc.size} ·{' '}
                                {doc.uploadedAt}
                            </p>
                        </div>

                        <a
                            href={doc.downloadUrl}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--wc-gray-300)',
                                color: 'var(--wc-blue-600)',
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: 'none',
                                flexShrink: 0,
                            }}
                        >
                            <Download size={14} strokeWidth={1.8} />
                            {labels.download}
                        </a>
                    </li>
                ))}
            </ul>
        </SectionShell>
    );
}
