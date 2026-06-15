export const metadata = {
  title: 'Flashcards PC-PE',
  description: 'Flashcards para Agente de Polícia Civil de Pernambuco',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" style={{ maxWidth: '100vw', overflowX: 'hidden', margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0, background: '#020817', maxWidth: '100vw', overflowX: 'hidden' }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        {children}
      </body>
    </html>
  )
}
