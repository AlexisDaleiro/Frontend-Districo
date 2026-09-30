export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-UY">
      <body>{children}</body>
    </html>
  );
}
