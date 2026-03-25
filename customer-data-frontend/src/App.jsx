import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
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
    let timeout;

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

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && query.trim() !== '') {
      setIsSearching(true);
      setHasSearched(true);
      try {
        const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
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
      
      {!hasSearched && (
        <div className="hints">
          Press <span>Enter</span> to search across our global portfolio
        </div>
      )}

      {hasSearched && !isSearching && (
        <div className="results-container">
          {results.length > 0 ? (
            results.map((item) => (
              <div key={item.id} className="result-card">
                <span className="result-category">{item.category}</span>
                <h3 className="result-title">{item.title}</h3>
                <p className="result-summary">{item.summary}</p>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No insights found for "{query}". Try adjusting your keywords.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
