<?php
// app/Models/Appointment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'contact_number',
        'age',
        'gender',
        'service',
        'branch',
        'appointment_date',
        'appointment_time',
        'patient_status',
        'coverage',
        'hmo',
        'preferred_doctor',
        'additional_info',
        'status',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'age'              => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}


/* ─────────────────────────────────────────────────────────────
   Migration: database/migrations/xxxx_create_appointments_table.php
───────────────────────────────────────────────────────────── */

// Schema::create('appointments', function (Blueprint $table) {
//     $table->id();
//     $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
//     $table->string('first_name');
//     $table->string('last_name');
//     $table->string('email');
//     $table->string('contact_number', 20);
//     $table->unsignedTinyInteger('age');
//     $table->enum('gender', ['male', 'female', 'other']);
//     $table->string('service');
//     $table->string('branch');
//     $table->date('appointment_date');
//     $table->string('appointment_time', 20);
//     $table->enum('patient_status', ['new', 'returning']);
//     $table->enum('coverage', ['cash', 'hmo', 'philhealth', 'corporate']);
//     $table->string('hmo')->nullable();
//     $table->string('preferred_doctor')->nullable();
//     $table->text('additional_info')->nullable();
//     $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
//     $table->timestamps();
// });