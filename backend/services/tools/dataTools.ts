import * as cheerio from 'cheerio';

export async function fetchLiveNews(query: string) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return { status: "error", message: "GNEWS_API_KEY is missing." };

  try {
    let url: string;
    // Detect NewsData.io key format
    if (apiKey.startsWith('pub_')) {
      url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en`;
    } else {
      // Default to GNews.io
      url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${apiKey}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || data.errors?.[0] || "API Error");

    // Normalize results from different providers
    const articles = (data.articles || data.results || []).map((article: any) => ({
      title: article.title,
      description: article.description || article.content,
      source: article.source?.name || article.source_id || "News API",
      publishedAt: article.publishedAt || article.pubDate
    })).slice(0, 5);

    return { status: "success", articles };
  } catch (error: any) {
    console.error("[News API Error]:", error.message);
    return { status: "error", message: error.message };
  }
}

export async function scrapeNewsWithCheerio(query: string) {
  try {
    const url = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles: { title: string }[] = [];

    // Google News uses various structures, try common ones:
    // 1. h3 (standard title)
    // 2. h4 (sub-headlines)
    // 3. article a (fallback)
    const selectors = ['h3', 'h4', 'article a[href*="./articles/"]'];
    
    for (const selector of selectors) {
      if (articles.length >= 5) break;
      
      $(selector).each((_, element) => {
        const title = $(element).text().trim();
        if (title.length > 20 && articles.length < 5 && !articles.some(a => a.title === title)) {
          articles.push({ title });
        }
      });
    }

    if (articles.length === 0) throw new Error("No articles found in scraping");

    return { status: "success", articles };
  } catch (error: any) {
    console.error("[Scraping Error]:", error.message);
    return { status: "error", message: error.message };
  }
}
