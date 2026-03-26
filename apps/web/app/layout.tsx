import {Geist, Geist_Mono} from 'next/font/google'
import Footer from './components/Footer'
import type {Metadata} from 'next'
import './globals.css'
const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'Happy Vibecode',
	description: 'Remote Agent Control Dashboard',
}

export const viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning data-mode="dark">
			<link rel="icon" href="favicon.ico" />
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{children}
				<Footer />
			</body>
		</html>
	)
}
