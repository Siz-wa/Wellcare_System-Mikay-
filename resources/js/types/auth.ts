/**
 * The canonical User shape. This is what Inertia actually shares as
 * `auth.user` (see global.d.ts and HandleInertiaRequests::share), so nothing
 * should declare a second one — a rival definition in types/index.ts was the
 * source of the "roles is missing" / "avatar does not exist" errors.
 */
export type User = {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    /**
     * The signed-in doctor's own headshot, shared by
     * HandleInertiaRequests::resolvePhotoUrl. Null for every other role, and
     * for a doctor who has not uploaded one — the topbar falls back to initials.
     */
    photo_url?: string | null;
    /** Spatie role names. Optional — not every payload carries them. */
    roles?: string[];
    /**
     * Spatie permission names, flattened across the account's roles. Used to
     * hide nav links the account cannot open — display only; every route is
     * gated server-side regardless.
     */
    permissions?: string[];
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
