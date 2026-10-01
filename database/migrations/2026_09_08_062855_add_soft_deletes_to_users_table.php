<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SC-1(c) — account closure becomes anonymise-and-restrict, not destroy.
 *
 * See WELLCARE-COMPLIANCE-PLAN.md §2.6, RET-1 and §2.5, DS-4.
 *
 * The previous migration stopped a destroyed `users` row from dragging the
 * clinical record down with it. This one stops the row being destroyed at all:
 * `Settings\ProfileController::destroy()` now scrubs the identifying columns and
 * soft-deletes, so the account cannot sign in and cannot be recognised, while
 * every record it guaranteed stays whole and attached to its `patients` row.
 *
 * This is the reconciliation the compliance plan describes between a patient's
 * right to erasure and a medical record's retention obligation: the account is
 * erased, the record is retained. A regime that requires unconditional erasure
 * would conflict — §5's ND-9 is where that gets confirmed, and §5's ND-6 is the
 * retention period after which a genuine purge becomes permissible.
 *
 * Two consequences worth stating, because both are load-bearing:
 *
 * 1. **Sign-in stops working for free.** Fortify resolves the account with
 *    `User::where('email', …)->first()`, which the SoftDeletes global scope
 *    filters. No separate "is closed" check is needed, and none should be
 *    added — one gate is testable, two drift.
 *
 * 2. **`users.email` is UNIQUE, and a unique index does not care about
 *    `deleted_at`.** A closed account would therefore squat on its address
 *    forever and refuse the person a new one. `Rule::unique(User::class)` in
 *    ProfileValidationRules queries the *table*, not the model, so it would not
 *    see past the closure either. That is precisely why closure rewrites the
 *    email to a non-routable placeholder rather than merely hiding the row.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'deleted_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'deleted_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
