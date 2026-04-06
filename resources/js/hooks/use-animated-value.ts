// resources/js/hooks/useAnimatedValue.ts
// ─────────────────────────────────────────────────────────────────────────────
// Animates a number from 0 to `target` over `duration` ms using easeOutQuart.
// Triggered once when `active` flips to true (pairs with useInView).
// Returns the current display value as a formatted string.
//
// Usage:
//   const { ref, inView } = useInView();
//   const count = useAnimatedValue(1284, inView, { duration: 1200 });
//   return <span ref={ref}>{count}</span>

import { useEffect, useRef, useState } from "react";

interface Options {
  /** Animation duration in ms. Default: 1000 */
  duration?: number;
  /** Number of decimal places. Default: 0 */
  decimals?: number;
  /** Optional prefix (e.g. "₱") */
  prefix?: string;
  /** Optional suffix (e.g. "%") */
  suffix?: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function useAnimatedValue(
  target: number,
  active: boolean,
  options: Options = {}
): string {
  const { duration = 1000, decimals = 0, prefix = "", suffix = "" } = options;
  const [current, setCurrent] = useState(0);
  const rafRef                = useRef<number | null>(null);
  const startTimeRef          = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed  = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutQuart(progress);

      setCurrent(eased * target);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration]);

  const formatted = current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${prefix}${formatted}${suffix}`;
}