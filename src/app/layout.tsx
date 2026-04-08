import type { Metadata } from "next"
import { Geist, Geist_Mono, Host_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LastUpdated } from "@/components/last-updated"
import { cn } from "@/lib/utils"
import { generateWebsiteSchema } from "@/lib/structured-data"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

const fontGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://jaithdarrah.com"),
  title: {
    default: "Jaith Darrah - Full-Stack Software Engineer Specializing in Microservices & AI Integration",
    template: "%s | Jaith Darrah",
  },
  description:
    "Full-stack software engineer specializing in microservices architecture, AI integration, and scalable web applications. Expert in TypeScript, React, and backend systems. Available for contract work and open-source collaboration.",
  keywords: "software engineer, microservices, AI integration, full-stack developer, TypeScript, React, contract work, open source",
  authors: [{ name: "Jaith Darrah" }],
  creator: "Jaith Darrah",
  publisher: "Jaith Darrah",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jaithdarrah.com",
    title: "Jaith Darrah - Full-Stack Software Engineer Specializing in Microservices & AI Integration",
    description: "Full-stack software engineer specializing in microservices architecture, AI integration, and scalable web applications. Expert in TypeScript, React, and backend systems.",
    siteName: "Jaith Darrah",
    images: [
      {
        url: "/open-graph-cat.png",
        width: 1200,
        height: 630,
        alt: "Jaith Darrah - Full-Stack Software Engineer",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jaith Darrah - Full-Stack Software Engineer Specializing in Microservices & AI Integration",
    description: "Full-stack software engineer specializing in microservices architecture, AI integration, and scalable web applications.",
    images: ["/open-graph-cat.png"],
  },
  alternates: {
    canonical: "https://jaithdarrah.com",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const websiteSchema = generateWebsiteSchema()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        fontGrotesk.variable
      )}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="Jaith Darrah" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="dns-prefetch" href="https://api.chess.com" />
        <link rel="canonical" href="https://jaithdarrah.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col items-center gap-8 px-8 sm:px-16">
            <Header />
            <main className="flex w-full flex-1 flex-col items-center gap-8">
              {children}
            </main>
            <Footer>
              <LastUpdated />
            </Footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
