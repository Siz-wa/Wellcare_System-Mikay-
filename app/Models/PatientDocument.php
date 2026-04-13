<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PatientDocument extends Model
{
    protected $fillable = [
        'patient_id',       // ← added: the actual patient record FK
        'user_id',          // kept for backcompat (guarantor)
        'appointment_id',
        'uploaded_by',
        'title',
        'type',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function guarantor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size;
        if ($bytes < 1024)     return "{$bytes} B";
        if ($bytes < 1048576)  return round($bytes / 1024, 1) . " KB";
        return round($bytes / 1048576, 1) . " MB";
    }

    public function getDownloadUrlAttribute(): string
    {
        return Storage::disk('local')->url($this->file_path);
    }
}