<?php

namespace App\Models;

use App\Concerns\RecordsActivity;
use App\Enums\BoardStatus;
use App\Enums\CredentialStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * One clinical professional's credentialing file.
 *
 * Holds what a Philippine clinic must see before letting someone practise: PRC
 * registration, PTR, specialty board standing, PhilHealth accreditation, and
 * the annual medical certificate DOH AO 2021-0037 requires of laboratory staff.
 * See the create_staff_credentials_table migration for why these columns are
 * stored in plain text while patient clinical data is encrypted.
 *
 * Every transition lives in CredentialingService, never in a controller — the
 * same split BookingService, LoaService and LabResultService use. Nothing here
 * mutates state; the methods below only *report* it.
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $prc_license_no
 * @property Carbon|null $prc_expires_on
 * @property Carbon|null $ptr_expires_on
 * @property CredentialStatus $status
 * @property BoardStatus $board_status
 * @property User $user
 */
class StaffCredential extends Model
{
    use RecordsActivity;
    use SoftDeletes;

    /** How far ahead the admin dashboard warns about a lapsing licence. */
    public const EXPIRY_WARNING_DAYS = 60;

    /**
     * Audited fields — the decision trail, not the document contents.
     *
     * `status` and `verified_by` are the two that matter for a defence: they
     * answer "who let this person see patients, and when". Licence numbers are
     * excluded not because they are secret but because they are static
     * reference data — logging them on every save would bury the decisions.
     *
     * @return array<int, string>
     */
    protected function activityLogAttributes(): array
    {
        return [
            'status',
            'verified_by',
            'verified_at',
            'prc_expires_on',
            'ptr_expires_on',
            'board_status',
            'remarks',
        ];
    }

    protected $fillable = [
        'user_id',
        'prc_license_no',
        'prc_expires_on',
        'ptr_no',
        'ptr_issued_at_lgu',
        'ptr_expires_on',
        'philhealth_accreditation_no',
        's2_license_no',
        'specialty_board',
        'board_status',
        'medical_certificate_on',
        'status',
        'verified_by',
        'verified_at',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'prc_expires_on' => 'date',
            'ptr_expires_on' => 'date',
            'medical_certificate_on' => 'date',
            'verified_at' => 'datetime',
            'status' => CredentialStatus::class,
            'board_status' => BoardStatus::class,
        ];
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The administrator who verified this file. */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * Files whose PRC or PTR has already lapsed, and which the system still
     * treats as practising. This is exactly what `credentials:sweep` acts on.
     */
    public function scopeLapsed(Builder $query): Builder
    {
        return $query
            ->where('status', CredentialStatus::Verified)
            ->where(function (Builder $q) {
                $q->whereDate('prc_expires_on', '<', now())
                    ->orWhereDate('ptr_expires_on', '<', now());
            });
    }

    /** Verified files lapsing within $days — the renewal watchlist. */
    public function scopeExpiringWithin(Builder $query, int $days = self::EXPIRY_WARNING_DAYS): Builder
    {
        return $query
            ->where('status', CredentialStatus::Verified)
            ->where(function (Builder $q) use ($days) {
                $q->whereBetween('prc_expires_on', [now(), now()->addDays($days)])
                    ->orWhereBetween('ptr_expires_on', [now(), now()->addDays($days)]);
            });
    }

    // ── Reporting helpers ─────────────────────────────────────────────────────

    /** Whether the holder may currently be published to patients. */
    public function permitsPractice(): bool
    {
        return $this->status->permitsPractice() && ! $this->hasLapsed();
    }

    /**
     * Whether a recorded expiry date has passed.
     *
     * Read this rather than trusting `status`: the sweep runs nightly, so a
     * licence that lapsed this morning is still marked `verified` in the column
     * until it next runs. LoaRequest carries the same caveat on `expired`.
     */
    public function hasLapsed(): bool
    {
        return $this->prc_expires_on?->isPast() === true
            || $this->ptr_expires_on?->isPast() === true;
    }

    /**
     * Days until the first of the two licences lapses. Negative once one has;
     * null when no expiry is on file at all.
     */
    public function daysUntilExpiry(): ?int
    {
        $dates = collect([$this->prc_expires_on, $this->ptr_expires_on])->filter();

        if ($dates->isEmpty()) {
            return null;
        }

        return (int) ceil(now()->startOfDay()->diffInDays($dates->min(), false));
    }

    /**
     * Whether a specialist claim is backed by a certificate on file.
     *
     * Both halves are required: a rank without a named board, or a board
     * without a rank, is an incomplete record and CredentialingService refuses
     * to confer a specialty on it.
     */
    public function hasBoardCertificate(): bool
    {
        return $this->board_status->isCertified()
            && filled($this->specialty_board);
    }
}
