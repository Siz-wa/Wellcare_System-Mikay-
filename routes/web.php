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
    Route::get('/terms', 'terms')->name('terms');
    Route::get('/privacy', 'privacy')->name('privacy');
    Route::get('/cookies', 'cookies')->name('cookies');
});

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/dashboard/my-schedule', function () {
        return inertia('user/dashboard/my-schedule/my-schedule'); 
    })->name('my-schedule');
    require __DIR__.'/settings.php';

     Route::get('/dashboard/my-patients', function () {
        return inertia('user/dashboard/my-patients/my-patients'); 
    })->name('my-patients');
    require __DIR__.'/settings.php';

    Route::get('/dashboard/consultations', function () {
        return inertia('user/dashboard/consultations/consultations'); 
    })->name('consultations');
    require __DIR__.'/settings.php';

     Route::get('/dashboard/patient-records', function () {
        return inertia('user/dashboard/patient-records/patient-records'); 
    })->name('patient-records');
    require __DIR__.'/settings.php';

    Route::get('/dashboard/lab-reviews', function () {
        return inertia('user/dashboard/lab-reviews/lab-reviews'); 
    })->name('lab-reviews');
    


     Route::controller(\App\Http\Controllers\AppointmentController::class)->group(function () {
        Route::get('/appointments', 'index')->name('book.index');
        Route::get('/appointments/create', 'create')->name('book');
        Route::post('/appointments', 'store')->name('book.store');
        Route::get('/AppointmentView', 'AppointmentView')->name('AppointmentView');
    });
});
