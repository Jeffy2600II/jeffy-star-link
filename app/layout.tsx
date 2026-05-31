import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitHub URL Extractor',
  description: 'Extract and select file URLs from GitHub easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
