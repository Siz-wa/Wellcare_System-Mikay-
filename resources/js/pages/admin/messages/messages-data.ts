// resources/js/pages/admin/messages/messages-data.ts
// Static copy and types for the Contact-page inbox.

export interface ContactMessageRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    receivedAt: string | null;
    handledAt: string | null;
    handledBy: string | null;
}

export interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

export const messagesCopy = {
    activeNavId: 'messages',
    pageTitle: 'Messages',
    pageSubtitle:
        'Enquiries sent through the Contact page. Reply by phone or email, then mark each one handled.',
    showOpen: 'Open',
    showAll: 'All, including handled',
    openLabel: (n: number) => `${n} open`,
    empty: 'No messages here.',
    markHandled: 'Mark handled',
    handledBy: (who: string | null, when: string | null) =>
        `Handled${who ? ` by ${who}` : ''}${when ? ` · ${when}` : ''}`,
    replyEmail: 'Email',
    phoneLabel: 'Phone',
};
