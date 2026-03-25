# AI-AGENT

## Deploy on Vercel

1. Import this repository into Vercel.
2. In **Project Settings → Environment Variables**, add:
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (optional, defaults to `llama-3.1-8b-instant`)
   - `GROQ_BASE_URL` (optional)
3. Use the default Vercel settings for Next.js:
   - Build command: `npm run build`
   - Output: `.next`
4. Deploy.

> This project no longer requires a committed `.env.local` file. Set production values directly in Vercel.
