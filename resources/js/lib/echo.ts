import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/**
 * Lazy Echo singleton for the consultation room.
 *
 * Created on first use, never at module scope. Three reasons, all of which bite
 * in this codebase specifically:
 *
 *  1. `resources/js/ssr.tsx` renders pages on the server. A `new Echo(...)` at
 *     module level runs during `npm run build:ssr` and dies on `window` /
 *     `WebSocket`. `composer dev` never exercises that build, so it would stay
 *     invisible until a deploy.
 *  2. Only two pages in the whole app need a socket. Opening one on every page
 *     load would keep a WebSocket alive for every patient reading lab results.
 *  3. Config arrives as an Inertia page prop rather than `import.meta.env`, so
 *     it does not exist yet when this module is first imported.
 */

export interface ReverbConfig {
    key: string;
    host: string;
    port: number;
    scheme: string;
}

type EchoInstance = InstanceType<typeof Echo>;

let instance: EchoInstance | null = null;

/**
 * @param csrfToken The token from the page props. Required, and it must not be
 *   defaulted: left to itself laravel-echo reads
 *   `meta[name="csrf-token"]`, which Inertia never re-renders after the first
 *   full document load. Once login regenerates the session token that tag is
 *   stale, /broadcasting/auth answers 419, the private channel never
 *   subscribes, and the call fails with nothing logged server-side.
 */
export function getEcho(config: ReverbConfig, csrfToken: string): EchoInstance {
    if (instance) {
        return instance;
    }

    // laravel-echo reaches for a global Pusher rather than importing it.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'reverb',
        // Checked ahead of the meta tag by Echo's csrfToken(), so this wins.
        csrfToken,
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        // Reverb speaks the Pusher protocol over WebSocket only. Leaving the
        // default list in place lets it silently fall back to XHR polling,
        // which "works" and then adds seconds of latency to ICE candidates.
        enabledTransports: ['ws', 'wss'],
    });

    return instance;
}

/**
 * Drop the singleton and its socket.
 *
 * Called when the last room page unmounts. Without it the WebSocket outlives
 * the consultation and Reverb keeps a subscriber on a channel nobody is in.
 */
export function teardownEcho(): void {
    if (!instance) {
        return;
    }

    instance.disconnect();
    instance = null;
}
