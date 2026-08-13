// resources/js/pages/user/privacy/privacyData.ts

export const privacyHeroData = {
    pill: 'Legal',
    heading: { plain: 'Privacy', gradient: 'Policy' },
    body: 'We take your privacy seriously. This policy explains what data we collect, how we use it, and the rights you have over your personal information.',
    lastUpdated: 'Last updated: March 25, 2026',
};

export interface PolicySection {
    id: string;
    title: string;
    content: string[];
}

export const policySections: PolicySection[] = [
    {
        id: 'information-we-collect',
        title: 'Information We Collect',
        content: [
            'When you register for a Wellcare account, we collect personal information including your full name, email address, contact number, date of birth, gender, civil status, and residential address.',
            'We also collect medical information you voluntarily provide, such as height, weight, blood pressure, HMO provider, and preferred doctor. This information is used solely to facilitate your healthcare appointments and improve our services.',
            'When you book an appointment, we collect appointment-related details including your selected service, preferred schedule, payment method, and any additional notes you provide.',
            'We automatically collect certain technical information when you use our platform, including your IP address, browser type, device information, and pages visited. This data is used for security and service improvement purposes only.',
        ],
    },
    {
        id: 'how-we-use-your-information',
        title: 'How We Use Your Information',
        content: [
            'Your personal and medical information is used to process and manage your appointments, communicate appointment confirmations and reminders, and provide you with relevant healthcare services.',
            'We use your contact information to send you important updates about your appointments, laboratory results, and account activity. You may opt out of non-essential communications at any time.',
            'Aggregate, anonymised data may be used to improve our services, train our staff, and conduct internal research. This data cannot be used to identify you personally.',
            'We do not sell, rent, or share your personal information with third parties for marketing purposes under any circumstances.',
        ],
    },
    {
        id: 'data-sharing',
        title: 'Data Sharing & Disclosure',
        content: [
            'Your information is shared only with the Wellcare physicians and staff directly involved in your care. All staff members are bound by strict confidentiality agreements.',
            'We may disclose your information to comply with applicable Philippine laws and regulations, including the Data Privacy Act of 2012 (Republic Act No. 10173), or in response to a valid court order or legal process.',
            'In the event of a medical emergency, relevant health information may be shared with emergency responders or other healthcare providers to protect your life or the life of others.',
            'We use trusted third-party service providers to operate our platform (e.g., hosting, email delivery). These providers are contractually obligated to protect your data and may not use it for any other purpose.',
        ],
    },
    {
        id: 'data-security',
        title: 'Data Security',
        content: [
            'We implement industry-standard security measures including encryption in transit and at rest, secure authentication, and regular security audits to protect your personal information.',
            'Access to your personal and medical data is restricted to authorised Wellcare personnel on a need-to-know basis. All access is logged and monitored.',
            'While we take every reasonable precaution to protect your data, no system is completely immune to security risks. We encourage you to use a strong, unique password and to log out after each session.',
            'In the event of a data breach that may affect your rights and freedoms, we will notify you and the National Privacy Commission (NPC) within 72 hours of becoming aware of the breach.',
        ],
    },
    {
        id: 'your-rights',
        title: 'Your Rights Under the Data Privacy Act',
        content: [
            'Under Republic Act No. 10173, you have the right to be informed about how your personal data is collected, stored, and used by Wellcare.',
            'You have the right to access a copy of your personal data held by us at any time. You may request this by contacting our Data Protection Officer at privacy@wellcareclinics.com.',
            'You have the right to correct any inaccurate or incomplete personal data we hold about you. You may update most information directly through your account profile.',
            'You have the right to erasure or blocking of your personal data under certain circumstances, such as when the data is no longer necessary for the purpose it was collected. Requests are subject to our legal retention obligations.',
            'You have the right to data portability — to receive your personal data in a structured, commonly used format. You also have the right to object to processing and to lodge a complaint with the National Privacy Commission.',
        ],
    },
    {
        id: 'cookies',
        title: 'Cookies & Tracking',
        content: [
            'We use essential cookies to maintain your session and ensure the secure operation of our platform. These cookies are strictly necessary and cannot be disabled.',
            'We do not use advertising or tracking cookies. We do not participate in cross-site tracking or behavioural advertising networks.',
            'You can configure your browser to refuse cookies, but doing so may affect the functionality of certain features of the Wellcare platform.',
        ],
    },
    {
        id: 'retention',
        title: 'Data Retention',
        content: [
            'We retain your personal and medical records for a minimum of 10 years from the date of your last appointment, in accordance with Philippine medical records regulations.',
            'If you request deletion of your account, non-medical personal data (such as contact details and login credentials) will be deleted within 30 days. Medical records are retained for the legally required period.',
            'Anonymised, aggregated data may be retained indefinitely for research and service improvement purposes.',
        ],
    },
    {
        id: 'contact',
        title: 'Contact & Complaints',
        content: [
            'If you have questions about this Privacy Policy or how we handle your personal data, please contact our Data Protection Officer at privacy@wellcareclinics.com or call us at (02) 8123-4567.',
            'If you believe your data privacy rights have been violated, you may file a complaint with the National Privacy Commission at www.privacy.gov.ph.',
            'We are committed to resolving any privacy concerns promptly and transparently. We aim to respond to all privacy-related inquiries within 5 business days.',
        ],
    },
];
