// Gestión del consentimiento de cookies/analítica (guardado en localStorage).
// 'accepted' = el usuario permite analítica; 'rejected' = solo lo esencial.

export type ConsentValue = 'accepted' | 'rejected';

const KEY = 'cookie-consent';
export const CONSENT_EVENT = 'cookie-consent-change';

// Lee el consentimiento actual. null = aún no decidió.
export function getConsent(): ConsentValue | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = window.localStorage.getItem(KEY);
        return v === 'accepted' || v === 'rejected' ? v : null;
    } catch {
        return null;
    }
}

// Guarda la decisión y avisa a la app (para cargar/descargar analítica).
export function setConsent(value: ConsentValue): void {
    try {
        window.localStorage.setItem(KEY, value);
        window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
    } catch {
        // localStorage bloqueado (modo privado): la app sigue funcionando sin recordar la decisión.
    }
}
