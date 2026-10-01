// resources/js/pages/admin/services/components/service-form.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Create / edit one bookable service.
//
// The same form for both, because they differ in exactly two ways: where it
// posts, and whether the slug is editable. Splitting it in two would duplicate
// eleven fields to express that.

import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactElement } from 'react';
import { Button, Check, Field, Input, Select, Textarea } from '@/design-system';
import {
    servicesCopy,
    sexOptions,
    slugify,
} from '@/pages/admin/services/services-data';
import type {
    AdminServiceRow,
    SpecialtyOption,
} from '@/pages/admin/services/services-data';

interface ServiceFormProps {
    /** The row being edited, or null to create a new service. */
    service: AdminServiceRow | null;
    specialties: SpecialtyOption[];
    /** Highest sort_order in the catalogue, so a new service lands last. */
    nextSortOrder: number;
    onDone: () => void;
}

export function ServiceForm({
    service,
    specialties,
    nextSortOrder,
    onDone,
}: ServiceFormProps): ReactElement {
    const editing = service !== null;

    // `specialties: []` in form state always, with null reconstructed
    // server-side from an empty selection. A tri-state checkbox group (null vs
    // [] vs [..]) has no third visual state to show for it, and the controller
    // documents the collapse.
    const { data, setData, post, put, processing, errors } = useForm({
        name: service?.name ?? '',
        slug: service?.slug ?? '',
        description: service?.description ?? '',
        specialties: service?.specialties ?? [],
        requires_in_person: service?.requiresInPerson ?? false,
        restricted_to_sex: service?.restrictedToSex ?? '',
        max_age: service?.maxAge === null ? '' : String(service?.maxAge ?? ''),
        min_age: service?.minAge == null ? '' : String(service.minAge),
        // Blank, never '0'. Blank means "not offered over video" and is what
        // the server stores as NULL; a zero would mean the clinic has decided
        // this consultation is free, which is a per-patient waiver decision
        // and not a price. See SaveServiceRequest.
        virtual_fee:
            service?.virtualFee === null
                ? ''
                : String(service?.virtualFee ?? ''),
        is_active: service?.isActive ?? true,
        sort_order: String(service?.sortOrder ?? nextSortOrder),
    });

    // Renaming a slug with appointments against it strands them — see
    // SaveServiceRequest. The server refuses it either way; this is what stops
    // an administrator from typing into a field that cannot be saved.
    const slugLocked = editing && service.bookings > 0;

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: onDone };

        if (editing) {
            put(`/admin/services/${service.id}`, options);
        } else {
            post('/admin/services', options);
        }
    };

    const toggleSpecialty = (value: string) => {
        setData(
            'specialties',
            data.specialties.includes(value)
                ? data.specialties.filter((s) => s !== value)
                : [...data.specialties, value],
        );
    };

    const digitsOnly = (value: string, max: number) =>
        value.replace(/[^0-9]/g, '').slice(0, max);

    return (
        <form onSubmit={submit}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                }}
            >
                <Field label="Name" required error={errors.name}>
                    <Input
                        value={data.name}
                        maxLength={100}
                        placeholder="e.g. Dental Consultation"
                        onChange={(e) => {
                            setData('name', e.target.value);

                            // Only while the slug is still free AND untouched
                            // by hand: typing a name should offer a slug, never
                            // overwrite one somebody deliberately chose.
                            if (
                                !editing &&
                                (data.slug === '' ||
                                    data.slug === slugify(data.name))
                            ) {
                                setData('slug', slugify(e.target.value));
                            }
                        }}
                        error={Boolean(errors.name)}
                    />
                </Field>

                <Field
                    label="Slug"
                    required
                    error={errors.slug}
                    hint={
                        slugLocked
                            ? servicesCopy.slugLockedHint
                            : servicesCopy.slugFreeHint
                    }
                >
                    <Input
                        value={data.slug}
                        maxLength={60}
                        readOnly={slugLocked}
                        placeholder="dental-consultation"
                        onChange={(e) => setData('slug', e.target.value)}
                        error={Boolean(errors.slug)}
                        style={
                            slugLocked
                                ? {
                                      background: 'var(--wc-gray-100)',
                                      color: 'var(--wc-text-secondary)',
                                      cursor: 'not-allowed',
                                  }
                                : undefined
                        }
                    />
                </Field>

                <Field
                    label="Description"
                    required
                    error={errors.description}
                    hint="One line. This is what the patient reads under the option."
                >
                    <Textarea
                        value={data.description}
                        rows={2}
                        maxLength={500}
                        onChange={(e) => setData('description', e.target.value)}
                        error={Boolean(errors.description)}
                    />
                </Field>

                <Field
                    label="Specialties"
                    error={errors.specialties}
                    hint={servicesCopy.specialtiesHint}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 'var(--space-2)',
                            paddingTop: 'var(--space-1)',
                        }}
                    >
                        {specialties.map((specialty) => (
                            <Check
                                key={specialty.value}
                                label={specialty.label}
                                checked={data.specialties.includes(
                                    specialty.value,
                                )}
                                onChange={() =>
                                    toggleSpecialty(specialty.value)
                                }
                            />
                        ))}
                    </div>

                    {data.specialties.length === 0 && (
                        <p
                            style={{
                                margin: 'var(--space-2) 0 0',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--wc-text-muted)',
                                fontWeight: 600,
                            }}
                        >
                            {servicesCopy.anyDoctorLabel}
                        </p>
                    )}
                </Field>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--space-4)',
                    }}
                >
                    <Field
                        label="Restricted to"
                        error={errors.restricted_to_sex}
                        hint={servicesCopy.sexHint}
                    >
                        <Select
                            value={data.restricted_to_sex}
                            onChange={(v) => setData('restricted_to_sex', v)}
                            options={sexOptions}
                            invalid={Boolean(errors.restricted_to_sex)}
                        />
                    </Field>

                    <Field
                        label="Maximum age"
                        error={errors.max_age}
                        hint={servicesCopy.maxAgeHint}
                    >
                        <Input
                            value={data.max_age}
                            inputMode="numeric"
                            placeholder="No limit"
                            onChange={(e) =>
                                setData(
                                    'max_age',
                                    digitsOnly(e.target.value, 3),
                                )
                            }
                            error={Boolean(errors.max_age)}
                        />
                    </Field>

                    <Field
                        label="Minimum age"
                        error={errors.min_age}
                        hint={servicesCopy.minAgeHint}
                    >
                        <Input
                            value={data.min_age}
                            inputMode="numeric"
                            placeholder="No limit"
                            onChange={(e) =>
                                setData(
                                    'min_age',
                                    digitsOnly(e.target.value, 3),
                                )
                            }
                            error={Boolean(errors.min_age)}
                        />
                    </Field>

                    <Field
                        label="Video consultation fee (₱)"
                        error={errors.virtual_fee}
                        hint={servicesCopy.virtualFeeHint}
                    >
                        <Input
                            value={data.virtual_fee}
                            inputMode="decimal"
                            placeholder="Not offered over video"
                            onChange={(e) =>
                                setData('virtual_fee', e.target.value)
                            }
                            error={Boolean(errors.virtual_fee)}
                        />
                    </Field>

                    <Field
                        label="Display order"
                        required
                        error={errors.sort_order}
                        hint={servicesCopy.sortOrderHint}
                    >
                        <Input
                            value={data.sort_order}
                            inputMode="numeric"
                            onChange={(e) =>
                                setData(
                                    'sort_order',
                                    digitsOnly(e.target.value, 4),
                                )
                            }
                            error={Boolean(errors.sort_order)}
                        />
                    </Field>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 10,
                        background: 'var(--wc-gray-50)',
                        border: '1px solid var(--wc-gray-200)',
                    }}
                >
                    <Check
                        label="Must be done at the clinic (hides the video option)"
                        checked={data.requires_in_person}
                        onChange={(e) =>
                            setData('requires_in_person', e.target.checked)
                        }
                    />
                    <Check
                        label="Offered — patients can book this now"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-3)',
                    marginTop: 'var(--space-6)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--wc-gray-100)',
                }}
            >
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button type="submit" loading={processing}>
                    {editing ? 'Save changes' : 'Add service'}
                </Button>
            </div>
        </form>
    );
}
