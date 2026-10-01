// resources/js/pages/user/dashboard/components/stat-tile.tsx

import type { ReactElement, ReactNode } from 'react';

interface StatTileProps {
    value: number;
    label: string;
    color: string;
    icon: ReactNode;
}

export function StatTile({
    value,
    label,
    color,
    icon,
}: StatTileProps): ReactElement {
    return (
        // Two of these share a 358px row on a phone, so the icon gives back
        // 6px there and the label keeps it.
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-wc-gray-200 bg-white p-3 sm:gap-3 sm:p-4">
            <span
                aria-hidden="true"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-white sm:size-[42px]"
                style={{
                    background: color,
                    boxShadow: `0 4px 12px -3px ${color}66`,
                }}
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block font-display text-xl leading-none font-extrabold tracking-tighter text-ink sm:text-2xl">
                    {value}
                </span>
                <span className="mt-[3px] block text-xs font-semibold text-ink-muted">
                    {label}
                </span>
            </span>
        </div>
    );
}
