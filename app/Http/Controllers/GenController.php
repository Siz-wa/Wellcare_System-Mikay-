<?php

namespace App\Http\Controllers;

use App\Http\Resources\DoctorResource;
use App\Models\DoctorProfile;
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
        $doctors = DoctorProfile::active()
            ->with(['user', 'availabilityBlocks'])
            ->orderBy('specialty')
            ->orderBy('display_name')
            ->get();

        return Inertia::render('generals/doctors/index', [
            'doctors' => DoctorResource::collection($doctors)->resolve(),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('generals/contact/index');
    }

    public function faqs(): Response
    {
        return Inertia::render('generals/faq/index');
    }

    public function terms(): Response
    {
        return Inertia::render('generals/terms/index');
    }

    public function privacy(): Response
    {
        return Inertia::render('generals/privacy/index');
    }

    public function cookies(): Response
    {
        return Inertia::render('generals/cookies/index');
    }
}
