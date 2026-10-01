// resources/js/pages/admin/messages/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The inbox for the public Contact form. Composition only.

import { Link, router } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { Badge, Button, Card, CardBody } from '@/design-system';
import { AdminFlash } from '@/pages/admin/components/admin-flash';
import { AdminPageHeader } from '@/pages/admin/components/admin-page-header';
import { AdminDashboardLayout } from '@/pages/admin/layout/admin-dashboard-layout';
import { messagesCopy } from '@/pages/admin/messages/messages-data';
import type {
    ContactMessageRow,
    Paginated,
} from '@/pages/admin/messages/messages-data';
import { handle } from '@/routes/admin/messages';
import type { PageProps } from '@/types';

interface PageData extends PageProps {
    messages: Paginated<ContactMessageRow>;
    showHandled: boolean;
    openCount: number;
}

export default function AdminMessagesPage({
    messages,
    showHandled,
    openCount,
}: PageData): ReactElement {
    const copy = messagesCopy;

    return (
        <AdminDashboardLayout activeId={copy.activeNavId}>
            <AdminPageHeader
                title={copy.pageTitle}
                subtitle={copy.pageSubtitle}
            />

            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--space-5)',
                }}
            >
                <Link href="/admin/messages" preserveScroll>
                    <Button
                        size="sm"
                        variant={showHandled ? 'ghost' : 'primary'}
                    >
                        {copy.showOpen}
                    </Button>
                </Link>
                <Link href="/admin/messages?handled=1" preserveScroll>
                    <Button
                        size="sm"
                        variant={showHandled ? 'primary' : 'ghost'}
                    >
                        {copy.showAll}
                    </Button>
                </Link>
                <Badge>{copy.openLabel(openCount)}</Badge>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {messages.data.length === 0 && (
                    <Card>
                        <CardBody>{copy.empty}</CardBody>
                    </Card>
                )}

                {messages.data.map((m) => (
                    <Card key={m.id}>
                        <CardBody>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-3)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 700 }}>
                                        {m.subject}
                                    </p>
                                    <p
                                        style={{
                                            margin: '2px 0 0',
                                            fontSize: 'var(--text-sm)',
                                            color: 'var(--wc-text-muted)',
                                        }}
                                    >
                                        {m.name} · {copy.replyEmail}{' '}
                                        <span style={{ userSelect: 'all' }}>
                                            {m.email}
                                        </span>
                                        {m.phone
                                            ? ` · ${copy.phoneLabel} ${m.phone}`
                                            : ''}{' '}
                                        · {m.receivedAt}
                                    </p>
                                </div>
                                {m.handledAt ? (
                                    <Badge variant="success">
                                        {copy.handledBy(
                                            m.handledBy,
                                            m.handledAt,
                                        )}
                                    </Badge>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            router.post(
                                                handle.url(m.id),
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {copy.markHandled}
                                    </Button>
                                )}
                            </div>
                            <p
                                style={{
                                    margin: 'var(--space-3) 0 0',
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'anywhere',
                                }}
                            >
                                {m.message}
                            </p>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <AdminFlash />
        </AdminDashboardLayout>
    );
}
