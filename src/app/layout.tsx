import type { Metadata } from "next"
import { Geist, Geist_Mono, Host_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LastUpdated } from "@/components/last-updated"
import { cn } from "@/lib/utils"

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
    default: "Jaith Darrah",
    template: "%s | Jaith Darrah",
  },
  description:
    "Software engineer obsessed with the details, building software that's fast, reliable, and beautiful.",
  openGraph: {
    images: ["/open-graph-cat.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="dns-prefetch" href="https://api.chess.com" />
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
