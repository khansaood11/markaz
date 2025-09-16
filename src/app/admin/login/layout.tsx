export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <body>
            <div className="flex min-h-screen items-center justify-center bg-secondary">
                {children}
            </div>
        </body>
    </html>
  );
}
