import * as cheerio from 'cheerio';

export async function fetchLiveNews(query: string) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return { status: "error", message: "GNEWS_API_KEY is missing." };

  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) throw new Error(data.errors ? data.errors[0] : "API Error");

    const articles = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      source: article.source.name,
      publishedAt: article.publishedAt
    }));

    return { status: "success", articles };
  } catch (error: any) {
    console.error("[GNews API Error]:", error.message);
    return { status: "error", message: error.message };
  }
}

export async function scrapeNewsWithCheerio(query: string) {
  try {
    const url = `https://news.google.com/search?q=${encodeURIComponent(query)}`;
    // ต้องใส่ User-Agent จำลองว่าเป็น Browser จริงๆ ป้องกันเว็บบล็อก
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles: { title: string }[] = [];

    // ดึงเฉพาะหัวข้อข่าวจากแท็ก <a> ที่อยู่ภายใน <article> (เอาแค่ 5 ข่าว)
    $('article a').each((index: number, element: cheerio.Element) => {
      const title = $(element).text().trim();
      // คัดกรองข้อความว่างหรือสั้นเกินไปออก
      if (title.length > 15 && articles.length < 5 && !articles.some(a => a.title === title)) {
        articles.push({ title });
      }
    });

    if (articles.length === 0) throw new Error("No articles found");

    return { status: "success", articles };
  } catch (error: any) {
    console.error("[Scraping Error]:", error.message);
    return { status: "error", message: error.message };
  }
}
