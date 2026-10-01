<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Middleware\EnsureTwoFactorEnrolled;
use App\Http\Responses\Auth\LoginResponse;
use App\Http\Responses\Auth\PasswordResetLinkRequestedResponse;
use App\Http\Responses\Auth\TwoFactorConfirmedResponse;
use App\Models\User;
use App\Services\ConsentService;
use App\Services\ForcedSignOut;
use Illuminate\Auth\Events\Failed;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\TwoFactorConfirmedResponse as TwoFactorConfirmedResponseContract;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {

        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(TwoFactorConfirmedResponseContract::class, TwoFactorConfirmedResponse::class);

        // One answer whether or not the address has an account, so the
        // forgot-password form cannot be used to find out who is a patient.
        $this->app->bind(FailedPasswordResetLinkRequestResponse::class, PasswordResetLinkRequestedResponse::class);
        $this->app->bind(SuccessfulPasswordResetLinkRequestResponse::class, PasswordResetLinkRequestedResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(TwoFactorConfirmedResponseContract::class, TwoFactorConfirmedResponse::class);
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);

        // Figure 4's "Deactivate/Reactivate Acc": a deactivated account cannot
        // start a new session. EnsureUserIsActive handles the other half —
        // ending a session that was already open when the account was
        // deactivated.
        //
        // A wrong password gets the same generic response whatever the address,
        // so the form cannot be used to enumerate accounts. Only someone who
        // has just proved they know the password is told the account is
        // deactivated: that reveals nothing to a guesser, and without it a
        // suspended staff member saw "credentials do not match" and kept
        // retrying (or reset a password that was never the problem).
        Fortify::authenticateUsing(function (Request $request) {
            $credentials = [Fortify::username() => $request->input(Fortify::username())];
            $user = User::where('email', $request->input(Fortify::username()))->first();

            $passwordMatches = $user && Hash::check($request->input('password'), $user->password);

            if (! $passwordMatches || ! $user->is_active) {
                // Fired by hand because this closure REPLACES
                // SessionGuard::attempt(), which is what normally dispatches
                // Failed. Without this the event never fires anywhere in the
                // application, and App\Listeners\RecordAuthActivity — the thing
                // that puts failed sign-ins on a person's security page and in
                // the admin audit log — would silently record nothing at all.
                //
                // The event carries the account (so the attempt can be recorded
                // against it) and the username only. The submitted password is
                // deliberately NOT included: RecordAuthActivity writes the
                // event's context to a table the admin UI renders.
                event(new Failed(config('fortify.guard'), $user, $credentials));

                if ($passwordMatches) {
                    throw ValidationException::withMessages([
                        Fortify::username() => 'This account has been deactivated. Please contact the clinic if you think this is a mistake.',
                    ]);
                }

                return null;
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login/index', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'canRegister' => Features::enabled(Features::registration()),
            'status' => $request->session()->get('status'),
            // Why a session ended, when the app ended it rather than the user:
            // an idle timeout (GV-8) or a deactivation. Separate from `status`
            // because that renders as a green success alert, and neither of
            // these is good news. See App\Services\ForcedSignOut.
            'notice' => $request->session()->get(ForcedSignOut::NOTICE_KEY),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        // SC-4 / C-1. The consent wording is served from config/consent.php
        // rather than hardcoded in the React, so there is exactly one copy of
        // it, versioned, shared with the settings panel, and changeable without
        // a frontend build.
        Fortify::registerView(fn () => Inertia::render('auth/register/index', [
            'consents' => app(ConsentService::class)->documentsForRegistration(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        // `reason` answers the question this screen otherwise raises. A doctor
        // who has not enrolled in 2FA clicks "Appointments", is bounced to
        // security settings by EnsureTwoFactorEnrolled, and meets a password
        // prompt — with the stock copy ("This is a secure area") that reads as
        // a non-sequitur, because they never asked to open a secure area.
        Fortify::confirmPasswordView(fn (Request $request) => Inertia::render('auth/confirm-password', [
            'reason' => $this->passwordConfirmationReason($request),
        ]));
    }

    /**
     * Why the person is being asked to re-enter their password.
     *
     * Null for the ordinary case — somebody who deliberately opened Settings →
     * Security — where the stock copy is already accurate.
     */
    private function passwordConfirmationReason(Request $request): ?string
    {
        $user = $request->user();

        $forcedToEnrol = $user
            && $user->hasAnyRole(EnsureTwoFactorEnrolled::PROTECTED_ROLES)
            && $user->two_factor_confirmed_at === null;

        if (! $forcedToEnrol) {
            return null;
        }

        $destination = $request->session()->get(EnsureTwoFactorEnrolled::BLOCKED_LABEL_KEY);

        return $destination
            ? "Staff accounts need two-factor authentication before they can be used. Confirm your password to set it up — we will take you back to {$destination} when you are done."
            : 'Staff accounts need two-factor authentication before they can be used. Confirm your password to set it up.';
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
