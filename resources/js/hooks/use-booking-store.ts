// resources/js/pages/generals/book-appointment/hooks/use-booking-store.ts
// ───────────────────────────────────────────────────────────────────────
// Central state for the multi-step booking flow.
// Module-level singleton shared across all components on the same page.

import { useState, useEffect } from 'react';
import type { StepId } from '@/pages/user/book-appointment/sections/bookingdata';

interface BookingStore {
    step: StepId;
    completed: Set<StepId>;
    submitted: boolean;
    goTo: (target: StepId) => void;
    markDone: (s: StepId) => void;
    setSubmitted: (v: boolean) => void;
}

// ── Module-level state ────────────────────────────────────────────────────────

let _step: StepId = 1;
let _completed: Set<StepId> = new Set();
let _submitted: boolean = false;
const _listeners: Set<() => void> = new Set();

function notify() {
    _listeners.forEach((fn) => fn());
}

// ── Reset — call when the booking page unmounts so fresh visits start clean ──

export function resetBookingStore() {
    _step = 1;
    _completed = new Set();
    _submitted = false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBookingStore(): BookingStore {
    const [, setTick] = useState(0);

    // The listener only has to keep one identity for the lifetime of this
    // effect, so it belongs inside it. It previously lived in a ref that was
    // lazily initialised during render — a ref read at render time, which is
    // exactly what React tells you not to do.
    useEffect(() => {
        const listener = () => setTick((n) => n + 1);

        _listeners.add(listener);

        return () => {
            _listeners.delete(listener);
        };
    }, []);

    const goTo = (target: StepId) => {
        _step = target;
        notify();
    };

    const markDone = (s: StepId) => {
        _completed = new Set([..._completed, s]);
        notify();
    };

    const setSubmitted = (v: boolean) => {
        _submitted = v;
        notify();
    };

    return {
        step: _step,
        completed: _completed,
        submitted: _submitted,
        goTo,
        markDone,
        setSubmitted,
    };
}
