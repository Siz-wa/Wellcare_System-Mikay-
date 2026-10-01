import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

/**
 * Whether the person reading this page is allowed to book an appointment.
 *
 * `/book` and every appointment route behind it are gated `role:user` in
 * routes/web.php, so a doctor, nurse, HR officer or administrator who clicks a
 * "Book Appointment" button on a public page is answered with a 403. The button
 * was shown to them on every one of those pages regardless — the marketing
 * pages are the same pages whether or not somebody is signed in, and nothing on
 * them asked who was reading.
 *
 * A guest counts as able to book: they are sent to log in and continue, which
 * is the funnel those buttons exist for. Only a staff account, which cannot
 * reach the page at all, is refused it here.
 */
export function useCanBook(): boolean {
    const user = usePage<PageProps>().props.auth?.user;

    if (!user) {
        return true;
    }

    return (user.roles ?? []).includes('user');
}
