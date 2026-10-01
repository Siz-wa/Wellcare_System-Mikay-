// resources/js/pages/errors/index.tsx

import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactElement } from 'react';
import type { PageProps } from '@/types';
import { errorCopy, errorMeta, fallbackCopy } from './errors-data';

interface PageData extends PageProps {
    status: number;
    previousUrl?: string;
}

/**
 * The branded error page for 403 / 404 / 429 / 500 / 503.
 *
 * Renders standalone rather than inside a role layout: a 500 can be thrown from
 * inside the very middleware that builds the layout's shared props, and an
 * error page that itself depends on that data is an error page that can fail to
 * render. Everything below reads from two props and a static copy map.
 */
export default function ErrorPage({
    status,
    previousUrl,
}: PageData): ReactElement {
    const { auth } = usePage<PageProps>().props;
    const copy = errorCopy[status] ?? fallbackCopy;
    const isSignedIn = Boolean(auth?.user);

    return (
        <div className="wc-error-page">
            <Head title={`${status} — ${copy.title}`} />

            <main id="main-content" className="wc-error-panel">
                <p className="wc-error-brand">{errorMeta.brand}</p>

                <p className="wc-error-status" aria-hidden="true">
                    {status}
                </p>

                <h1 className="wc-error-title">{copy.title}</h1>
                <p className="wc-error-message">{copy.message}</p>
                {copy.hint && <p className="wc-error-hint">{copy.hint}</p>}

                <div className="wc-error-actions">
                    {isSignedIn ? (
                        <Link
                            href="/dashboard"
                            className="wc-btn wc-btn-md wc-btn-primary"
                        >
                            {errorMeta.dashboardLabel}
                        </Link>
                    ) : (
                        <Link
                            href="/"
                            className="wc-btn wc-btn-md wc-btn-primary"
                        >
                            {errorMeta.homeLabel}
                        </Link>
                    )}

                    {/*
                      A plain anchor to the previous URL rather than
                      history.back(): the browser's back button would return to
                      the request that just failed, so an unrecoverable 500
                      would loop. The server sends url()->previous(), which is
                      the page before that one.
                    */}
                    {previousUrl && (
                        <a
                            href={previousUrl}
                            className="wc-btn wc-btn-md wc-btn-outline"
                        >
                            {errorMeta.backLabel}
                        </a>
                    )}
                </div>
            </main>
        </div>
    );
}
