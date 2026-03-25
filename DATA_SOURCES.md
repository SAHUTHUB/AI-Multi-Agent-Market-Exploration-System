# AI Agent Data Sources

ระบบ AI Multi-Agent นี้ใช้แหล่งข้อมูลหลักจากไฟล์ JSON ภายในโครงการ (Internal JSON Data) เพื่อจำลองการทำงานของ Market Exploration ในระยะ Prototype:

## 1. ข้อมูลตลาด (Market Data)
- **Source**: `backend/services/data/mock-market-data.json`
- **Tool**: `JsonMarketDataTool`
- **Content**: ข้อมูลสถิติตลาด, สัญญาณอุตสาหกรรม (Industry Signals), และภาพรวมของแต่ละภูมิภาค/ประเทศ
- **Usage**: ใช้โดย `MarketResearchAgent` เพื่อสร้างบทวิเคราะห์บริบทของตลาด (Market Context)

## 2. ข้อมูลข่าวและเหตุการณ์ภายนอก (News Signals)
ระบบรองรับ 3 แหล่งข้อมูล (เลือกผ่าน `dataSource` ใน API):
- **Mock (Default)**: โหลดจาก `backend/services/data/mock-signal-data.json` ผ่าน `JsonSignalDataTool`
- **Live API**: ดึงข่าวสดจาก **GNews API** ผ่านฟังก์ชัน `fetchLiveNews` (ต้องการ `GNEWS_API_KEY`)
- **Web Scraping**: ดึงหัวข้อข่าวจาก **Google News** โดยตรงผ่าน `scrapeNewsWithCheerio` (ใช้ Cheerio)

**การใช้งาน**: `NewsSignalAgent` จะทำหน้าที่ประมวลผลข้อมูลจากแหล่งที่เลือกและส่งให้ LLM วิเคราะห์ผลกระทบต่อตลาด (Impact Analysis) ต่อไป

## 3. ผู้ให้บริการโมเดลภาษา (LLM Provider)
- **Primary**: **Groq Cloud API** (ต้องการ `GROQ_API_KEY` ใน `.env`)
- **Fallback**: **MockProvider** (ใช้ในกรณีที่ไม่มี API Key เพื่อให้ระบบยังแสดงผลทดสอบได้)

---
*หมายเหตุ: ในเวอร์ชันการใช้งานจริง (Production) ข้อมูลเหล่านี้สามารถเปลี่ยนเป็น API เชื่อมต่อกับฐานข้อมูลจริงหรือ News Aggregators ภายนอกได้โดยการเปลี่ยน Implementation ของ Data Tools ในโฟลเดอร์ `backend/services/tools/`*
