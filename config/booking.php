<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Enforce the day-of check-in rule
    |--------------------------------------------------------------------------
    |
    | In production a patient may only check in on the day of their visit:
    | checking in is the clinic's record that the person is physically in the
    | waiting room, and it pushes a "patient has arrived" notification at the
    | assigned doctor. Accepting one for a visit three weeks out puts a patient
    | in a queue they are not standing in.
    |
    | During testing that rule is in the way. Seeded and hand-made appointments
    | land on whatever date the scenario needs, and requiring the tester to move
    | the clock — or the row — before they can walk the rest of the state
    | machine (checked_in → in_progress → completed) is friction with no payoff.
    |
    | FALSE relaxes the rule to "any confirmed appointment may be checked in".
    | Everything else about check-in is unchanged: it still requires the
    | appointment to be confirmed and to belong to the caller.
    |
    | Flip this to true (BOOKING_ENFORCE_CHECKIN_DAY=true) before the system is
    | used with real patients.
    |
    */

    'enforce_checkin_day' => (bool) env('BOOKING_ENFORCE_CHECKIN_DAY', false),

];
