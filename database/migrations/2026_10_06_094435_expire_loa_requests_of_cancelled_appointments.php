<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Close LOAs still waiting on HR for appointments that were already
     * cancelled or marked no-show.
     *
     * Cancelling an appointment used to leave its LOA `submitted`, so every
     * such request sat in the HR dashboard and the approvals queue for good.
     * AppointmentCancellationService now closes them as it cancels; this
     * catches the ones cancelled before that, on whichever laptop holds them.
     *
     * Query builder rather than Eloquent, like the LOA backfill before it: a
     * migration has to keep working after the model changes shape.
     */
    public function up(): void
    {
        DB::table('loa_requests')
            ->where('status', 'submitted')
            ->whereIn('appointment_id', function ($query) {
                $query->select('id')
                    ->from('appointments')
                    ->whereIn('status', ['cancelled', 'no_show']);
            })
            ->update([
                'status' => 'expired',
                'remarks' => 'Closed without a decision: the appointment was cancelled.',
                'updated_at' => now(),
            ]);
    }

    /**
     * Not reversible: which rows were `submitted` before is not recorded, and
     * reopening them would put dead requests back in front of HR.
     */
    public function down(): void
    {
        //
    }
};
