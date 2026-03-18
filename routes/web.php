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
    
});
