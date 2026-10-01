<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-account notification switches.
 *
 * Two channels, five categories. The categories are not invented — each one
 * maps onto the `type` values AppointmentNotification actually writes, so a
 * switch the patient turns off silences something they can point at.
 *
 * The gate is enforced in exactly two places, both of them choke points:
 *
 *   in-app → AppointmentNotification::booted(), which every one of the eleven
 *            ::create() call sites passes through.
 *   email  → the single Mail::to(...)->send() in DoctorAppointmentController.
 *
 * Deliberately NOT enforced per-controller: a preference honoured in ten of
 * eleven places is a bug report waiting to be filed, and the eleventh is always
 * the one added next month.
 */
class NotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'preferences',
    ];

    /**
     * The switches an account owns, and what each one covers.
     *
     * `alwaysOn` marks a category the user may see but cannot disable. Only
     * `security` carries it: an account-security alert the account holder has
     * muted is how a compromise goes unnoticed, and every serious product
     * treats those as non-optional. Critical lab values are handled separately
     * — see allows() — because that exemption is per-notification, not
     * per-category.
     *
     * @var array<string, array{label: string, description: string, alwaysOn: bool}>
     */
    public const CATEGORIES = [
        'appointments' => [
            'label' => 'Appointments',
            'description' => 'Bookings, confirmations, cancellations and check-ins.',
            'alwaysOn' => false,
        ],
        'consultations' => [
            'label' => 'Consultations',
            'description' => 'When a doctor starts your virtual consultation, and when a session is finalized.',
            'alwaysOn' => false,
        ],
        'lab_results' => [
            'label' => 'Laboratory results',
            'description' => 'Requested tests, recorded results and doctor validation. Critical values are always sent.',
            'alwaysOn' => false,
        ],
        'hmo' => [
            'label' => 'HMO & LOA',
            'description' => 'Letter of Authorization submissions, approvals and rejections.',
            'alwaysOn' => false,
        ],
        'billing' => [
            'label' => 'Payments',
            'description' => 'Confirmations that a video consultation fee was received. Requests to pay, and payments we could not match, are always sent.',
            'alwaysOn' => false,
        ],
        'security' => [
            'label' => 'Account & security',
            'description' => 'Password changes, new sign-ins and two-factor changes. Cannot be turned off.',
            'alwaysOn' => true,
        ],
    ];

    /**
     * Task 1.2 added `sms`. The settings screen builds its switches by
     * iterating this constant, and defaults() fills in any channel a saved row
     * predates — so an existing account picks up the new channel switched on
     * rather than reading as null.
     *
     * @var array<int, string>
     */
    public const CHANNELS = ['inapp', 'email', 'sms'];

    /**
     * Which category each AppointmentNotification `type` belongs to.
     *
     * A type missing from this map is delivered rather than dropped. That
     * direction is the safe one: a new notification type added without a
     * matching entry here still reaches the person it concerns, where the
     * opposite default would silently swallow it.
     *
     * @var array<string, string>
     */
    public const TYPE_CATEGORIES = [
        'requested' => 'appointments',
        'confirmed' => 'appointments',
        'cancelled' => 'appointments',
        'checked_in' => 'appointments',
        'no_show' => 'appointments',
        'reminder' => 'appointments',
        'consultation_started' => 'consultations',
        'consultation_done' => 'consultations',
        'lab_requested' => 'lab_results',
        'lab_recorded' => 'lab_results',
        'lab_critical' => 'lab_results',
        'lab_reviewed' => 'lab_results',
        'hmo_submitted' => 'hmo',
        'hmo_approved' => 'hmo',
        'hmo_rejected' => 'hmo',
        'payment_due' => 'billing',
        'payment_submitted' => 'billing',
        'payment_verified' => 'billing',
        'payment_rejected' => 'billing',
        'refund_due' => 'billing',
        'rescheduled' => 'appointments',
        'contact_message' => 'appointments',
    ];

    /**
     * Notification types that ignore preferences entirely.
     *
     * A critical lab value is a clinical safety signal, not an update. Muting
     * "Laboratory results" must not be able to suppress the message telling a
     * patient a result is out of range — that is the one notification in this
     * system whose non-delivery can cause harm.
     *
     * @var array<int, string>
     */
    public const UNMUTABLE_TYPES = [
        'lab_critical',
        // The two notifications whose non-delivery makes the system act
        // AGAINST the person who muted them. `payment_due` is the only notice
        // that a video consultation must be paid for, and `payment_rejected`
        // the only notice that a submitted reference did not match — miss
        // either and wellcare:payments:sweep cancels the appointment at the
        // deadline. Muting "Payments" silences the receipts, which is what a
        // person turning it off actually means, and never the two messages
        // that cost them their slot.
        'payment_due',
        'payment_rejected',
    ];

    protected function casts(): array
    {
        return [
            'preferences' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The shipped defaults: everything on.
     *
     * Opt-out rather than opt-in, because the alternative is a patient who
     * registers, books, and is never told the appointment was confirmed.
     *
     * @return array<string, bool>
     */
    public static function defaults(): array
    {
        $defaults = [];

        foreach (array_keys(self::CATEGORIES) as $category) {
            foreach (self::CHANNELS as $channel) {
                $defaults[self::key($channel, $category)] = true;
            }
        }

        return $defaults;
    }

    /** The flat storage key for one channel/category pair. */
    public static function key(string $channel, string $category): string
    {
        return "{$channel}.{$category}";
    }

    /**
     * This account's switches, merged over the defaults.
     *
     * Merging on read is what lets a category be added to CATEGORIES without a
     * migration: rows saved before it existed pick up its default instead of
     * reading as null.
     *
     * @return array<string, bool>
     */
    public function resolved(): array
    {
        return array_merge(self::defaults(), $this->preferences ?? []);
    }

    /** Read — creating on first access — the preferences row for an account. */
    public static function forUser(User $user): self
    {
        return static::firstOrCreate(
            ['user_id' => $user->id],
            ['preferences' => self::defaults()],
        );
    }

    /**
     * May this notification be delivered to this account on this channel?
     *
     * Answers "yes" for anything it does not recognise — an unmapped type, an
     * always-on category, an unmutable type, or an account with no row yet.
     *
     * Takes an id rather than a User because the id is all it reads, and this
     * runs on every notification write: the callers already hold `user_id`, so
     * asking them for a hydrated model would add a `select * from users` to
     * each of the eleven ::create() sites for nothing.
     *
     * The cheap checks are ordered ahead of the query on purpose — an
     * always-on category or an unmutable type never touches the database.
     */
    public static function allows(?int $userId, string $channel, string $notificationType): bool
    {
        if ($userId === null) {
            return true;
        }

        if (in_array($notificationType, self::UNMUTABLE_TYPES, true)) {
            return true;
        }

        $category = self::TYPE_CATEGORIES[$notificationType] ?? null;

        if ($category === null || (self::CATEGORIES[$category]['alwaysOn'] ?? false)) {
            return true;
        }

        $row = static::query()->where('user_id', $userId)->first();

        if (! $row) {
            return true;
        }

        return (bool) ($row->resolved()[self::key($channel, $category)] ?? true);
    }
}
