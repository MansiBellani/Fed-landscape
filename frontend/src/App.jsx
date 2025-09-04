import React, { useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import logo from "./assets/image.png";

// --- IMPORTANT FOR DEPLOYMENT ---
const BACKEND_URL = 'https://backend-k4sq.onrender.com';

// --- CHANGE 1: Define a separate 'All' option and the main keyword list ---
const ALL_OPTION = { value: "all", label: "Select All Keywords" };

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

// Combine the 'All' option with the rest for the dropdown display
const DISPLAY_OPTIONS = [ALL_OPTION, ...KEYWORD_OPTIONS];


function App() {
  const [recipientEmail, setRecipientEmail] = useState('interns@tuff.org');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [reportContent, setReportContent] = useState('');
  const [dateFilter, setDateFilter] = useState('w');

  // --- CHANGE 2: Update the keyword change handler to manage the 'All' option ---
  const handleKeywordChange = (selectedOptions, actionMeta) => {
    if (actionMeta.action === 'select-option' && actionMeta.option.value === 'all') {
      // User selected "All", so we select everything including the "All" option itself
      setSelectedKeywords(DISPLAY_OPTIONS);
    } else if (actionMeta.action === 'deselect-option' && actionMeta.option.value === 'all') {
      // User deselected "All", so we clear the selection
      setSelectedKeywords([]);
    } else if (actionMeta.action === 'clear') {
        // User clicked the 'x' to clear everything
        setSelectedKeywords([]);
    } else {
      // For any other action (e.g., deselecting a single keyword)
      // Filter out the 'All' option because the selection is no longer "all"
      let newSelection = selectedOptions.filter(option => option.value !== 'all');

      // If the user manually selects all individual keywords, also select the "All" option
      if (newSelection.length === KEYWORD_OPTIONS.length) {
        setSelectedKeywords(DISPLAY_OPTIONS);
      } else {
        setSelectedKeywords(newSelection);
      }
    }
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!recipientEmail) {
      setStatus('Please enter a recipient email.');
      return;
    }
    
    // --- CHANGE 3: Filter out the special 'all' value before sending to the backend ---
    const keywordsToSend = selectedKeywords
      .filter(option => option.value !== 'all')
      .map(option => option.value);
        
    if (keywordsToSend.length === 0) {
      setStatus('Please select at least one keyword to search.');
      return;
    }
    
    setIsLoading(true);
    setArticles([]);
    setReportContent('');
    setStatus('Searching, classifying, and summarizing articles...');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/process`, {
        recipient_email: recipientEmail,
        selected_keywords: keywordsToSend // Use the filtered list
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
            <label htmlFor="date-filter">Date Range</label>
            <select 
                id="date-filter" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-filter-select" 
            >
                <option value="w">Past Week</option>
                <option value="m">Past Month</option>
                <option value="y">Past Year</option>
            </select>
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
