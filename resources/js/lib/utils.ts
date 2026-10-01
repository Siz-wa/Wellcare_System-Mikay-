import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** `1 visit`, `2 visits`, `0 visits`. */
export function plural(
    count: number,
    singular: string,
    pluralForm?: string,
): string {
    return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}
