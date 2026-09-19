import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const base = SITE_URL;
    return [
        { url: base, changeFrequency: 'daily', priority: 1 },
        { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
    ];
}
