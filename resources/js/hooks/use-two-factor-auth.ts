import { useCallback, useState } from 'react';
import { qrCode, recoveryCodes, secretKey } from '@/routes/two-factor';
import type { TwoFactorSecretKey, TwoFactorSetupData } from '@/types';

export type UseTwoFactorAuthReturn = {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    hasSetupData: boolean;
    errors: string[];
    clearErrors: () => void;
    clearSetupData: () => void;
    fetchQrCode: () => Promise<void>;
    fetchSetupKey: () => Promise<void>;
    fetchSetupData: () => Promise<void>;
    fetchRecoveryCodes: () => Promise<void>;
};

export const OTP_MAX_LENGTH = 6;

/**
 * Fortify puts every two-factor endpoint behind `password.confirm`, which
 * answers a JSON request with 423 rather than a redirect. That window expires
 * on its own clock, so it can lapse while a half-finished setup modal is still
 * open — and the generic failure message left the person staring at a spinner
 * with no idea that re-confirming their password was the way out.
 */
const PASSWORD_CONFIRMATION_EXPIRED = 423;

class TwoFactorRequestError extends Error {
    constructor(public readonly status: number) {
        super(`Failed to fetch: ${status}`);
    }
}

const describe = (error: unknown, fallback: string): string =>
    error instanceof TwoFactorRequestError &&
    error.status === PASSWORD_CONFIRMATION_EXPIRED
        ? 'Your password confirmation has expired. Reload this page and confirm your password to carry on.'
        : fallback;

const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        throw new TwoFactorRequestError(response.status);
    }

    return response.json();
};

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
    const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
    const [manualSetupKey, setManualSetupKey] = useState<string | null>(null);
    const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const hasSetupData = qrCodeSvg !== null && manualSetupKey !== null;

    const fetchQrCode = useCallback(async (): Promise<void> => {
        try {
            const { svg } = await fetchJson<TwoFactorSetupData>(qrCode.url());
            setQrCodeSvg(svg);
        } catch (error) {
            setErrors((prev) => [
                ...prev,
                describe(error, 'Failed to fetch QR code'),
            ]);
            setQrCodeSvg(null);
        }
    }, []);

    const fetchSetupKey = useCallback(async (): Promise<void> => {
        try {
            const { secretKey: key } = await fetchJson<TwoFactorSecretKey>(
                secretKey.url(),
            );
            setManualSetupKey(key);
        } catch (error) {
            setErrors((prev) => [
                ...prev,
                describe(error, 'Failed to fetch a setup key'),
            ]);
            setManualSetupKey(null);
        }
    }, []);

    // Returning the same array when there is nothing to clear matters more than
    // it looks. `fetchSetupData` calls this on every invocation, and the setup
    // modal re-fetches from an effect keyed on that function; handing React a
    // fresh `[]` each time re-rendered the hook, reallocated the callback, and
    // re-fired the effect — an update loop that blew the nested-update limit
    // and unmounted the whole page before the QR code could ever arrive.
    const clearErrors = useCallback((): void => {
        setErrors((prev) => (prev.length === 0 ? prev : []));
    }, []);

    const clearSetupData = useCallback((): void => {
        setManualSetupKey(null);
        setQrCodeSvg(null);
        clearErrors();
    }, [clearErrors]);

    const fetchRecoveryCodes = useCallback(async (): Promise<void> => {
        try {
            clearErrors();
            const codes = await fetchJson<string[]>(recoveryCodes.url());
            setRecoveryCodesList(codes);
        } catch (error) {
            setErrors((prev) => [
                ...prev,
                describe(error, 'Failed to fetch recovery codes'),
            ]);
            setRecoveryCodesList([]);
        }
    }, [clearErrors]);

    const fetchSetupData = useCallback(async (): Promise<void> => {
        try {
            clearErrors();
            await Promise.all([fetchQrCode(), fetchSetupKey()]);
        } catch {
            setQrCodeSvg(null);
            setManualSetupKey(null);
        }
    }, [clearErrors, fetchQrCode, fetchSetupKey]);

    return {
        qrCodeSvg,
        manualSetupKey,
        recoveryCodesList,
        hasSetupData,
        errors,
        clearErrors,
        clearSetupData,
        fetchQrCode,
        fetchSetupKey,
        fetchSetupData,
        fetchRecoveryCodes,
    };
};
