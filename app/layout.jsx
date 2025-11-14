import './globals.css'
import { GlobalProvider } from '@/context/GlobalProvider'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

export const metadata = {
  title: 'Taleema School Dashboard',
  description: 'Admissions management system for education providers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={inter.variable}>
      <body suppressHydrationWarning className={inter.className}>
        <GlobalProvider>{children}</GlobalProvider>
      </body>
    </html>
  )
}

