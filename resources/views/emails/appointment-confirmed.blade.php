<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Appointment Confirmed</title>
  <style>
    body { margin: 0; padding: 0; background: #f8f9fa; font-family: 'DM Sans', Arial, sans-serif; color: #1a1a1a; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header  { background: #0056b3; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header p  { margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 100px; padding: 6px 16px; color: #ffffff; font-size: 13px; font-weight: 700; margin-top: 16px; }
    .body    { padding: 36px 40px; }
    .greeting { font-size: 16px; font-weight: 600; margin: 0 0 20px; }
    .detail-card { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
    .detail-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-value { font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right; max-width: 60%; }
    .cta { display: block; text-align: center; margin: 28px 0 0; }
    .cta a { display: inline-block; background: #0056b3; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 36px; border-radius: 100px; letter-spacing: 0.01em; }
    .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin: 24px 0 0; }
    .note p { margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.6; }
    .footer { background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Wellcare Clinics</h1>
      <p>Dasmarinas, Cavite</p>
      <div class="badge">✓ Appointment Confirmed</div>
    </div>

    <div class="body">
      <p class="greeting">Hello, {{ $appointment->first_name }}!</p>

      <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 4px;">
        Your appointment request has been <strong>confirmed</strong> by our team.
        Please check in at the clinic on your scheduled date. Walk-in check-in is
        available at the reception, or you can check in through your patient dashboard.
      </p>

      <div class="detail-card">
        <div class="detail-row">
          <span class="detail-label">Patient</span>
          <span class="detail-value">{{ $appointment->first_name }} {{ $appointment->last_name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">{{ ucwords(str_replace('-', ' ', $appointment->service)) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">{{ \Carbon\Carbon::parse($appointment->appointment_date)->format('l, F j, Y') }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">{{ $appointment->appointment_time }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Coverage</span>
          <span class="detail-value" style="text-transform: capitalize;">{{ $appointment->coverage }}</span>
        </div>
        @if($appointment->doctor_id)
        <div class="detail-row">
          <span class="detail-label">Doctor</span>
          <span class="detail-value">{{ $appointment->doctor->doctorProfile->display_name ?? 'To be assigned' }}</span>
        </div>
        @endif
      </div>

      <div class="note">
        <p>
          <strong>Next step:</strong> When you arrive at the clinic, please check in at the
          reception desk or use your patient dashboard to self-check-in. Your doctor will
          see you shortly after check-in is confirmed.
        </p>
      </div>

      <div class="cta">
        <a href="{{ config('app.url') }}/user/dashboard">View My Appointments</a>
      </div>
    </div>

    <div class="footer">
      <p>
        Wellcare Clinics & Laboratories · Dasmarinas, Cavite<br>
        You received this email because you booked an appointment with us.<br>
        If you did not make this booking, please contact us immediately.
      </p>
    </div>
  </div>
</body>
</html>