// resources/js/pages/generals/book-appointment/components/time-slot-picker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Grid of clickable time slot buttons.
// Highlights the currently selected slot.

import type { ReactElement } from 'react';

interface TimeSlotPickerProps {
    slots: string[];
    value: string;
    onChange: (slot: string) => void;
}

export function TimeSlotPicker({
    slots,
    value,
    onChange,
}: TimeSlotPickerProps): ReactElement {
    return (
        // Two columns on a phone, four from `sm` up.
        //
        // This was a flat `repeat(4, 1fr)`. On a 390px handset that is a 79px
        // column, and the label it has to hold is "10:30 AM" — so every slot
        // either clipped or wrapped mid-time, on the one control in the whole
        // booking flow the patient cannot avoid touching.
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {slots.map((slot) => {
                const active = value === slot;

                return (
                    <button
                        key={slot}
                        type="button"
                        onClick={() => onChange(slot)}
                        // `min-h-11` is 44px: the size Apple and Material both
                        // settle on, and the point below which mis-taps climb
                        // sharply. Padding alone left these at 36px.
                        className="min-h-11"
                        style={{
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-lg)',
                            border: `1.5px solid ${active ? 'var(--wc-blue-600)' : 'var(--wc-gray-200)'}`,
                            background: active
                                ? 'var(--wc-blue-50)'
                                : 'var(--wc-white)',
                            color: active
                                ? 'var(--wc-blue-600)'
                                : 'var(--wc-gray-600)',
                            fontWeight: active ? 700 : 400,
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            transition:
                                'all var(--duration-base) var(--ease-out)',
                            boxShadow: active
                                ? '0 0 0 3px rgba(0,86,179,0.1)'
                                : 'none',
                        }}
                    >
                        {slot}
                    </button>
                );
            })}
        </div>
    );
}
