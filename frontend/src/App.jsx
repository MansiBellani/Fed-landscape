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
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [dateFilter, setDateFilter] = useState('w');

  const handleKeywordChange = (selectedOptions, actionMeta) => {
    if (actionMeta.action === 'select-option' && actionMeta.option.value === 'all') {
      setSelectedKeywords(DISPLAY_OPTIONS);
    } else if (actionMeta.action === 'deselect-option' && actionMeta.option.value === 'all') {
      setSelectedKeywords([]);
    } else if (actionMeta.action === 'clear') {
        setSelectedKeywords([]);
    } else {
      let newSelection = selectedOptions.filter(option => option.value !== 'all');
      if (newSelection.length === KEYWORD_OPTIONS.length) {
        setSelectedKeywords(DISPLAY_OPTIONS);
      } else {
        setSelectedKeywords(newSelection);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const keywordsToSend = selectedKeywords.filter(o => o.value !== 'all').map(o => o.value);
    if (keywordsToSend.length === 0) {
      setStatus('Please select at least one keyword to search.');
      return;
    }
    
    setIsLoading(true);
    setStatus('');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/process`, {
        recipient_email: recipientEmail,
        selected_keywords: keywordsToSend,
        date_filter: dateFilter
      });
      if (response.data.status === 'success') {
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
            id="keyword-select" isMulti options={DISPLAY_OPTIONS}
            className="react-select-container" classNamePrefix="react-select"
            onChange={handleKeywordChange} value={selectedKeywords}
            placeholder="Select keywords..."
          />
        </div>
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
    </div>
  );
}

export default App;
