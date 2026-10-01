// resources/js/pages/user/doctors/doctorsData.ts

// ─── Hero ─────────────────────────────────────────────────────────────────────
export const doctorsHeroData = {
    pill: 'Our Specialists',
    heading: { plain: 'World-Class Doctors,', gradient: 'Human Touch.' },
    body: "Meet the board-certified specialists behind Wellcare's reputation for excellence. Every doctor on our team was chosen not just for their credentials — but for their commitment to treating every patient as a person.",
    stats: [
        { value: '50+', label: 'Specialists' },
        { value: '15+', label: 'Disciplines' },
        { value: '98%', label: 'Patient Satisfaction' },
        { value: '24hr', label: 'Avg. Result Turnaround' },
    ],
};

// NOTE: the doctor roster used to be a hardcoded 41-entry array here. It is now
// served from doctor_profiles via GenController::doctors() -> DoctorResource, so
// the public page, the booking picker, and the doctor profile all agree. Specialty
// labels live in @/lib/specialties.

// ─── Why Our Doctors ──────────────────────────────────────────────────────────
export const whyDoctorsData = {
    pill: 'Our Standards',
    heading: { plain: 'How We Select ', gradient: 'Our Team' },
    desc: 'Every Wellcare physician goes through a rigorous credentialing process before seeing their first patient.',
    steps: [
        {
            title: 'Board Certification',
            desc: 'All doctors hold active board certification from the Philippine Medical Association or an equivalent international body.',
        },
        {
            title: 'Background Verified',
            desc: 'We verify credentials, training history, and professional standing before extending an invitation to join.',
        },
        {
            title: 'Patient-Centred Interview',
            desc: 'Candidates are assessed for communication skills and empathy — not just clinical excellence.',
        },
        {
            title: 'Continuous Development',
            desc: 'All Wellcare doctors complete annual CPD requirements and participate in our in-house quality programme.',
        },
    ],
};

// ─── CTA ──────────────────────────────────────────────────────────────────────
export const doctorsCtaData = {
    pill: 'Book Today',
    heading: { line1: 'Find Your Doctor,', line2: 'Book in Minutes.' },
    desc: 'Same-day and next-day appointments available. In-clinic or via telemedicine — your choice.',
    ctas: {
        primary: { label: 'Book an Appointment', href: '/book' },
        secondary: {
            label: 'Try Telemedicine',
            href: '/book?type=virtual',
        },
    },
};

// ─── Individual doctor profile ────────────────────────────────────────────────
//
// The copy on this page is doing legal work, not decorative work.
//
// `verifyNote` is why the PRC number is published at all: it is the one thing
// on the page a patient can check without the clinic's help, on PRC's own
// verification portal. Printing a licence number and NOT saying it can be
// verified would make it decoration.
//
// `ethicsNote` says what the page deliberately does not carry. Under the PRC
// Board of Medicine and PMA Code of Ethics a physician may publish their name,
// field of specialty, office hours and affiliation — but not claims of personal
// superiority, certificates, diplomas or postgraduate training, and may not
// solicit patients by advertisement. So there are no ratings, no testimonials
// and no rankings here, and that is a rule rather than an omission.
export const doctorProfileCopy = {
    backLabel: 'All doctors',
    credentialsTitle: 'Credentials',
    prcLabel: 'PRC registration',
    boardLabel: 'Specialty board',
    verifiedLabel: 'Verified by the clinic',
    verifyNote:
        'You can check this registration yourself on the Professional Regulation Commission’s online verification portal.',
    scheduleTitle: 'Clinic hours',
    scheduleEmpty:
        'No regular clinic hours are published. Available dates appear when you book.',
    aboutTitle: 'Practice',
    languagesLabel: 'Languages',
    sinceLabel: 'Practising since',
    bookLabel: 'Book an appointment',
    ethicsNote:
        'WellCare lists its physicians by name, field of specialty, credentials and clinic hours. We do not publish ratings, testimonials or comparisons between doctors.',
};
