// resources/js/pages/doctor/layout/AppTopbar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// A re-export, not a copy.
//
// This file used to be a second, hand-maintained implementation of the topbar
// whose own header instructed the reader to "keep both files identical" — and
// they were not identical: the two had already drifted apart in their role
// label fallback, their initials handling, and one of them carried a typo'd
// import path (`@/design-system//components/...`). The doctor's topbar was
// therefore the one place in the app where a fix to the shared topbar did not
// land, which is exactly how the dead account chevron survived there after
// being noticed elsewhere.
//
// The doctor layout imports `./AppTopbar`, and the barrel in ./index.ts
// re-exports it, so this file stays as the alias rather than being deleted.

export { AppTopbar } from '@/design-system/components/AppTopbar';
