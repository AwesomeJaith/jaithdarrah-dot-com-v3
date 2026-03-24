import { Geist, Geist_Mono, Host_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LastUpdated } from "@/components/last-updated"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const fontGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

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
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col items-center gap-8 px-8 sm:px-16">
            <Header />
            {children}
            <Footer>
              <LastUpdated />
            </Footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
