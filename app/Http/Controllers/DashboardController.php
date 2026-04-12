<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('doctor/dashboard');
    }
    
    public function book(): Response
    {
        return Inertia::render('generals/book/index');
    }
}