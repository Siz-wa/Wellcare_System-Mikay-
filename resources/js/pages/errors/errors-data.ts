// resources/js/pages/errors/errors-data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Copy for the branded error page. Nothing here is derived from the exception:
// the server deliberately sends only a status code (see withExceptions in
// bootstrap/app.php), because an exception message can carry a file path, a SQL
// fragment or a class name, and this page renders to whoever hit the error.

export interface ErrorCopy {
    title: string;
    message: string;
    /** Shown under the message when there is something specific to try. */
    hint?: string;
}

export const errorCopy: Record<number, ErrorCopy> = {
    403: {
        title: 'You do not have access to this page',
        message:
            'Your account is signed in, but this page belongs to a different role at the clinic.',
        hint: 'If you think you should have access, ask the clinic administrator to check your account role.',
    },
    404: {
        title: 'We could not find that page',
        message:
            'The link may be out of date, or the page may have been moved.',
        hint: 'Check the address, or head back to your dashboard.',
    },
    429: {
        title: 'Too many requests',
        message:
            'You have made a lot of requests in a short time, so we have paused them briefly.',
        hint: 'Wait a minute and try again.',
    },
    500: {
        title: 'Something went wrong on our end',
        message:
            'This is a fault in the system, not something you did. The error has been logged.',
        hint: 'Try again in a moment. If it keeps happening, tell the clinic what you were doing when it appeared.',
    },
    503: {
        title: 'WellCare is briefly unavailable',
        message: 'The system is down for maintenance and will be back shortly.',
        hint: 'No appointment data is affected — nothing has been lost.',
    },
};

export const fallbackCopy: ErrorCopy = {
    title: 'Something went wrong',
    message: 'The page could not be loaded.',
};

export const errorMeta = {
    brand: 'WellCare Clinics & Laboratory',
    homeLabel: 'Go to home page',
    dashboardLabel: 'Go to my dashboard',
    backLabel: 'Go back',
};
