# AI Multi-Agent Market Exploration System

## 🚀 Running Instructions & Architecture

This project is optimized for a **Vercel-native deployment** using Next.js. 

To strictly satisfy the separation of concerns requirements, the repository is structured into:
- `/frontend` (Next.js App Router, UI components, and API Routes)
- `/backend` (Data schemas, validation, and core services)
- `/AI-agents` (Multi-agent workflow, prompts, and tool integrations)

### How to run locally:
Since the application relies on Vercel's serverless infrastructure, **Docker is not required** for the primary setup. You can easily run the system locally using Node.js:

1. Navigate to the frontend directory:
   `cd frontend`
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`

*(Note: The AI-agents and backend modules are imported externally into the Next.js runtime via the Next.js `externalDir` configuration).*