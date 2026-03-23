// resources/js/hooks/images.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central image registry for the entire Wellcare site.
//
// HOW TO USE:
//   import { images } from "@/hooks/images";
//   <img src={images.heroClinic} alt="..." />
//
// HOW TO LOCALIZE:
//   1. Place your photo in:  public/images/filename.jpg
//   2. Change the value below to: "/images/filename.jpg"
//   3. Done — every component using that key updates automatically.
//
// STATUS:
//   [ ] = still using remote Unsplash URL — replace with a real photo
//   [x] = localized — file exists in public/images/
// ─────────────────────────────────────────────────────────────────────────────

export const images: Record<string, string> = {

  /** [ ] Home hero — clinic/doctor exterior photo
   *  Localize → public/images/hero-clinic.jpg  →  "/images/hero-clinic.jpg"  */
  heroClinic:
    "https://images.unsplash.com/photo-1580281657702-257584239a55?w=900&q=85&auto=format&fit=crop",

  /** [ ] Home — Why Us main (doctor consulting patient)
   *  Localize → public/images/why-us-doctor.jpg  →  "/images/why-us-doctor.jpg"  */
  whyUsDoctor:
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=700&q=80&auto=format&fit=crop",

  /** [ ] Home — Why Us secondary inset (laboratory equipment)
   *  Localize → public/images/why-us-lab.jpg  →  "/images/why-us-lab.jpg"  */
  whyUsLab:
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80&auto=format&fit=crop",

  /** [ ] About hero — clinic interior photo
   *  Localize → public/images/about-clinic.jpg  →  "/images/about-clinic.jpg"  */
  aboutClinic:
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=85&auto=format&fit=crop",

  /** [ ] Services hero — laboratory / clinical services photo
   *  Localize → public/images/services-lab.jpg  →  "/images/services-lab.jpg"  */
  servicesLab:
    "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=900&q=85&auto=format&fit=crop",

};

export type ImageKey = keyof typeof images;