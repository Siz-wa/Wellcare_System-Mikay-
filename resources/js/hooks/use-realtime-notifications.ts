// resources/js/hooks/use-realtime-notifications.ts
//
// Refresh the bell the moment a notification is written for this user.
//
// The server broadcasts `notification.created` on the user's private channel
// (App\Events\NotificationCreated). The event carries no content; this answers
// it by reloading only the shared `notifications` and `unreadCount` props, so
// what the bell shows still comes through the same scoped page payload.

import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import type { ReverbConfig } from '@/lib/echo';
import { getEcho } from '@/lib/echo';

function csrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

/**
 * @param userId  the signed-in user, or null for a guest
 * @param config  the browser-facing Reverb address, or null when off
 * @param pageUrl re-subscribes after navigation. A video room tears the shared
 *                Echo connection down on leaving, which drops this listener.
 */
export function useRealtimeNotifications(
    userId: number | null | undefined,
    config: ReverbConfig | null | undefined,
    pageUrl: string,
): void {
    useEffect(() => {
        if (!userId || !config?.key || !config.host) {
            return;
        }

        const channelName = `App.Models.User.${userId}`;

        try {
            const echo = getEcho(config, csrfToken());
            const channel = echo.private(channelName);

            channel.listen('.notification.created', () => {
                router.reload({
                    only: ['notifications', 'unreadCount'],
                });
            });

            return () => {
                channel.stopListening('.notification.created');
            };
        } catch (err) {
            // Live refresh is a convenience; the bell still updates on the
            // next page load, so a socket problem must never break the page.
            console.warn('notifications: live updates unavailable', err);

            return undefined;
        }
    }, [
        userId,
        config?.key,
        config?.host,
        config?.port,
        config?.scheme,
        config,
        pageUrl,
    ]);
}
