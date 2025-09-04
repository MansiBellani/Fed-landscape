import React, { useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import logo from "./assets/image.png";

const BACKEND_URL = 'https://backend-k4sq.onrender.com';

const ALL_OPTION = { value: "all", label: "Select All Keywords" };
const KEYWORD_OPTIONS = [
  "NSF Recompete Pilot Program", "Economic Development Agency (EDA)", "CHIPS Act", "Semiconductors",
  "EDA's Impact Newsletter", "AI Legislation", "University", "Research", "Research Expenditures",
  "Research Grant/Award", "Federal AI Legislation", "Pittsburgh", "Nashville", "Georgia", "Texas",
  "HBCUs", "Tech Hub", "Economic Impact"
].map(keyword => ({ value: keyword, label: keyword }));
const DISPLAY_OPTIONS = [ALL_OPTION, ...KEYWORD_OPTIONS];

function App() {
  const [recipientEmail, setRecipientEmail] = useState('tuff2603@gmail.com');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // RE-ADDED: State for articles and reportContent to display results in the UI
  const [articles, setArticles] = useState([]);
  const [reportContent, setReportContent] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [dateFilter, setDateFilter] = useState('w');

  const handleKeywordChange = (selectedOptions, actionMeta) => { /* No changes needed here */ };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const keywordsToSend = selectedKeywords.filter(o => o.value !== 'all').map(o => o.value);
    if (keywordsToSend.length === 0) {
      setStatus('Please select at least one keyword to search.');
      return;
    }
    
    setIsLoading(true);
    setStatus('Searching, classifying, and summarizing articles...');
    // Clear previous results
    setArticles([]);
    setReportContent('');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/process`, {
        recipient_email: recipientEmail,
        selected_keywords: keywordsToSend,
        date_filter: dateFilter
      });

      // UPDATED: Set state with the report data returned from the API
      if (response.data.status === 'success') {
        setArticles(response.data.articles);
        setReportContent(response.data.report_content);
        setStatus(response.data.message);
      } else {
        setStatus(response.data.message || 'An unknown error occurred.');
      }
    } catch (error) {
      setStatus('An error occurred. Please check the backend console.');
    } finally {
      setIsLoading(false);
    }
  };

  // RE-ADDED: Function to render the report from markdown-like text
  const renderReport = (content) => {
    const reportSections = content.split('---').slice(1).filter(s => s.trim());

    return reportSections.map((section, index) => {
      const lines = section.trim().split('\n').filter(l => l.trim());
      const title = lines.find(l => l.startsWith('## '))?.substring(3) || 'No Title';
      const source = lines.find(l => l.startsWith('**Source:'))?.replace('**Source:**', '').trim() || 'N/A';
      const relevance = lines.find(l => l.startsWith('**Relevance:'))?.replace('**Relevance:**', '').trim() || 'N/A';
      const paragraph = lines.find(l => !l.startsWith('**') && !l.startsWith('##') && !l.startsWith('[') && !l.startsWith('-')) || '';
      const keyPointsHeader = lines.find(l => l.startsWith('**Key Points:')) ? '**Key Points:**' : null;
      const keyPoints = lines.filter(l => l.startsWith('- '));
      const linkMatch = lines.find(l => l.startsWith('[Read'))?.match(/\[(.*?)\]\((.*?)\)/);
      const linkUrl = linkMatch ? linkMatch[2] : '#';

      return (
        <div key={index} className="report-item">
          <h3>{title}</h3>
          <div className="report-item-meta">
            <span><strong>Source:</strong> {source}</span>
            <span className="meta-relevance"><strong>Relevance:</strong> {relevance}</span>
          </div>
          <p>{paragraph}</p>
          {keyPointsHeader && <h4>Key Points</h4>}
          <ul className="summary-list">
            {keyPoints.map((line, sIndex) => <li key={sIndex}>{line.substring(2)}</li>)}
          </ul>
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="report-link">Read Full Article</a>
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
         {/* Form fields are unchanged */}
      </form>

      {status && <div className="status">{status}</div>}
      
      {/* RE-ADDED: JSX to display the generated report and source articles */}
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
              {/* ... article card JSX ... */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
