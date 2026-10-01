<?php

namespace App\Http\Controllers;

use App\Http\Resources\DoctorResource;
use App\Models\DoctorProfile;
use App\Services\DoctorPhotoStorage;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            // `credential` is read for every row by DoctorResource to decide
            // which credentials may be shown; without it this page is an N+1
            // across the whole roster.
            ->with(['user', 'availabilityBlocks', 'credential'])
            ->orderBy('specialty')
            ->orderBy('display_name')
            ->get();

        return Inertia::render('generals/doctors/index', [
            'doctors' => DoctorResource::collection($doctors)->resolve(),
        ]);
    }

    /**
     * One doctor's public profile.
     *
     * Public, and unauthenticated on purpose: a patient choosing a doctor has
     * not signed in yet, and the DOH Patient's Bill of Rights expects them to
     * know who will be treating them — the person performing a procedure gives
     * their name and credentials. This page is that, in advance, and it is
     * assembled from the same DoctorResource the booking picker uses, so a
     * patient cannot be shown one thing while choosing and another afterwards.
     *
     * 404 rather than a "this doctor is unavailable" page when the profile is
     * not published: an unpublished profile means the credential does not
     * currently permit practice, and a page that says "Dr X exists but you may
     * not see their details" still confirms the roster entry. There is nothing
     * for a patient to do with that.
     */
    public function doctor(DoctorProfile $doctor): Response
    {
        abort_unless($doctor->is_active, 404);

        $doctor->load(['user', 'availabilityBlocks', 'credential']);

        return Inertia::render('generals/doctors/profile', [
            'doctor' => (new DoctorResource($doctor))->resolve(),
        ]);
    }

    /**
     * The doctor's photograph.
     *
     * Every request re-checks publication and consent through
     * hasPublishablePhoto(), which is the reason this is a controller action
     * and not a file under a symlinked public directory: withdrawing consent,
     * or a suspension that unpublishes the doctor, has to take effect on the
     * next request rather than whenever a cached URL is forgotten.
     */
    public function doctorPhoto(DoctorProfile $doctor, DoctorPhotoStorage $photos): StreamedResponse
    {
        abort_unless($doctor->hasPublishablePhoto(), 404);

        $stream = $photos->stream($doctor);

        abort_if($stream === null, 404);

        return $stream;
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
