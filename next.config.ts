import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las rutas.
const securityHeaders = [
  // Evita que la tienda sea incrustada en iframes (anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Impide que el navegador "adivine" tipos MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Solo envía el origen (no la ruta/query) a otros sitios → protege el ?t= de la boleta.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fuerza HTTPS en el navegador (2 años, subdominios, preload).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Desactiva APIs sensibles del navegador que la tienda no usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // No exponer los source maps originales en F12 / DevTools en producción.
  productionBrowserSourceMaps: false,

  compiler: {
    // Limpia los console.* en producción (conserva console.error para logs del servidor).
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
