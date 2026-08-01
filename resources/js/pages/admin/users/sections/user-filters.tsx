// resources/js/pages/admin/users/sections/user-filters.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Search + role + status filters. Every change is a GET back to the same route
// so the filter state lives in the URL and survives a refresh or a share.

import { router } from '@inertiajs/react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Button, Input, Select } from '@/design-system';
import {
    roleLabels,
    statusFilterOptions,
    usersCopy,
} from '@/pages/admin/users/users-data';
import type { UserFilters } from '@/pages/admin/users/users-data';

interface UserFiltersBarProps {
    filters: UserFilters;
    roles: string[];
}

export function UserFiltersBar({
    filters,
    roles,
}: UserFiltersBarProps): ReactElement {
    const [search, setSearch] = useState(filters.search);

    const go = (next: Partial<UserFilters>) => {
        router.get(
            '/admin/users',
            { ...filters, search, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        go({});
    };

    return (
        <form
            onSubmit={onSubmit}
            style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 'var(--space-5)',
            }}
        >
            <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                <Input
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSearch(e.target.value)
                    }
                    placeholder={usersCopy.searchPlaceholder}
                />
            </div>

            <div style={{ minWidth: 170 }}>
                <Select
                    value={filters.role}
                    onChange={(e) => go({ role: e.target.value })}
                    options={[
                        { value: '', label: usersCopy.allRoles },
                        ...roles.map((role) => ({
                            value: role,
                            label: roleLabels[role] ?? role,
                        })),
                    ]}
                />
            </div>

            <div style={{ minWidth: 170 }}>
                <Select
                    value={filters.status}
                    onChange={(e) => go({ status: e.target.value })}
                    options={statusFilterOptions}
                />
            </div>

            <Button type="submit" variant="outline">
                Search
            </Button>
        </form>
    );
}
