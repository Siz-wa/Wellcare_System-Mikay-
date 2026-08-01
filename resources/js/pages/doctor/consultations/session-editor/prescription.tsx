// resources/js/pages/user/consultations/components/session-editor/prescription.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Prescription tab — medication list with add / remove functionality.

import { useState } from 'react';
import type { ReactElement } from 'react';
import { IconXSmall, IconCheck } from '../../icons';
import { consultationsMeta } from '../consultations-data';
import type { Medication } from '../consultations-data';
interface PrescriptionProps {
    medications: Medication[];
    onAdd: (med: Medication) => void;
    onRemove: (id: string) => void;
}

export function Prescription({
    medications,
    onAdd,
    onRemove,
}: PrescriptionProps): ReactElement {
    const meta = consultationsMeta;

    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newInstr, setNewInstr] = useState('');

    function handleAdd(): void {
        if (!newName.trim()) {
return;
}

        onAdd({
            id: `med-${Date.now()}`,
            name: newName.trim(),
            instructions: newInstr.trim(),
        });
        setNewName('');
        setNewInstr('');
        setShowForm(false);
    }

    function handleCancel(): void {
        setNewName('');
        setNewInstr('');
        setShowForm(false);
    }

    return (
        <div style={{ flex: 1 }}>
            {/* Medication list card */}
            <div
                style={{
                    borderRadius: 'var(--radius-2xl)',
                    border: '1px solid var(--wc-gray-200)',
                    background: 'var(--wc-white)',
                    overflow: 'hidden',
                }}
            >
                {/* List header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-4) var(--space-5)',
                        borderBottom:
                            medications.length > 0 || showForm
                                ? '1px solid var(--wc-gray-100)'
                                : 'none',
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--wc-dark)',
                        }}
                    >
                        {meta.medicationListTitle}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--wc-blue-600)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                            padding: 0,
                        }}
                    >
                        {meta.addMedicineLabel}
                    </button>
                </div>

                {/* Medication rows */}
                {medications.map((med) => (
                    <div
                        key={med.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-4) var(--space-5)',
                            borderBottom: '1px solid var(--wc-gray-100)',
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    color: 'var(--wc-dark)',
                                    lineHeight: 1.3,
                                }}
                            >
                                {med.name}
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--wc-gray-400)',
                                    lineHeight: 1.3,
                                }}
                            >
                                {med.instructions}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(med.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 'var(--radius-full)',
                                border: 'none',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition:
                                    'background var(--duration-fast) var(--ease-out)',
                            }}
                        >
                            <IconXSmall />
                        </button>
                    </div>
                ))}

                {/* Add new medicine inline form */}
                {showForm && (
                    <div
                        style={{
                            padding: 'var(--space-4) var(--space-5)',
                            borderBottom: '1px solid var(--wc-gray-100)',
                        }}
                    >
                        <input
                            type="text"
                            className="wc-input"
                            placeholder={meta.newMedNamePlaceholder}
                            value={newName}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setNewName(e.target.value)}
                            style={{
                                marginBottom: 'var(--space-2)',
                                fontSize: 'var(--text-sm)',
                            }}
                        />
                        <input
                            type="text"
                            className="wc-input"
                            placeholder={meta.newMedInstrPlaceholder}
                            value={newInstr}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setNewInstr(e.target.value)}
                            style={{
                                marginBottom: 'var(--space-3)',
                                fontSize: 'var(--text-sm)',
                            }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                onClick={handleAdd}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    background: 'var(--wc-blue-600)',
                                    color: '#ffffff',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                <IconCheck /> Add
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                style={{
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--wc-gray-200)',
                                    background: 'var(--wc-white)',
                                    color: 'var(--wc-gray-500)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {medications.length === 0 && !showForm && (
                    <div
                        style={{
                            padding: 'var(--space-8)',
                            textAlign: 'center',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--text-sm)',
                                color: 'var(--wc-gray-400)',
                            }}
                        >
                            No medications added yet.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
