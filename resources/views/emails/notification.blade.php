<x-mail::message>
# {{ $title }}

{{ $bodyText }}

<x-mail::button :url="config('app.url')">
Open WellCare
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}

<small>
You are receiving this because you have an appointment or record with WellCare
Clinics &amp; Laboratory. You can change which notifications you receive in
your account settings.
</small>
</x-mail::message>
