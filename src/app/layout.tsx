export const metadata = {
  title: "Multi‑Agente: Taller de Producto",
  description: "Debate entre roles para convertir ideas en planes accionables"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>
        {children}
      </body>
    </html>
  );
}