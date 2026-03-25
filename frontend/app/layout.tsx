import './globals.css';

export const metadata = {
  title: 'Customer Data Intelligence',
  description: 'Global Trading & Data Intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
