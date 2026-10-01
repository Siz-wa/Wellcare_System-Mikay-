<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a video consultation costs, per service.
 *
 * Lives here rather than in config for the same reason the catalogue itself
 * stopped being a PHP enum (see the create_services_table docblock): a price is
 * a CLINIC's decision, and an administrator must be able to change it at
 * /admin/services without a deploy.
 *
 * NULL is meaningful and is the default: "this service has no video price".
 * That is the correct state for every one of the existing rows — the clinic has
 * never quoted a virtual fee — and it is the permanent state for anything
 * flagged `requires_in_person`, which cannot be delivered over video at all.
 * PaymentVerificationService falls back to `payments.default_fee` when it reads
 * NULL, so a service the clinic has not priced still produces a payable amount
 * rather than a ₱0.00 invoice.
 *
 * decimal(8,2) — pesos and centavos up to ₱999,999.99. Never a float: a
 * consultation fee is money, and a binary fraction that cannot represent 0.10
 * exactly has no business in a column a patient reconciles against their GCash
 * receipt.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->decimal('virtual_fee', 8, 2)
                ->nullable()
                ->after('requires_in_person');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('virtual_fee');
        });
    }
};
