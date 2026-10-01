import { createInertiaApp } from '@inertiajs/react';
import axios from 'axios';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../css/app.css';
import { initializeTypographyPreferences } from '@/hooks/use-typography-preferences';

// Must run before any request goes out. Import order is hoisted in ESM, so
// these statements execute after every import regardless of placement.
axios.defaults.headers.common['ngrok-skip-browser-warning'] = '69420';
axios.defaults.withCredentials = true;

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <StrictMode>
                <TooltipProvider delayDuration={0}>
                    <App {...props} />
                </TooltipProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#00b7ff',
        includeCSS: true,
    },
});

// Text size and contrast are already stamped on <html> server-side from the
// cookie; this re-syncs from localStorage for the case where the cookie was
// dropped but the device preference survived.
initializeTypographyPreferences();
