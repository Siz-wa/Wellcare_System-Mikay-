<?php

namespace App\Http\Controllers\Dpo;

use App\Http\Controllers\Controller;
use App\Models\RecordAccessLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * The Data Protection Officer's oversight surface — GV-5 and §5.3 of
 * WELLCARE-GOVERNANCE-PLAN.md.
 *
 * ## Why this role exists
 *
 * Two reasons, one legal and one structural.
 *
 * The legal one: the Health Privacy Code (Joint AO 2016-0002, DOH–DOST–
 * PhilHealth) assigns audit authority over a patient's shared health record
 * jointly to the Medical Records Officer and the Data Protection Officer, and
 * RA 10173 requires a Personal Information Controller to designate a DPO. The
 * role exists in Philippine law whether or not it exists in the system; until
 * now it did not exist in the system.
 *
 * The structural one: `record_access_log` has been written on every chart view,
 * document download and export since the September compliance pass, and
 * **nothing read it**. An audit trail nobody can open is storage, not
 * accountability. This controller is the reader.
 *
 * ## What makes the oversight real
 *
 * What this role CANNOT do. It holds `audit.read` and `access-log.read` and no
 * account-management permission of any kind — it cannot create, edit, promote,
 * suspend or delete a single account. That inability is not a limitation of the
 * role, it IS the control: it is what makes the DPO's view of administrator
 * activity independent of the administrators it describes (NIST SP 800-53
 * AU-9(4)). Do not grant this role a `users.*` permission for convenience; the
 * convenience would be the whole of the defect.
 *
 * Correspondingly, the DPO is the ONLY role that reads `record_access_log`. The
 * administrator sees the change log and not the read log, because the read log
 * records the administrator.
 *
 * ## Read-only by construction
 *
 * There is no write route on this controller and none should be added. A DPO
 * who could amend the access log would be auditing evidence they can edit.
 */
class DpoOversightController extends Controller
{
    private const PER_PAGE = 50;

    private const RECENT_LIMIT = 10;

    /**
     * The oversight overview: volume, and the events that want a human.
     */
    public function dashboard(): Response
    {
        return Inertia::render('dpo/dashboard', [
            'stats' => [
                'accessEventsToday' => RecordAccessLog::whereDate('created_at', today())->count(),
                'accessEventsTotal' => RecordAccessLog::count(),
                // The number that matters most on this page. A false here means
                // clinical staff opened a chart they hold no appointment with —
                // PatientPolicy permits it and records it rather than refusing,
                // because a hard denial would fire on a doctor covering a
                // colleague's list. Permitting it is only defensible if somebody
                // reviews it, and this is where that review happens.
                'breakGlassTotal' => RecordAccessLog::where('had_care_relationship', false)->count(),
                'breakGlassToday' => RecordAccessLog::where('had_care_relationship', false)
                    ->whereDate('created_at', today())
                    ->count(),
                'exports' => RecordAccessLog::where('action', 'exported')->count(),
                'downloads' => RecordAccessLog::where('action', 'downloaded')->count(),
                // GV-10. Console break-glass recoveries. Should normally be
                // zero; a non-zero value is a thing to go and ask about, not a
                // statistic.
                'emergencyEvents' => Activity::where('log_name', 'emergency')->count(),
            ],
            // Surfaced as its own list rather than left in the change log,
            // which is the difference between a break-glass procedure that is
            // reviewed and one that is merely recorded. Each row carries the
            // reason the operator typed at the console.
            'emergencyAccess' => Activity::query()
                ->where('log_name', 'emergency')
                ->with('subject')
                ->latest()
                ->orderByDesc('id')
                ->limit(self::RECENT_LIMIT)
                ->get()
                ->map(fn (Activity $a) => [
                    'id' => $a->id,
                    'description' => $a->description,
                    'operator' => $a->properties['operator'] ?? 'unknown',
                    'osUser' => $a->properties['os_user'] ?? null,
                    'reason' => $a->properties['reason'] ?? null,
                    'forced' => (bool) ($a->properties['forced'] ?? false),
                    'hostname' => $a->properties['hostname'] ?? null,
                    'at' => $a->created_at?->format('d M Y, g:i A'),
                    'ago' => $a->created_at?->diffForHumans(),
                ])
                ->values(),
            'breakGlass' => RecordAccessLog::query()
                ->where('had_care_relationship', false)
                ->with(['actor.profile', 'patient'])
                ->latest()
                ->orderByDesc('id')
                ->limit(self::RECENT_LIMIT)
                ->get()
                ->map(fn (RecordAccessLog $row) => $this->mapAccess($row))
                ->values(),
            'recentChanges' => Activity::query()
                ->with('causer.profile')
                ->latest()
                ->orderByDesc('id')
                ->limit(self::RECENT_LIMIT)
                ->get()
                ->map(fn (Activity $a) => [
                    'id' => $a->id,
                    'description' => $a->description,
                    'event' => $a->event,
                    'logName' => $a->log_name,
                    'causer' => $a->causer?->name ?: ($a->causer?->email ?? 'System'),
                    'ago' => $a->created_at?->diffForHumans(),
                ])
                ->values(),
        ]);
    }

    /**
     * The read log — "who LOOKED at this record", the question `activity_log`
     * cannot answer and the one a breach notification has 72 hours to.
     */
    public function accessLog(Request $request): Response
    {
        $action = $request->string('action')->toString();
        $actor = $request->string('actor')->toString();
        $breakGlassOnly = $request->boolean('breakGlass');

        $entries = RecordAccessLog::query()
            // actor and patient are rendered on every row; without both
            // eager-loaded this is a 2N query over a 50-row page.
            ->with(['actor.profile', 'patient'])
            ->when(
                in_array($action, ['viewed', 'downloaded', 'exported', 'searched'], true),
                fn ($q) => $q->where('action', $action),
            )
            ->when($actor !== '', fn ($q) => $q->whereHas(
                'actor',
                fn ($a) => $a->where('email', 'like', "%{$actor}%")
                    ->orWhereHas('profile', fn ($p) => $p
                        ->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$actor}%"])
                    ),
            ))
            ->when($breakGlassOnly, fn ($q) => $q->where('had_care_relationship', false))
            ->latest()
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('dpo/access-log', [
            'entries' => $entries->through(fn (RecordAccessLog $row) => $this->mapAccess($row)),
            'filters' => [
                'action' => $action,
                'actor' => $actor,
                'breakGlass' => $breakGlassOnly,
            ],
        ]);
    }

    /**
     * The change log. Same table the administrator screen reads — but reached
     * by an account that cannot alter any of the records it describes.
     */
    public function activityLog(Request $request): Response
    {
        $event = $request->string('event')->toString();
        $search = $request->string('search')->toString();

        $activities = Activity::query()
            ->with(['causer.profile', 'subject'])
            ->when($event !== '', fn ($q) => $q->where('event', $event))
            ->when($search !== '', fn ($q) => $q->where('description', 'like', "%{$search}%"))
            ->latest()
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('dpo/activity-log', [
            'activities' => $activities->through(fn (Activity $a) => [
                'id' => $a->id,
                'description' => $a->description,
                'logName' => $a->log_name,
                'event' => $a->event,
                'causer' => $a->causer?->name ?: ($a->causer?->email ?? 'System'),
                'causerRole' => $a->causer?->roles?->first()?->name,
                'subjectType' => $a->subject_type ? class_basename($a->subject_type) : null,
                'subjectId' => $a->subject_id,
                'at' => $a->created_at?->format('d M Y, g:i A'),
            ]),
            'filters' => ['event' => $event, 'search' => $search],
            'events' => Activity::query()->distinct()->orderBy('event')
                ->pluck('event')->filter()->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAccess(RecordAccessLog $row): array
    {
        return [
            'id' => $row->id,
            // A null actor is a purged account. The row deliberately outlives
            // it (nullOnDelete) so that deleting a staff account cannot erase
            // the evidence of what it read — labelled rather than left blank so
            // an empty cell never reads as missing data.
            'actor' => $row->actor?->name ?: ($row->actor?->email ?? 'Removed account'),
            // Denormalised at access time: roles get reassigned, and what an
            // investigation needs is who this person was WHEN they looked.
            'actorRole' => $row->actor_role,
            'patient' => $row->patient
                ? trim($row->patient->first_name.' '.$row->patient->last_name)
                : null,
            'patientId' => $row->patient_id,
            'action' => $row->action,
            'subjectType' => $row->subject_type ? class_basename($row->subject_type) : null,
            // Tri-state, and the nulls matter: null means "the question does
            // not apply" (a roster search, an aggregate export), false means
            // "asked, and no" — break-glass. Collapsing them would make the
            // review query meaningless.
            'careRelationship' => $row->had_care_relationship,
            'route' => $row->route,
            'ip' => $row->ip_address,
            'at' => $row->created_at?->format('d M Y, g:i A'),
            'ago' => $row->created_at?->diffForHumans(),
        ];
    }
}
