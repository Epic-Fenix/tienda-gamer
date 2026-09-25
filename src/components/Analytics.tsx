'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getConsent, CONSENT_EVENT, ConsentValue } from '@/lib/consent';

// Carga Google Analytics 4 SOLO si el usuario aceptó cookies y hay un ID configurado.
// Configura NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX" en Vercel para activar la analítica.
export default function Analytics() {
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    const [consent, setConsentState] = useState<ConsentValue | null>(null);

    useEffect(() => {
        setConsentState(getConsent());
        const onChange = (e: Event) => setConsentState((e as CustomEvent).detail as ConsentValue);
        window.addEventListener(CONSENT_EVENT, onChange);
        return () => window.removeEventListener(CONSENT_EVENT, onChange);
    }, []);

    if (!gaId || consent !== 'accepted') return null;

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gaId}', { anonymize_ip: true });
                `}
            </Script>
        </>
    );
}
