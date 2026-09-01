import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las rutas.
const securityHeaders = [
  // Evita que la tienda sea incrustada en iframes (anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Impide que el navegador "adivine" tipos MIME.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla cuánta info de referrer se envía a otros orígenes.
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
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
