<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person's agreement to one purpose, at one version, at one moment.
 *
 * SC-4 in WELLCARE-COMPLIANCE-PLAN.md. Written through App\Services\ConsentService,
 * not by hand — the service is what guarantees the version stamp and the request
 * context are captured, and a second way of writing these rows is a second way
 * of writing one without them.
 *
 * @property int $id
 * @property int|null $patient_id
 * @property int|null $granted_by_user_id
 * @property string $type
 * @property string $document_version
 */
class Consent extends Model
{
    /**
     * The purposes. These mirror the keys in config/consent.php and the enum on
     * the table; all three must agree.
     *
     * Kept as constants rather than referenced from config so that call sites
     * are checkable by a static analyser and a typo is a fatal error rather than
     * a silently missing consent.
     */
    public const DATA_PROCESSING = 'data_processing';

    public const TREATMENT = 'treatment';

    public const TELEMEDICINE = 'telemedicine';

    /**
     * A retired purpose. The clinic no longer asks for marketing consent, so it
     * is absent from config/consent.php and from every form — but rows written
     * before it was dropped still carry this value, and the table enum still
     * accepts it. Kept so those rows can be named in code rather than matched
     * against a bare string.
     */
    public const MARKETING = 'marketing';

    /**
     * The purposes still in use. Marketing is deliberately absent: it is what
     * PrivacyController checks a withdrawal request against, and a purpose the
     * application no longer collects is not one it should keep offering.
     *
     * @return array<int, string>
     */
    public static function types(): array
    {
        return [self::DATA_PROCESSING, self::TREATMENT, self::TELEMEDICINE];
    }

    protected $fillable = [
        'patient_id',
        'granted_by_user_id',
        'type',
        'document_version',
        'granted_at',
        'withdrawn_at',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'granted_at' => 'datetime',
            'withdrawn_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by_user_id');
    }

    /** Consents that are currently in force. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('withdrawn_at');
    }

    public function isActive(): bool
    {
        return $this->withdrawn_at === null;
    }

    /**
     * Was this agreed against wording that has since been superseded?
     *
     * The reason `document_version` is stored rather than looked up: consent to
     * one description of processing is not consent to a different one, so
     * changing the wording has to be able to invalidate what came before.
     */
    public function isStale(): bool
    {
        return $this->document_version !== self::currentVersionFor($this->type);
    }

    public static function currentVersionFor(string $type): ?string
    {
        return config("consent.purposes.{$type}.version");
    }

    /** @return array<string, mixed>|null */
    public static function documentFor(string $type): ?array
    {
        return config("consent.purposes.{$type}");
    }
}
