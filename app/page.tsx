export default function HomePage() {
  return (
    <main
      style={{
        fontFamily: 'Arial, sans-serif',
        margin: '0 auto',
        maxWidth: 760,
        padding: '48px 20px',
        lineHeight: 1.6,
      }}
    >
      <h1>AI Agent API is running</h1>
      <p>
        This project exposes the analysis endpoint at <code>/api/analyze</code>.
      </p>
      <p>
        Deploy on Vercel by configuring <code>GROQ_API_KEY</code> in Project Settings → Environment Variables.
      </p>
      <p>
        Example:
      </p>
      <pre
        style={{
          background: '#f4f4f4',
          borderRadius: 8,
          overflowX: 'auto',
          padding: 16,
        }}
      >
        {`curl -X POST https://<your-domain>/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"query":"Give me a market summary for TSLA"}'`}
      </pre>
    </main>
  )
}
