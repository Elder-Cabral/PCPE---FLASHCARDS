export const metadata = {
  title: 'Flashcards PC-PE',
  description: 'Flashcards para Agente de Polícia Civil de Pernambuco',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#020817' }}>
        {children}
      </body>
    </html>
  )
}
