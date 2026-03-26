"use client";

import { useState, useEffect } from 'react';
import AgentWorkflowPanel from '../components/AgentWorkflowPanel';

function App() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [dataSource, setDataSource] = useState<Array<'api' | 'scrape' | 'mock'>>(['mock']);

  const toggleSource = (source: 'api' | 'scrape' | 'mock') => {
    setDataSource(prev => {
      if (prev.includes(source)) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== source);
      } else {
        return [...prev, source];
      }
    });
  };

  
  const placeholders = [
    "Search car spare parts...",
    "Explore agricultural goods...",
    "Find convenience food data...",
    "Query market insights...",
    "Discover industry trends..."
  ];

  useEffect(() => {
    let currentIndex = 0;
    let currentText = '';
    let isDeleting = false;
    let typingSpeed = 100;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const fullText = placeholders[currentIndex];
      
      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
        typingSpeed = 50;
      } else {
        currentText = fullText.substring(0, currentText.length + 1);
        typingSpeed = 100;
      }

      setPlaceholderText(currentText);

      if (!isDeleting && currentText === fullText) {
        typingSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % placeholders.length;
        typingSpeed = 500;
      }

      timeout = setTimeout(type, typingSpeed);
    };

    timeout = setTimeout(type, typingSpeed);
    return () => clearTimeout(timeout);
  }, []);

  const handleSearch = async (e: any) => {
    if (e.key === 'Enter' && query.trim() !== '') {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const response = await fetch(`/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, dataSource }),
        });
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setResults(null);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setHasSearched(false);
  };

  return (
    <div className={`container ${hasSearched ? 'results-active' : ''}`}>
      <div className="brand">
        <h1>CUSTOMER<span>.COM</span></h1>
        <p>Global Trading & Data Intelligence</p>
      </div>
      
      <div className={`search-wrapper ${isFocused ? 'focused' : ''}`}>
        <div className="search-icon">
          {isSearching ? (
            <div className="spinner"></div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          )}
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="search-input"
          placeholder={isFocused ? "Search data..." : placeholderText}
        />
        {query && (
          <button className="clear-btn" onClick={clearSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
      
      <div className="data-source-selector">
        <button 
          className={`source-pill ${dataSource.includes('mock') ? 'active' : ''}`}
          onClick={() => toggleSource('mock')}
        >
          Mock Data
        </button>
        <button 
          className={`source-pill ${dataSource.includes('api') ? 'active' : ''}`}
          onClick={() => toggleSource('api')}
        >
          GNews API
        </button>
        <button 
          className={`source-pill ${dataSource.includes('scrape') ? 'active' : ''}`}
          onClick={() => toggleSource('scrape')}
        >
          Web Scraping
        </button>
      </div>
      
      {!hasSearched && (
        <div className="hints">
          Press <span>Enter</span> to search across our global portfolio
        </div>
      )}

      {hasSearched && (
        <div className="main-content-layout">
          <aside className="workflow-column">
            <AgentWorkflowPanel
              loading={isSearching}
              executionTrace={results?.executionTrace || []}
            />
          </aside>
          
          <main className="results-column">
            {!isSearching && (
              <div className="results-container" style={{ marginTop: 0 }}>
                {results && results.topic ? (
                  <div className="insight-card">
                    <span className="result-category">{results.region}</span>
                    <h3 className="result-title">{results.topic} Insights</h3>
                    <p className="result-summary">{results.marketInsights}</p>
                    
                    {results.keyMarkets && results.keyMarkets.length > 0 && (
                      <div className="markets-pills">
                        {results.keyMarkets.map((market: string) => <span key={market} className="pill">{market}</span>)}
                      </div>
                    )}

                    {results.recentDevelopments && results.recentDevelopments.length > 0 && (
                      <div className="developments-section">
                        <h4 className="section-title">Recent Developments</h4>
                        <div className="developments-grid">
                          {results.recentDevelopments.map((dev: any, idx: number) => (
                            <div key={idx} className={`dev-card impact-${dev.impact || 'neutral'}`}>
                              <div className="dev-header">
                                <span className="dev-market">{dev.market}</span>
                                <span className="dev-impact">{dev.impact}</span>
                              </div>
                              <h5 className="dev-headline">{dev.headline}</h5>
                              <p className="dev-summary">{dev.summary}</p>
                              <div className="dev-footer">
                                <span className="dev-source">{dev.source}</span>
                                <span className="dev-date">{dev.publishedAt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {results.overallInsight && (
                      <div className="overall-insight">
                        <h4 className="section-title">Overall Impression</h4>
                        <p>{results.overallInsight}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-results">
                    <p>No insights found for "{query}". Try adjusting your keywords to something like "agricultural products".</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
