<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class GenController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('generals/home/index', [
            'canRegister' => Features::enabled(Features::registration()),
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('generals/about/index');
    }

    public function services(): Response
    {
        return Inertia::render('generals/services/index');
    }

    public function doctors(): Response
    {
        return Inertia::render('generals/doctors/index');
    }

    public function contact(): Response
    {
        return Inertia::render('generals/contact/index');
    }

    public function faqs(): Response
    {
        return Inertia::render('generals/faq/index');
    }
}