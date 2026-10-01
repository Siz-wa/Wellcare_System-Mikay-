// resources/js/pages/settings/components/save-bar.tsx

import { Transition } from '@headlessui/react';
import type { ReactElement } from 'react';

interface SaveBarProps {
    processing: boolean;
    recentlySuccessful: boolean;
    label?: string;
    savedLabel?: string;
}

/**
 * The submit row every settings form ends with.
 *
 * `recentlySuccessful` is Inertia's two-second flag, which is the right signal
 * here: a settings save has no navigation to confirm it happened, so without an
 * acknowledgement the page looks identical before and after and people press
 * Save repeatedly.
 */
export function SaveBar({
    processing,
    recentlySuccessful,
    label = 'Save changes',
    savedLabel = 'Saved',
}: SaveBarProps): ReactElement {
    return (
        <div className="wc-settings-actions">
            <button
                type="submit"
                className="wc-btn wc-btn-md wc-btn-primary"
                disabled={processing}
            >
                {processing ? 'Saving…' : label}
            </button>

            <Transition
                show={recentlySuccessful}
                enter="transition ease-in-out"
                enterFrom="opacity-0"
                leave="transition ease-in-out"
                leaveTo="opacity-0"
            >
                <p className="wc-settings-saved" role="status">
                    {savedLabel}
                </p>
            </Transition>
        </div>
    );
}
