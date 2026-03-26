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

## Technical Analysis (Senior AI Engineer Insights)

### 1. Mock Data Strategy
**System Determinism & Testing**: 
การใช้ Mock Data ในรูปแบบ JSON ช่วยสร้าง "Baseline" ที่คงที่ (Deterministic) สำหรับการทดสอบ Agent การรัน Unit Test จะไม่ถูกรบกวนโดย Network Latency หรือการเปลี่ยนแปลงของข้อมูลภายนอก ทำให้เรากล้าการันตีได้ว่า Logic การประมวลผลของ Agent ยังถูกต้องเหมือนเดิม (Regression Testing)

**Optimal JSON Structure**: 
เพื่อการค้นหาที่มีประสิทธิภาพ เราออกแบบให้มีฟิลด์ `topic`, `region`, และ `country` เป็น Index หลัก และเพิ่ม `searchHints` (Keywords) เข้าไปใน Object เพื่อให้ระบบสามารถทำ Keyword Matching ได้รวดเร็วโดยไม่ต้องใช้ Search Engine เต็มรูปแบบในระยะ Prototype

### 2. Live API Integration (Query Transformation)
**Contextual Search**: 
ระบบใช้ `QueryUnderstandingAgent` ในการทำ **Query Narrowing** เปลี่ยนคำถามกว้างๆ ของผู้ใช้ให้เป็น Search Keywords ที่มีประสิทธิภาพ (เช่น เพิ่มคำว่า "industry trends" หรือ "market outlook") เพื่อส่งต่อให้ GNews API

**Rate Limit & Key Management**: 
เราใช้สถาปัตยกรรมแบบ **Graceful Handling** โดยระบบจะตรวจเช็ก API Key ก่อนเริ่ม Workflow หากพบว่าไม่มี Key (Missing Env) ระบบจะบันทึกเข้า `executionTrace` เพื่อแจ้งเตือนใน UI และสลับไปใช้ Mock Data ทันทีเพื่อป้องกัน Workflow ล่ม (Crash Exception)

### 3. Web Scraping (Unstructured Data)
**Data Freshness**: 
การ Scraping ผ่าน Cheerio ช่วยให้เราเข้าถึงข้อมูลที่ "สด" กว่า API ในบางจังหวะ เนื่องจากไม่ต้องรอรอบการ Index ของ API Provider

**Processing Logic**: 
ข้อมูล Unstructured (หัวข้อข่าวที่ขูดมา) จะถูกส่งเข้าสู่ **Synthesis Layer** ของ `NewsSignalAgent` ซึ่งใช้ LLM ในการสกัด (Extraction) และจัดระเบียบใหม่ให้กลายเป็น JSON ที่มีโครงสร้างชัดเจน (Market, Headline, Impact) ก่อนส่งเข้ากระบวนการวิเคราะห์ถัดไป

### 4. Data Normalization
**Unified Schema**: 
เราใช้กระบวนการ **Normalization Mapping** ในชั้น `dataTools.ts` เพื่อแปลงข้อมูลจากแหล่งต่างๆ (เช่น `article.publishedAt` จาก API และหัวข้อข่าวจาก Scrape) ให้มาอยู่ใน Interface เดียวกันที่ชื่อ `ExternalSignalRecord` ทำให้ Agent ตัวอื่นๆ ไม่ต้องสนใจว่าข้อมูลมาจากแหล่งไหน

### 5. Fallback Mechanism (Graceful Degradation)
**Waterfall Fallback**: 
ระบบถูกออกแบบมาให้ทำงานแบบ **Multi-Layered Failover**:
1. พยายามดึงจาก **Live API**
2. หากล้มเหลว (Error/No Key) จะลอง **Web Scraping**
3. หากขัดข้องทั้งหมด จะดึงจาก **Mock Data**
หลักการนี้ช่วยให้มั่นใจได้ว่าระบบจะมี "Insight" มอบให้ผู้ใช้เสมอ แม้อยู่ในสภาวะที่การเชื่อมต่อภายนอกขัดข้อง

---
*หมายเหตุ: ในเวอร์ชันการใช้งานจริง (Production) ข้อมูลเหล่านี้สามารถเปลี่ยนเป็น API เชื่อมต่อกับฐานข้อมูลจริงหรือ News Aggregators ภายนอกได้โดยการเปลี่ยน Implementation ของ Data Tools ในโฟลเดอร์ `backend/services/tools/`*

> [!IMPORTANT]
> สำหรับการรันบน **Vercel**, อย่าลืมตั้งค่า `GROQ_API_KEY` และ `GNEWS_API_KEY` ในส่วน **Environment Variables** เพื่อให้ Agent สามารถเรียกใช้ Live Data ได้ครับ

