import type { MetadataRoute } from 'next';

/** Uygulama arama motorlarına kapalıdır (plan 9.1, madde 14). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
