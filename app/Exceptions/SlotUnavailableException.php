<?php
 
namespace App\Exceptions;
 
use RuntimeException;
 
/**
 * Thrown by BookingService when a requested slot is no longer available
 * or a business-rule constraint is violated (lead time, patient conflict, etc.)
 *
 * The message is user-facing — keep it clear and non-technical.
 */
class SlotUnavailableException extends RuntimeException {}