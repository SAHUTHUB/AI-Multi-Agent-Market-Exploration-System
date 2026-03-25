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

## 🔐 Environment Variables (Vercel)

เพื่อให้ระบบทำงานได้เต็มรูปแบบทั้งบน Cloud และ Local คุณต้องตั้งค่า API Keys ต่อไปนี้:

1. **GROQ_API_KEY**: สำหรับการประมวลผล LLM (Groq Cloud)
2. **GNEWS_API_KEY**: สำหรับการดึงข่าวสด (Live News API)

### การตั้งค่าบน Vercel (Monorepo Setup):
1. ไปที่ **Vercel Dashboard** -> **Settings** -> **General**
2. **Root Directory**: ให้เป็นค่าว่าง หรือ `./` (หน้าแรกสุดของ Repo)
3. **Framework Preset**: เลือก **Next.js**
4. **Build Command**: ใส่เป็น `npm run build --workspace=frontend`
5. **Output Directory**: ใส่เป็น `frontend/.next`
6. ไปที่แท็บ **Settings** -> **Environment Variables**
7. เพิ่ม Key ทั้ง 2 ตัวเข้าไป (`GROQ_API_KEY`, `GNEWS_API_KEY`) -> กด **Save**
8. ทำการ **Redeploy** ครับ