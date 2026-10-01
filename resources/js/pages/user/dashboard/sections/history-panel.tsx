// resources/js/pages/user/dashboard/sections/history-panel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Finished visits, slid in over the board. Grouped by the person seen and
// colour-matched to the board's avatars, so a family's history stays separable.

import { ChevronDown, ChevronRight, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { RecordDetail } from '../components/record-detail';
import { StatusBadge } from '../components/status-badge';
import type { PastRecord, PatientGroup } from '../dashboard-data';
import { avatarColor, dashboardCopy } from '../dashboard-data';

interface HistoryPanelProps {
    groups: PatientGroup[];
    onClose: () => void;
}

export function HistoryPanel({
    groups,
    onClose,
}: HistoryPanelProps): ReactElement {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<PastRecord | null>(null);
    const [expanded, setExpanded] = useState<string | null>(
        groups.length === 1 ? groups[0].key : null,
    );

    useEffect(() => {
        const t = setTimeout(() => setOpen(true), 10);

        return () => clearTimeout(t);
    }, []);

    // Escape closes the panel — it covers the page, so the keyboard needs a
    // way out that is not "find the small × in the corner".
    useEffect(() => {
        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
                setTimeout(onClose, 300);
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function close(): void {
        setOpen(false);
        setTimeout(onClose, 300);
    }

    const totalRecords = groups.reduce((sum, g) => sum + g.records.length, 0);

    return (
        <>
            <button
                type="button"
                aria-label="Close history"
                onClick={close}
                style={{
                    position: 'fixed',
                    inset: 0,
                    // Was a bare 499, which is under the fixed bottom tab bar
                    // at --z-nav. Both layers belong on the documented scale.
                    zIndex: 'var(--z-modal)',
                    border: 'none',
                    background: 'rgba(15,23,42,0.3)',
                    backdropFilter: 'blur(2px)',
                    opacity: open ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            />

            <aside
                aria-label={dashboardCopy.history.title}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 'var(--z-modal)',
                    // `min()` does what the `isMobile` branch did, one frame
                    // earlier and without a hydration pass.
                    width: 'min(460px, 100%)',
                    background: '#fff',
                    borderLeft: '1px solid var(--wc-gray-100)',
                    boxShadow: '-12px 0 40px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                    overflow: 'hidden',
                }}
            >
                {selected && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: '#fff',
                            zIndex: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <RecordDetail
                            record={selected}
                            onBack={() => setSelected(null)}
                        />
                    </div>
                )}

                <header
                    style={{
                        padding: '20px var(--space-6)',
                        borderBottom: '1px solid var(--wc-gray-100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}
                >
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--text-base)',
                                fontWeight: 800,
                                color: 'var(--wc-text-primary)',
                            }}
                        >
                            {dashboardCopy.history.title}
                        </p>
                        <p
                            style={{
                                margin: '2px 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {totalRecords}{' '}
                            {totalRecords === 1 ? 'visit' : 'visits'} across{' '}
                            {groups.length}{' '}
                            {groups.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="wc-btn wc-btn-ghost wc-btn-sm wc-btn-icon"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {groups.length === 0 ? (
                        <p
                            style={{
                                padding: 'var(--space-12)',
                                textAlign: 'center',
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-text-muted)',
                            }}
                        >
                            {dashboardCopy.history.emptyBody}
                        </p>
                    ) : (
                        groups.map((group) => {
                            const isExpanded = expanded === group.key;
                            const color = avatarColor(group.key);

                            return (
                                <section
                                    key={group.key}
                                    style={{
                                        borderBottom:
                                            '1px solid var(--wc-gray-100)',
                                    }}
                                >
                                    <button
                                        type="button"
                                        aria-expanded={isExpanded}
                                        onClick={() =>
                                            setExpanded(
                                                isExpanded ? null : group.key,
                                            )
                                        }
                                        style={{
                                            width: '100%',
                                            padding:
                                                'var(--space-4) var(--space-6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-3)',
                                            background: isExpanded
                                                ? 'var(--wc-gray-50)'
                                                : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="wc-who-avatar wc-who-avatar--lg"
                                            style={{
                                                background: color.bg,
                                                color: color.fg,
                                            }}
                                        >
                                            {group.initials}
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span className="wc-who-name">
                                                    {group.patient}
                                                </span>
                                                {group.relation && (
                                                    <span className="wc-who-rel">
                                                        {group.relation}
                                                    </span>
                                                )}
                                            </span>
                                            <span
                                                style={{
                                                    display: 'block',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--wc-text-muted)',
                                                    marginTop: 1,
                                                }}
                                            >
                                                {group.records.length}{' '}
                                                {group.records.length === 1
                                                    ? 'visit'
                                                    : 'visits'}
                                            </span>
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            aria-hidden="true"
                                            style={{
                                                color: 'var(--wc-text-muted)',
                                                flexShrink: 0,
                                                transform: isExpanded
                                                    ? 'rotate(180deg)'
                                                    : 'none',
                                                transition:
                                                    'transform 0.2s ease',
                                            }}
                                        />
                                    </button>

                                    {isExpanded && (
                                        <ul
                                            style={{
                                                listStyle: 'none',
                                                margin: 0,
                                                padding: 0,
                                            }}
                                        >
                                            {group.records.map((record) => (
                                                <li key={record.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelected(record)
                                                        }
                                                        style={{
                                                            width: '100%',
                                                            padding:
                                                                'var(--space-3) var(--space-6)',
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 'var(--space-3)',
                                                            background:
                                                                'transparent',
                                                            border: 'none',
                                                            borderTop:
                                                                '1px solid var(--wc-gray-100)',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontFamily:
                                                                'inherit',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display:
                                                                        'block',
                                                                    fontSize:
                                                                        'var(--text-sm)',
                                                                    fontWeight: 700,
                                                                    color: 'var(--wc-text-primary)',
                                                                }}
                                                            >
                                                                {record.service}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    gap: 6,
                                                                    marginTop: 2,
                                                                    fontSize:
                                                                        'var(--text-xs)',
                                                                    color: 'var(--wc-text-muted)',
                                                                }}
                                                            >
                                                                {record.date} ·{' '}
                                                                {record.time}
                                                                {record.soap && (
                                                                    <span
                                                                        style={{
                                                                            display:
                                                                                'inline-flex',
                                                                            alignItems:
                                                                                'center',
                                                                            gap: 3,
                                                                            color: 'var(--wc-blue-600)',
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        <FileText
                                                                            size={
                                                                                11
                                                                            }
                                                                            aria-hidden="true"
                                                                        />
                                                                        Notes
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </span>
                                                        <StatusBadge
                                                            status={
                                                                record.status
                                                            }
                                                        />
                                                        <ChevronRight
                                                            size={14}
                                                            aria-hidden="true"
                                                            style={{
                                                                color: 'var(--wc-gray-300)',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            );
                        })
                    )}
                </div>
            </aside>
        </>
    );
}
