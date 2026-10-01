// resources/js/pages/settings/notifications/index.tsx

import { Form } from '@inertiajs/react';
import type { ReactElement } from 'react';
import { SaveBar } from '@/pages/settings/components/save-bar';
import { SettingsCard } from '@/pages/settings/components/settings-card';
import { SettingsShell } from '@/pages/settings/layout/settings-shell';
import { notificationsCopy } from '@/pages/settings/settings-data';
import { update } from '@/routes/settings/notifications';
import type { PageProps } from '@/types';

interface Category {
    key: string;
    label: string;
    description: string;
    alwaysOn: boolean;
}

interface Channel {
    key: string;
    label: string;
    description: string;
}

interface PageData extends PageProps {
    categories: Category[];
    channels: Channel[];
    preferences: Record<string, boolean>;
}

export default function NotificationSettingsPage({
    categories,
    channels,
    preferences,
}: PageData): ReactElement {
    return (
        <SettingsShell active="notifications" title="Notification settings">
            <SettingsCard
                title={notificationsCopy.title}
                description={notificationsCopy.description}
            >
                <Form
                    action={update.url()}
                    method="put"
                    options={{ preserveScroll: true }}
                >
                    {({ processing, recentlySuccessful }) => (
                        <>
                            {/*
                              Guarantees the `preferences` key is always
                              present. Unchecked checkboxes post nothing, so an
                              account that switches every category off would
                              submit no `preferences` at all and fail the
                              `required|array` rule — the one save a person is
                              most likely to want would be the only one that
                              could not go through. The controller rebuilds the
                              stored array from CATEGORIES and drops unknown
                              keys, so this placeholder is never persisted.
                            */}
                            <input
                                type="hidden"
                                name="preferences[_submitted]"
                                value="1"
                            />

                            <div className="wc-prefs-table">
                                {/*
                                  Plain divs, not role="table"/"row"/"cell". A
                                  partial table role — rows with no cells — is
                                  read worse by a screen reader than no role at
                                  all, and there is nothing tabular to navigate
                                  here: every checkbox already carries its own
                                  full label ("Email notifications for
                                  Appointments") in the sr-only span below, so
                                  it is self-describing wherever focus lands.
                                  The header row is decoration for sighted
                                  users and is hidden from assistive tech.
                                */}
                                <div
                                    className="wc-prefs-head"
                                    aria-hidden="true"
                                >
                                    <span>Notification</span>
                                    {channels.map((channel) => (
                                        <span
                                            key={channel.key}
                                            title={channel.description}
                                        >
                                            {channel.label}
                                        </span>
                                    ))}
                                </div>

                                {categories.map((category) => (
                                    <div
                                        key={category.key}
                                        className="wc-prefs-row"
                                    >
                                        <div className="wc-prefs-label">
                                            <p className="wc-prefs-title">
                                                {category.label}
                                                {category.alwaysOn && (
                                                    <span className="wc-badge wc-badge-neutral">
                                                        Always on
                                                    </span>
                                                )}
                                            </p>
                                            <p className="wc-prefs-desc">
                                                {category.description}
                                            </p>
                                        </div>

                                        {channels.map((channel) => {
                                            const name = `${channel.key}.${category.key}`;

                                            return (
                                                <label
                                                    key={name}
                                                    className="wc-prefs-toggle"
                                                >
                                                    <span className="sr-only">
                                                        {channel.label}{' '}
                                                        notifications for{' '}
                                                        {category.label}
                                                    </span>
                                                    {/*
                                                      An unchecked checkbox posts
                                                      nothing at all, which the
                                                      controller reads as "off"
                                                      — see the rebuild loop in
                                                      NotificationPreferenceController::update.
                                                      An always-on category is
                                                      rendered disabled AND
                                                      forced true server-side;
                                                      a disabled input is a
                                                      courtesy, not a control.
                                                    */}
                                                    <input
                                                        type="checkbox"
                                                        name={`preferences[${name}]`}
                                                        value="1"
                                                        defaultChecked={
                                                            category.alwaysOn ||
                                                            preferences[name]
                                                        }
                                                        disabled={
                                                            category.alwaysOn
                                                        }
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <SaveBar
                                processing={processing}
                                recentlySuccessful={recentlySuccessful}
                                label="Save preferences"
                                savedLabel={notificationsCopy.saved}
                            />
                        </>
                    )}
                </Form>
            </SettingsCard>
        </SettingsShell>
    );
}
