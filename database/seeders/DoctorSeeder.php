<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\DoctorProfile;
use App\Models\PatientProfile;
use App\Models\AvailabilityBlock;

class DoctorSeeder extends Seeder
{
    public function run(): void
    {
        $doctors = [

            // ── General / Family Medicine (5) ─────────────────────────────
            [
                'email' => 'dr.reyes@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Maria Reyes', 'specialty' => 'general', 'specialization' => 'Family Medicine', 'initials' => 'MR', 'color' => '#3b82f6', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Maria', 'last_name' => 'Reyes'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email' => 'dr.bautista@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Ramon Bautista', 'specialty' => 'general', 'specialization' => 'Family Medicine', 'initials' => 'RB', 'color' => '#2563eb', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Ramon', 'last_name' => 'Bautista'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email' => 'dr.ocampo@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Lena Ocampo', 'specialty' => 'general', 'specialization' => 'Family Medicine', 'initials' => 'LO', 'color' => '#1d4ed8', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Lena', 'last_name' => 'Ocampo'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.pascual@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Noel Pascual', 'specialty' => 'general', 'specialization' => 'Family Medicine', 'initials' => 'NP', 'color' => '#1e40af', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Noel', 'last_name' => 'Pascual'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 2, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '13:00', 'end_time' => '18:00'],
                ],
            ],
            [
                'email' => 'dr.magno@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Clara Magno', 'specialty' => 'general', 'specialization' => 'Family Medicine', 'initials' => 'CM', 'color' => '#3730a3', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Clara', 'last_name' => 'Magno'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '10:00', 'end_time' => '18:00'],
                ],
            ],

            // ── Internal Medicine (5) ──────────────────────────────────────
            [
                'email' => 'dr.santos@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Jose Santos', 'specialty' => 'internal_medicine', 'specialization' => 'Internal Medicine', 'initials' => 'JS', 'color' => '#8b5cf6', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Jose', 'last_name' => 'Santos'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '16:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '16:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '16:00'],
                ],
            ],
            [
                'email' => 'dr.lim@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Henry Lim', 'specialty' => 'internal_medicine', 'specialization' => 'Internal Medicine', 'initials' => 'HL', 'color' => '#7c3aed', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Henry', 'last_name' => 'Lim'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '15:00'],
                ],
            ],
            [
                'email' => 'dr.tan@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Angela Tan', 'specialty' => 'internal_medicine', 'specialization' => 'Internal Medicine', 'initials' => 'AT', 'color' => '#6d28d9', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Angela', 'last_name' => 'Tan'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '10:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email' => 'dr.buenaventura@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Roel Buenaventura', 'specialty' => 'internal_medicine', 'specialization' => 'Internal Medicine', 'initials' => 'RB', 'color' => '#5b21b6', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Roel', 'last_name' => 'Buenaventura'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '13:00'],
                ],
            ],
            [
                'email' => 'dr.austria@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Mia Austria', 'specialty' => 'internal_medicine', 'specialization' => 'Internal Medicine', 'initials' => 'MA', 'color' => '#4c1d95', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Mia', 'last_name' => 'Austria'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '14:00'],
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '14:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '14:00'],
                ],
            ],

            // ── Pediatrics (5) ────────────────────────────────────────────
            [
                'email' => 'dr.dela.cruz@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Ana Dela Cruz', 'specialty' => 'pediatrics', 'specialization' => 'Pediatrics', 'initials' => 'AD', 'color' => '#ec4899', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Ana', 'last_name' => 'Dela Cruz'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '12:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '12:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.espiritu@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Cora Espiritu', 'specialty' => 'pediatrics', 'specialization' => 'Pediatrics', 'initials' => 'CE', 'color' => '#db2777', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Cora', 'last_name' => 'Espiritu'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '15:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '15:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '15:00'],
                ],
            ],
            [
                'email' => 'dr.santiago@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Leo Santiago', 'specialty' => 'pediatrics', 'specialization' => 'Pediatrics', 'initials' => 'LS', 'color' => '#be185d', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Leo', 'last_name' => 'Santiago'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '13:00', 'end_time' => '18:00'],
                ],
            ],
            [
                'email' => 'dr.corona@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Faye Corona', 'specialty' => 'pediatrics', 'specialization' => 'Pediatrics', 'initials' => 'FC', 'color' => '#9d174d', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Faye', 'last_name' => 'Corona'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.evangelista@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Paul Evangelista', 'specialty' => 'pediatrics', 'specialization' => 'Pediatrics', 'initials' => 'PE', 'color' => '#831843', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Paul', 'last_name' => 'Evangelista'],
                'availability' => [
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '17:00'],
                ],
            ],

            // ── Cardiology (5) ────────────────────────────────────────────
            [
                'email' => 'dr.garcia@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Ricardo Garcia', 'specialty' => 'cardiology', 'specialization' => 'Cardiology', 'initials' => 'RG', 'color' => '#ef4444', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Ricardo', 'last_name' => 'Garcia'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 4, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '15:00'],
                ],
            ],
            [
                'email' => 'dr.navarro@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Ben Navarro', 'specialty' => 'cardiology', 'specialization' => 'Cardiology', 'initials' => 'BN', 'color' => '#dc2626', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Ben', 'last_name' => 'Navarro'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '16:00'],
                    ['day_of_week' => 4, 'start_time' => '09:00', 'end_time' => '16:00'],
                ],
            ],
            [
                'email' => 'dr.dela.pena@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Iris Dela Pena', 'specialty' => 'cardiology', 'specialization' => 'Cardiology', 'initials' => 'ID', 'color' => '#b91c1c', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Iris', 'last_name' => 'Dela Pena'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 3, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '13:00', 'end_time' => '18:00'],
                ],
            ],
            [
                'email' => 'dr.ilagan@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Tomas Ilagan', 'specialty' => 'cardiology', 'specialization' => 'Cardiology', 'initials' => 'TI', 'color' => '#991b1b', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Tomas', 'last_name' => 'Ilagan'],
                'availability' => [
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.quizon@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Grace Quizon', 'specialty' => 'cardiology', 'specialization' => 'Cardiology', 'initials' => 'GQ', 'color' => '#7f1d1d', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Grace', 'last_name' => 'Quizon'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '10:00', 'end_time' => '17:00'],
                ],
            ],

            // ── Dermatology (5) ───────────────────────────────────────────
            [
                'email' => 'dr.flores@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Patricia Flores', 'specialty' => 'dermatology', 'specialization' => 'Dermatology', 'initials' => 'PF', 'color' => '#f59e0b', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Patricia', 'last_name' => 'Flores'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '13:00'],
                ],
            ],
            [
                'email' => 'dr.aguilar@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Nina Aguilar', 'specialty' => 'dermatology', 'specialization' => 'Dermatology', 'initials' => 'NA', 'color' => '#d97706', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Nina', 'last_name' => 'Aguilar'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '09:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email' => 'dr.valdez@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Roy Valdez', 'specialty' => 'dermatology', 'specialization' => 'Dermatology', 'initials' => 'RV', 'color' => '#b45309', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Roy', 'last_name' => 'Valdez'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '15:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.reyes.d@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Lara Reyes', 'specialty' => 'dermatology', 'specialization' => 'Dermatology', 'initials' => 'LR', 'color' => '#92400e', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Lara', 'last_name' => 'Reyes'],
                'availability' => [
                    ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '10:00', 'end_time' => '18:00'],
                ],
            ],
            [
                'email' => 'dr.dizon@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Kim Dizon', 'specialty' => 'dermatology', 'specialization' => 'Dermatology', 'initials' => 'KD', 'color' => '#78350f', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Kim', 'last_name' => 'Dizon'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 3, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 5, 'start_time' => '13:00', 'end_time' => '18:00'],
                ],
            ],

            // ── Orthopedics (5) ───────────────────────────────────────────
            [
                'email' => 'dr.mendoza@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Carlos Mendoza', 'specialty' => 'orthopedics', 'specialization' => 'Orthopedic Surgery', 'initials' => 'CM', 'color' => '#10b981', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Carlos', 'last_name' => 'Mendoza'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '07:00', 'end_time' => '14:00'],
                    ['day_of_week' => 3, 'start_time' => '07:00', 'end_time' => '14:00'],
                    ['day_of_week' => 4, 'start_time' => '07:00', 'end_time' => '14:00'],
                ],
            ],
            [
                'email' => 'dr.bernardo@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Jun Bernardo', 'specialty' => 'orthopedics', 'specialization' => 'Orthopedic Surgery', 'initials' => 'JB', 'color' => '#059669', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Jun', 'last_name' => 'Bernardo'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '07:00', 'end_time' => '14:00'],
                    ['day_of_week' => 5, 'start_time' => '07:00', 'end_time' => '14:00'],
                ],
            ],
            [
                'email' => 'dr.ramos@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Susan Ramos', 'specialty' => 'orthopedics', 'specialization' => 'Orthopedic Surgery', 'initials' => 'SR', 'color' => '#047857', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Susan', 'last_name' => 'Ramos'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.padilla@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Edgar Padilla', 'specialty' => 'orthopedics', 'specialization' => 'Orthopedic Surgery', 'initials' => 'EP', 'color' => '#065f46', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Edgar', 'last_name' => 'Padilla'],
                'availability' => [
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '16:00'],
                ],
            ],
            [
                'email' => 'dr.toledo@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Vera Toledo', 'specialty' => 'orthopedics', 'specialization' => 'Orthopedic Surgery', 'initials' => 'VT', 'color' => '#064e3b', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Vera', 'last_name' => 'Toledo'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '10:00', 'end_time' => '17:00'],
                ],
            ],

            // ── OB-Gynecology (5) ─────────────────────────────────────────
            [
                'email' => 'dr.villanueva@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Sofia Villanueva', 'specialty' => 'obstetrics', 'specialization' => 'Obstetrics & Gynecology', 'initials' => 'SV', 'color' => '#a855f7', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Sofia', 'last_name' => 'Villanueva'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00'],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00'],
                ],
            ],
            [
                'email' => 'dr.roxas@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Dina Roxas', 'specialty' => 'obstetrics', 'specialization' => 'Obstetrics & Gynecology', 'initials' => 'DR', 'color' => '#9333ea', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Dina', 'last_name' => 'Roxas'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 4, 'start_time' => '10:00', 'end_time' => '17:00'],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '12:00'],
                ],
            ],
            [
                'email' => 'dr.manalo@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Cris Manalo', 'specialty' => 'obstetrics', 'specialization' => 'Obstetrics & Gynecology', 'initials' => 'CM', 'color' => '#7e22ce', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Cris', 'last_name' => 'Manalo'],
                'availability' => [
                    ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '14:00'],
                    ['day_of_week' => 3, 'start_time' => '08:00', 'end_time' => '14:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '14:00'],
                ],
            ],
            [
                'email' => 'dr.de.leon@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Alma De Leon', 'specialty' => 'obstetrics', 'specialization' => 'Obstetrics & Gynecology', 'initials' => 'AL', 'color' => '#6b21a8', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Alma', 'last_name' => 'De Leon'],
                'availability' => [
                    ['day_of_week' => 3, 'start_time' => '13:00', 'end_time' => '18:00'],
                    ['day_of_week' => 4, 'start_time' => '13:00', 'end_time' => '18:00'],
                ],
            ],
            [
                'email' => 'dr.bonifacio@wellcare.com', 'password' => 'password123',
                'profile' => ['display_name' => 'Dr. Tess Bonifacio', 'specialty' => 'obstetrics', 'specialization' => 'Obstetrics & Gynecology', 'initials' => 'TB', 'color' => '#581c87', 'is_active' => true],
                'patient_profile' => ['first_name' => 'Tess', 'last_name' => 'Bonifacio'],
                'availability' => [
                    ['day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 5, 'start_time' => '08:00', 'end_time' => '16:00'],
                    ['day_of_week' => 6, 'start_time' => '08:00', 'end_time' => '12:00'],
                ],
            ],
        ];

        foreach ($doctors as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['password' => Hash::make($data['password'])]
            );

            $user->syncRoles(['doctor']);

            PatientProfile::firstOrCreate(
                ['user_id' => $user->id],
                array_merge($data['patient_profile'], ['classification' => 'old'])
            );

            DoctorProfile::firstOrCreate(
                ['user_id' => $user->id],
                $data['profile']
            );

            if (AvailabilityBlock::where('doctor_id', $user->id)->doesntExist()) {
                foreach ($data['availability'] as $block) {
                    AvailabilityBlock::create([
                        'doctor_id'             => $user->id,
                        'day_of_week'           => $block['day_of_week'],
                        'specific_date'         => null,
                        'start_time'            => $block['start_time'],
                        'end_time'              => $block['end_time'],
                        'slot_duration_minutes' => 30,
                        'is_available'          => true,
                    ]);
                }
            }

            $this->command->info("✓ Doctor seeded: {$data['email']}");
        }
    }
}