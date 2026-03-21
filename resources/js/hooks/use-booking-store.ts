// resources/js/pages/generals/book-appointment/hooks/use-booking-store.ts
// ───────────────────────────────────────────────────────────────────────
// Central state for the multi-step booking flow.
// Module-level singleton shared across all components on the same page.

import { useState, useEffect, useRef } from "react";
import type { StepId }                 from "@/pages/user/book-appointment/sections/bookingdata";

interface BookingStore {
  step:         StepId;
  completed:    Set<StepId>;
  submitted:    boolean;
  goTo:         (target: StepId) => void;
  markDone:     (s: StepId) => void;
  setSubmitted: (v: boolean) => void;
}

// ── Module-level state ────────────────────────────────────────────────────────

let _step:      StepId            = 1;
let _completed: Set<StepId>       = new Set();
let _submitted: boolean           = false;
const _listeners: Set<() => void> = new Set();

function notify() {
  _listeners.forEach((fn) => fn());
}

// ── Reset — call when the booking page unmounts so fresh visits start clean ──

export function resetBookingStore() {
  _step      = 1;
  _completed = new Set();
  _submitted = false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBookingStore(): BookingStore {
  const [, setTick] = useState(0);

  // Use a ref so the listener function identity is stable across renders
  const listenerRef = useRef<() => void>(null);
  if (!listenerRef.current) {
    listenerRef.current = () => setTick((n) => n + 1);
  }

  useEffect(() => {
    const listener = listenerRef.current!;
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
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
    step:      _step,
    completed: _completed,
    submitted: _submitted,
    goTo,
    markDone,
    setSubmitted,
  };
}