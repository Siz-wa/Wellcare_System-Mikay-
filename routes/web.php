<?php

use App\Http\Controllers\GenController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::controller(GenController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/about', 'about')->name('about');
    Route::get('/services', 'services')->name('services');
    Route::get('/doctors', 'doctors')->name('doctors');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/faqs', 'faqs')->name('faqs');
});

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
