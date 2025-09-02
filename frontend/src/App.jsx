import React, { useState } from 'react';
import axios from 'axios';
import Select from 'react-select'
import logo from "./assets/image.png";

// --- IMPORTANT FOR DEPLOYMENT ---
// When your app is live on Render, you must replace the localhost URL below
// with the actual URL of your deployed backend service.
// Example: const BACKEND_URL = 'https://your-backend-name.onrender.com';
const BACKEND_URL = 'https://backend-k4sq.onrender.com';

const KEYWORD_OPTIONS = [
  "NSF Recompete Pilot Program",
  "Economic Development Agency (EDA)",
  "CHIPS Act",
  "Semiconductors",
  "EDA's Impact Newsletter",
  "AI Legislation",
  "University",
  "Research",
  "Research Expenditures",
  "Research Grant/Award",
  "Federal AI Legislation",
  "Pittsburgh",
  "Nashville",
  "Georgia",
  "Texas",
  "HBCUs",
  "Tech Hub",
  "Economic Impact"
].map(keyword => ({ value: keyword, label: keyword }));

function App() {
  const [recipientEmail, setRecipientEmail] = useState('interns@tuff.org');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [reportContent, setReportContent] = useState('');

  const handleKeywordChange = (selectedOptions) => {
    setSelectedKeywords(selectedOptions || []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!recipientEmail) {
      setStatus('Please enter a recipient email.');
      return;
    }
    if (selectedKeywords.length === 0) {
      setStatus('Please select at least one keyword to search.');
      return;
    }
    
    setIsLoading(true);
    setArticles([]);
    setReportContent('');
    setStatus('Searching, classifying, and summarizing articles...');

    try {
      const keywords = selectedKeywords.map(option => option.value);
      // --- Use the BACKEND_URL variable here ---
      const response = await axios.post(`${BACKEND_URL}/api/process`, {
        recipient_email: recipientEmail,
        selected_keywords: keywords
      });

      if (response.data.status === 'success') {
        setArticles(response.data.articles);
        setReportContent(response.data.report_content);
        setStatus(response.data.message);
      } else {
        setStatus(response.data.message);
      }
    } catch (error) {
      setStatus('An error occurred. Please check the backend console.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Advanced Report Rendering Function ---
  const renderReport = (content) => {
    const reportSections = content.split('---').slice(1).filter(s => s.trim());

    return reportSections.map((section, index) => {
      const lines = section.trim().split('\n').filter(l => l.trim());
      
      const title = lines.find(l => l.startsWith('## '))?.substring(3) || 'No Title';
      const source = lines.find(l => l.startsWith('**Source:'))?.replace('**Source:**', '').trim() || 'N/A';
      const relevance = lines.find(l => l.startsWith('**Relevance:'))?.replace('**Relevance:**', '').trim() || 'N/A';
      const linkMatch = lines.find(l => l.startsWith('[Read'))?.match(/\[(.*?)\]\((.*?)\)/);
      const linkText = linkMatch ? linkMatch[1] : 'Read Full Article';
      const linkUrl = linkMatch ? linkMatch[2] : '#';
      
      const summaryLines = lines.filter(l => l.startsWith('- '));

      return (
        <div key={index} className="report-item">
          <h3>{title}</h3>
          <div className="report-item-meta">
            <span><strong>Source:</strong> {source}</span>
            <span className="meta-relevance"><strong>Relevance:</strong> {relevance}</span>
          </div>
          <ul className="summary-list">
            {summaryLines.map((line, sIndex) => {
              // Clean the line of markdown characters like "- **...**"
              const cleanedLine = line.replace(/^- \*\*(.*)\*\*$/, '$1').replace(/^- /, '');
              return <li key={sIndex}>{cleanedLine}</li>;
            })}
          </ul>
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="report-link">
            {linkText}
          </a>
        </div>
      );
    });
  };

  return (
    <div className="App">
      <header className="app-header">
        <img src={logo} alt="TUFF Logo" className="logo" />
        <h1>TUFF Fed Landscape</h1>
      </header>
      <p>Select keywords to generate and email the latest report on federal activities.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="keyword-select">Filter by Keywords</label>
          <Select
            id="keyword-select"
            isMulti
            options={KEYWORD_OPTIONS}
            className="react-select-container"
            classNamePrefix="react-select"
            onChange={handleKeywordChange}
            placeholder="Select keywords..."
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Recipient's Email</label>
          <input
            type="email" id="email" value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? <><div className="spinner"></div> Processing...</> : 'Generate & Send Report'}
        </button>
      </form>

      {status && <div className="status">{status}</div>}
      
      {reportContent && (
        <div className="report-view">
            <h2>Generated Intelligence Report</h2>
            <div className="report-content">
                {renderReport(reportContent)}
            </div>
        </div>
      )}

      {articles.length > 0 && (
        <div className="results-container">
          <h2>Source Articles (Ranked by Relevance)</h2>
          {articles.map((article, index) => (
            <div className="article-card" key={index}>
              <div className="article-header">
                <h3><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a></h3>
                <span className="relevance-score">
                  {Math.round(article.relevance_score * 100)}% Relevant
                </span>
              </div>
              <p className="article-source">Source: {article.source} | Published: {article.date}</p>
              <p className="article-snippet">{article.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;


