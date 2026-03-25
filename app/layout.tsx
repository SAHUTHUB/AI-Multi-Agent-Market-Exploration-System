import type { ReactNode } from 'react'

export const metadata = {
  title: 'AI Agent API',
  description: 'API service for AI market analysis',
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
