<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\NotificationPreferenceUpdateRequest;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Which notifications this account wants, and on which channel.
 *
 * The page is a matrix: one row per category, one switch per channel. The
 * category list is served from NotificationPreference::CATEGORIES rather than
 * duplicated in the React page, so adding a category is a one-file change and
 * the UI cannot drift from what the gate actually enforces.
 */
class NotificationPreferenceController extends Controller
{
    public function edit(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $preference = NotificationPreference::forUser($user);

        return Inertia::render('settings/notifications/index', [
            'categories' => collect(NotificationPreference::CATEGORIES)
                ->map(fn (array $meta, string $key) => [
                    'key' => $key,
                    'label' => $meta['label'],
                    'description' => $meta['description'],
                    'alwaysOn' => $meta['alwaysOn'],
                ])
                ->values()
                ->all(),
            'channels' => [
                ['key' => 'inapp', 'label' => 'In-app', 'description' => 'The notification bell in the top bar.'],
                ['key' => 'email', 'label' => 'Email', 'description' => 'Sent to your account email address.'],
            ],
            'preferences' => $preference->resolved(),
        ]);
    }

    public function update(NotificationPreferenceUpdateRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $submitted = $request->validated('preferences');
        $next = [];

        // Rebuilt from CATEGORIES rather than saved as submitted. An absent key
        // means "off" (unchecked checkboxes are simply not posted), and an
        // always-on category is forced true no matter what arrives — the client
        // is not the authority on whether a security alert can be muted.
        foreach (NotificationPreference::CATEGORIES as $category => $meta) {
            foreach (NotificationPreference::CHANNELS as $channel) {
                $key = NotificationPreference::key($channel, $category);

                $next[$key] = $meta['alwaysOn']
                    ? true
                    : (bool) ($submitted[$key] ?? false);
            }
        }

        NotificationPreference::forUser($user)->update(['preferences' => $next]);

        return back()->with('success', 'Your notification preferences have been saved.');
    }
}
