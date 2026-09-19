import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import GamerAiBot from "@/components/GamerAiBot";
import WhatsAppFab from "@/components/WhatsAppFab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fuente gamer para títulos y logo.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tienda-gamer-tau.vercel.app"),
  title: "SCOTT GAMES | Tienda Gamer en Lima - Feria Grau",
  description: "Videojuegos físicos PS5, PS4, PS3, Nintendo Switch, Xbox, consolas y accesorios originales en Lima. Envío gratis desde S/.300, trueque y reservas.",
  keywords: ["videojuegos Lima", "PS5", "PS4", "Nintendo Switch", "Xbox", "Feria Grau", "juegos usados", "trueque gamer"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "SCOTT GAMES",
    title: "SCOTT GAMES | Tienda Gamer en Lima",
    description: "Videojuegos físicos PS5/PS4/PS3, Switch, Xbox y consolas en Lima. Envío gratis desde S/.300, trueque y reservas.",
    images: [{ url: "/logo-scott.png", width: 512, height: 512, alt: "SCOTT GAMES" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SCOTT GAMES | Tienda Gamer en Lima",
    description: "Videojuegos físicos, consolas y accesorios en Lima. Envío gratis desde S/.300.",
    images: ["/logo-scott.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          {children}
          <WhatsAppFab />
          <GamerAiBot />
        </CartProvider>
      </body>
    </html>
  );
}
