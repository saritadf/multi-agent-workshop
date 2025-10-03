export const metadata = {
  title: "Multi-Agent: Product Workshop",
  description: "Multi-role debate to turn ideas into actionable plans"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>
        {children}
      </body>
    </html>
  );
}