<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Figure 3's "Activity Log" oval and Figure 4's "Monitor System" flow.
 *
 * Read-only by design. An audit trail an administrator can edit is not an
 * audit trail — there is no update or delete route here, and none should be
 * added. Retention is a scheduled-cleanup concern (Spatie ships
 * `activitylog:clean`), not a UI one.
 *
 * What each row may contain is decided per model in
 * App\Concerns\RecordsActivity, which is where the rule against logging
 * credentials is enforced.
 */
class AdminActivityLogController extends Controller
{
    private const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $logName = $request->string('log')->toString();
        $event = $request->string('event')->toString();
        $search = $request->string('search')->toString();

        $activities = Activity::query()
            // causer is rendered on every row; subject on most. Without both
            // eager-loaded this is a 2N query over a 50-row page.
            ->with(['causer.profile', 'subject'])
            ->when($logName !== '', fn ($q) => $q->where('log_name', $logName))
            ->when($event !== '', fn ($q) => $q->where('event', $event))
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%"))
            // id descending as the tiebreak, not created_at alone: several
            // entries routinely land in the same second (one request that
            // updates two models), and ordering on the timestamp by itself
            // leaves their relative order up to the database.
            ->latest()
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('admin/activity-log/activity-log', [
            'activities' => $activities->through(fn (Activity $a) => $this->mapActivity($a)),
            'filters' => [
                'log' => $logName,
                'event' => $event,
                'search' => $search,
            ],
            // Built from what is actually in the table rather than a hardcoded
            // list, so the filters cannot drift from the models being audited.
            'logNames' => Activity::query()->distinct()->orderBy('log_name')->pluck('log_name')->filter()->values(),
            'events' => Activity::query()->distinct()->orderBy('event')->pluck('event')->filter()->values(),
            'stats' => [
                'total' => Activity::count(),
                'today' => Activity::whereDate('created_at', today())->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapActivity(Activity $activity): array
    {
        $causer = $activity->causer;
        $causerName = $causer?->name;

        return [
            'id' => $activity->id,
            'description' => $activity->description,
            'logName' => $activity->log_name,
            'event' => $activity->event,
            // A null causer is a system action (a seeder, a migration, a
            // console command) — labelled rather than left blank, so an empty
            // cell never reads as missing data.
            'causer' => $causerName !== null && $causerName !== ''
                ? $causerName
                : ($causer?->email ?? 'System'),
            'causerRole' => $causer?->roles?->first()?->name,
            'subjectType' => $activity->subject_type ? class_basename($activity->subject_type) : null,
            'subjectId' => $activity->subject_id,
            'changes' => $this->mapChanges($activity),
            'at' => $activity->created_at?->format('d M Y, g:i A'),
            'ago' => $activity->created_at?->diffForHumans(),
        ];
    }

    /**
     * Flatten Spatie's {attributes, old} shape into rows the table can render
     * directly, so the frontend never has to know the package's structure.
     *
     * @return array<int, array{field: string, from: string, to: string}>
     */
    private function mapChanges(Activity $activity): array
    {
        $properties = $activity->properties;
        $new = (array) ($properties['attributes'] ?? []);
        $old = (array) ($properties['old'] ?? []);

        $changes = [];

        foreach ($new as $field => $value) {
            $changes[] = [
                'field' => str_replace('_', ' ', $field),
                'from' => $this->stringify($old[$field] ?? null),
                'to' => $this->stringify($value),
            ];
        }

        return $changes;
    }

    private function stringify(mixed $value): string
    {
        return match (true) {
            $value === null => '—',
            is_bool($value) => $value ? 'yes' : 'no',
            is_array($value) => json_encode($value) ?: '—',
            default => (string) $value,
        };
    }
}
