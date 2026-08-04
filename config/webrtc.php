<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ICE servers for the virtual consultation room
    |--------------------------------------------------------------------------
    |
    | Shaped into the RTCIceServer[] that RTCPeerConnection expects and handed
    | to the browser as an Inertia prop, never hardcoded in the bundle. The
    | reason is deployment, not tidiness: WELLCARE-BUILD-PLAN.md §12 risk 2 is
    | answered but not closed. The 2026-08-03 two-device run traversed both NATs
    | on STUN alone (`srflx <-> srflx (udp)`, held 4m 5s), so TURN is insurance
    | rather than a prerequisite — but the ~10-20% of connections behind
    | symmetric NAT still need a relay, and that population is by definition not
    | the pair that was tested.
    |
    | Keeping this in config means adding coturn later is four env values and a
    | page reload, not a code change, a rebuild and a redeploy.
    |
    | STUN tells a peer its own public address. TURN forwards the media when the
    | peers cannot reach each other directly, so it costs bandwidth and is only
    | ever a fallback — ICE prefers a direct path whenever one exists, which is
    | exactly what the spike observed with a relay configured and unused.
    |
    */

    'stun_urls' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('WEBRTC_STUN_URLS', 'stun:stun.l.google.com:19302'))
    ))),

    'turn_urls' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('WEBRTC_TURN_URLS', ''))
    ))),

    'turn_username' => env('WEBRTC_TURN_USERNAME'),

    'turn_credential' => env('WEBRTC_TURN_CREDENTIAL'),

];
