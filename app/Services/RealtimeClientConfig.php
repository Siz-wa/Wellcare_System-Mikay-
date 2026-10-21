<?php

namespace App\Services;

/**
 * What a browser needs to open the realtime socket, for whichever broadcaster
 * BROADCAST_CONNECTION selects.
 *
 * Reverb runs beside the app wherever a long-running process is allowed. Shared
 * hosting allows none, so there the same Pusher protocol is served by hosted
 * Pusher instead — same channels, same /broadcasting/auth, same events. Only
 * the address the browser dials changes, and this is the one place that knows
 * it. The consultation rooms and the notification bell used to each read
 * `reverb.apps.apps.0` directly.
 *
 * Always the browser-facing address, never the server's own (see
 * config/broadcasting.php on REVERB_INTERNAL_HOST).
 */
final class RealtimeClientConfig
{
    /**
     * Whether any socket is configured at all. False under `null` and `log`,
     * where there is nothing for a browser to connect to.
     */
    public static function enabled(): bool
    {
        return in_array(config('broadcasting.default'), ['reverb', 'pusher'], true);
    }

    /**
     * @return array{broadcaster: string, key: ?string, cluster: string, host: ?string, port: int, scheme: ?string}
     */
    public static function forBrowser(): array
    {
        if (config('broadcasting.default') === 'pusher') {
            $cluster = (string) config('broadcasting.connections.pusher.options.cluster');

            return [
                'broadcaster' => 'pusher',
                'key' => config('broadcasting.connections.pusher.key'),
                'cluster' => $cluster,
                'host' => "ws-{$cluster}.pusher.com",
                'port' => 443,
                'scheme' => 'https',
            ];
        }

        return [
            'broadcaster' => 'reverb',
            'key' => config('reverb.apps.apps.0.key'),
            'cluster' => '',
            'host' => config('reverb.apps.apps.0.options.host'),
            'port' => (int) config('reverb.apps.apps.0.options.port'),
            'scheme' => config('reverb.apps.apps.0.options.scheme'),
        ];
    }
}
