<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by LabResultService when a lab test is pushed through its workflow
 * out of order — recording results for a test that was already recorded, or
 * reviewing one the nurse has not filled in yet.
 *
 * The message is user-facing — keep it clear and non-technical.
 */
class InvalidLabTransitionException extends RuntimeException {}
