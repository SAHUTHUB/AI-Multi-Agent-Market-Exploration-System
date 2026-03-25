const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Mock Data
const mockData = [
  { id: 1, category: 'Car Spare Parts', title: 'Global Spark Plugs Supply', summary: 'Insight: Expected 15% increase in demand across European markets.' },
  { id: 2, category: 'Agricultural Goods', title: 'Wheat Futures & Export Tariffs', summary: 'Trend: Changes in export regulations impact North American suppliers.' },
  { id: 3, category: 'Convenience Food', title: 'Instant Noodle Market Growth', summary: 'News: Asian market shows 20% YoY growth in premium convenience lines.' },
  { id: 4, category: 'Car Spare Parts', title: 'Brake Pad Manufacturing Updates', summary: 'Insight: New sustainable materials are reducing production costs.' },
  { id: 5, category: 'Agricultural Goods', title: 'Soybean Harvesting Tech', summary: 'Trend: Automation in harvesting is increasing yield density by 8%.' },
];

// Search Endpoint
app.get('/api/search', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  
  if (!query) {
    return res.json({ results: [] });
  }

  // Filter mock data based on query matching category, title, or summary
  const results = mockData.filter(item => 
    item.category.toLowerCase().includes(query) || 
    item.title.toLowerCase().includes(query) || 
    item.summary.toLowerCase().includes(query)
  );

  // Return formatted results with simulated delay for realism
  setTimeout(() => {
    res.json({ results });
  }, 600);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
