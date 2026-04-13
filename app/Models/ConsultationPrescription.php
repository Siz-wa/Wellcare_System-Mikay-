<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultationPrescription extends Model
{
    protected $fillable = [
        'session_id',
        'name',
        'instructions',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(ConsultationSession::class, 'session_id');
    }
}