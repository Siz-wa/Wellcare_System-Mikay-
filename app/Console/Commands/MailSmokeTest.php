<?php

namespace App\Console\Commands;

use App\Mail\WellcareNotificationMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Proves outbound mail actually leaves the application.
 *
 * ## Why this is not a test
 *
 * Every mail assertion in tests/ runs against Laravel's fake transport, which
 * is the right thing there — a suite that opens a socket to Gmail is a suite
 * that fails when the wifi does. But a fake transport cannot tell you the one
 * thing that matters before a demo: whether the credentials, the port and the
 * TLS scheme in .env are the ones this server can actually authenticate with.
 *
 * The failure it is built to catch is silent. `MAIL_MAILER=log` writes a
 * perfectly formatted message into storage/logs and reports success, so the
 * application looks like it is mailing patients when nothing has been sent.
 * This command refuses to pass in that state.
 *
 * ## What it sends
 *
 * A real WellcareNotificationMail — the same Mailable DeliverNotification uses
 * for every appointment, lab and LOA message — so a delivered message also
 * proves the Blade template renders. Sent through `sendNow()` rather than the
 * queue: the point is to see the SMTP result here, not to hand the work to a
 * worker that may not be running.
 *
 * It also addresses the `smtp` mailer DIRECTLY rather than the default one.
 * The application runs on `failover` (smtp -> log) so that a refused login
 * cannot 500 the registration form, and that same fallback would make this
 * command report success over a credential Gmail had rejected — which is the
 * exact lie it exists to prevent.
 */
class MailSmokeTest extends Command
{
    protected $signature = 'wellcare:mail:test
                            {recipient : Address to deliver the test message to}
                            {--allow-log : Pass even when MAIL_MAILER=log, to check rendering only}';

    protected $description = 'Send one real message to prove SMTP delivery works';

    public function handle(): int
    {
        $recipient = (string) $this->argument('recipient');

        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $this->error("[{$recipient}] is not a valid email address.");

            return self::FAILURE;
        }

        // The leg under test, not config('mail.default'): see the class note.
        $configured = (string) config('mail.default');
        $mailer = $configured === 'failover' ? 'smtp' : $configured;

        if (in_array($mailer, ['log', 'array'], true) && ! $this->option('allow-log')) {
            $this->error("MAIL_MAILER is [{$mailer}], so nothing would be delivered.");
            $this->line('Set MAIL_MAILER=smtp in .env, or pass --allow-log to check rendering only.');

            return self::FAILURE;
        }

        $from = config('mail.from.address');

        $this->line("Mailer .......... {$mailer}".($configured === 'failover' ? ' (the smtp leg of failover)' : ''));
        $this->line('Host ............ '.config('mail.mailers.smtp.host').':'.config('mail.mailers.smtp.port'));
        $this->line('Scheme .......... '.(config('mail.mailers.smtp.scheme') ?: '(none)'));
        $this->line("From ............ {$from}");
        $this->line("To .............. {$recipient}");
        $this->newLine();

        try {
            // sendNow, not send: a queued message would return instantly and
            // tell us nothing about whether the handshake succeeded.
            Mail::mailer($mailer)->to($recipient)->sendNow(new WellcareNotificationMail(
                title: 'WellCare mail delivery test',
                body: 'If this message is in your inbox, outbound mail is configured correctly. '
                    .'It was sent by `php artisan wellcare:mail:test` and no patient data is included.',
                notificationType: 'reminder',
            ));
        } catch (\Throwable $e) {
            $this->newLine();
            $this->error('Delivery FAILED: '.$e->getMessage());
            $this->newLine();
            $this->line($this->hintFor($e));

            return self::FAILURE;
        }

        $this->info('Accepted by the mail server.');

        if (in_array($mailer, ['log', 'array'], true)) {
            $this->warn('Written to the log only — nothing was actually delivered.');
        } else {
            $this->line("Check {$recipient} (including spam) to confirm it arrived.");
        }

        return self::SUCCESS;
    }

    /**
     * Turn the three failures this configuration actually produces into the
     * sentence that fixes them, rather than leaving a Symfony exception to be
     * searched for.
     */
    private function hintFor(\Throwable $e): string
    {
        $message = mb_strtolower($e->getMessage());

        return match (true) {
            str_contains($message, 'username and password not accepted'),
            str_contains($message, 'authentication failed'),
            str_contains($message, '535') => 'Gmail rejected the credentials. MAIL_PASSWORD must be a 16-character '
                ."App Password from myaccount.google.com/apppasswords (2FA must be on), not the account's own password.",

            str_contains($message, 'ssl'),
            str_contains($message, 'tls'),
            str_contains($message, 'handshake') => 'TLS negotiation failed. Port 465 needs MAIL_SCHEME=smtps; '
                .'port 587 needs MAIL_SCHEME=tls. Laravel 11+ ignores MAIL_ENCRYPTION entirely.',

            str_contains($message, 'timed out'),
            str_contains($message, 'connection could not be established') => 'Could not reach '
                .config('mail.mailers.smtp.host').':'.config('mail.mailers.smtp.port')
                .'. Most campus and office networks block outbound SMTP — try another network or a tunnel.',

            default => 'Check MAIL_HOST, MAIL_PORT, MAIL_SCHEME, MAIL_USERNAME and MAIL_PASSWORD in .env, '
                .'then run `php artisan config:clear`.',
        };
    }
}
