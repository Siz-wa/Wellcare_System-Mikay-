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
    
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Auth-only settings usually belong inside the middleware group
    require __DIR__.'/settings.php';
    
     Route::controller(\App\Http\Controllers\AppointmentController::class)->group(function () {
        Route::get('/appointments', 'index')->name('book.index');
        Route::get('/appointments/create', 'create')->name('book');
        Route::post('/appointments', 'store')->name('book.store');
        Route::get('/AppointmentView', 'AppointmentView')->name('AppointmentView');
    });
});
