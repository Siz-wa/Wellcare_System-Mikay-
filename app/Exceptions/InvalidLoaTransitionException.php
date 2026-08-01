<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by LoaService when a Letter of Authorization is pushed through its
 * workflow out of order — approving one that was already rejected, or deciding
 * a request twice.
 *
 * The message is user-facing — keep it clear and non-technical.
 */
class InvalidLoaTransitionException extends RuntimeException {}
