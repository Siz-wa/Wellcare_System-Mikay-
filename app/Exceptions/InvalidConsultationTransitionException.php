<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by ConsultationSessionService when a consultation is pushed through
 * its workflow out of order — opening a video room for an in-person booking,
 * editing a note that has already been signed, or finalizing a visit that was
 * cancelled.
 *
 * The message is user-facing — keep it clear and non-technical. Controllers
 * catch it and return `back()->withErrors([...])`, the same shape
 * HmoApprovalController uses for InvalidLoaTransitionException.
 */
class InvalidConsultationTransitionException extends RuntimeException {}
