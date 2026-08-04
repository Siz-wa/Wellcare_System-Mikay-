export const images: Record<string, string> = {
    /** [ ] Home hero — clinic/doctor exterior photo
     *  Localize → public/images/hero-clinic.jpg  →  "/images/hero-clinic.jpg"  */
    heroClinic: '/images/hero-clinic.jpg',

    whyUsDoctor: '/images/why-us-doctor.jpg',

    whyUsLab: '/images/why-us-lab.jpg',

    aboutClinic: '/images/about-clinic.jpg',

    servicesLab: '/images/services-lab.jpg',
};

export type ImageKey = keyof typeof images;
