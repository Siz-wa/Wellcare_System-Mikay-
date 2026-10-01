<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by PaymentVerificationService when a settlement record is pushed
 * through its workflow out of order — verifying one that was already rejected,
 * submitting proof against a visit that is already paid, or deciding a
 * remittance twice.
 *
 * The message is user-facing — keep it clear and non-technical.
 */
class InvalidPaymentTransitionException extends RuntimeException {}
