<?php

namespace App\Exceptions;

use Exception;

/**
 * An admin attempted an account action the system refuses on safety grounds —
 * deactivating their own account, or removing the last active admin.
 *
 * Mirrors InvalidLoaTransitionException: a domain refusal, not a bug, so it
 * carries a message written for the person who triggered it.
 */
class AccountActionNotAllowedException extends Exception {}
