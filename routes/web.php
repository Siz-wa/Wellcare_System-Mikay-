<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

/*

|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::inertia('/', 'generals/home/index', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

/*

|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    
    Route::inertia('/dashboard', 'user/dashboard')->name('dashboard');
    
    // Auth-only settings usually belong inside the middleware group
    require __DIR__.'/settings.php';
    
    // Appointment booking routes
    Route::get('/appointments/create', [\App\Http\Controllers\AppointmentController::class, 'create'])->name('appointments.create');
    Route::post('/appointments', [\App\Http\Controllers\AppointmentController::class, 'store'])->name('appointments.store');
    Route::get('/appointments', [\App\Http\Controllers\AppointmentController::class, 'index'])->name('appointments.index');
});
