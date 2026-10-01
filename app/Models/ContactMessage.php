<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An enquiry sent through the public Contact page.
 *
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string $subject
 * @property string $message
 * @property Carbon|null $handled_at
 */
class ContactMessage extends Model
{
    /** The subjects the form offers, in the order it offers them. */
    public const SUBJECTS = [
        'General Inquiry',
        'Book an Appointment',
        'Laboratory Results',
        'Billing & Payments',
        'Corporate / Partnership',
        'Feedback or Complaint',
        'Other',
    ];

    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'ip_address',
        'handled_at',
        'handled_by',
    ];

    protected function casts(): array
    {
        return [
            'message' => 'encrypted',
            'handled_at' => 'datetime',
        ];
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /** @param  Builder<ContactMessage>  $query */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereNull('handled_at');
    }
}
