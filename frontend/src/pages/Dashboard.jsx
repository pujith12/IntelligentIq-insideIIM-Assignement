import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  
  // Chat & Input States
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  
  // Active Conversation State
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [activePrompt, setActivePrompt] = useState('');
  
  // Sidebar History States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Ref for auto-scrolling chat
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load chat history
  const loadDashboardData = async () => {
    try {
      const historyRes = await API.get('/analysis/history');
      if (historyRes.data.success) {
        setHistory(historyRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeAnalysis, runningAnalysis, loadingStep]);

  // Extract clean stock ticker from natural conversational input
  const extractTicker = (text) => {
    if (!text) return 'COMPANY';
    let cleaned = text.replace(/^(analyze|research|what is the thesis on|tell me about|how is|give me suggestions for|check)\s+/i, '');
    cleaned = cleaned.replace(/\s+(stock|shares|company|corporation|inc|ltd|report|analysis|recommendation)$/i, '');
    return cleaned.trim().toUpperCase() || text.trim().toUpperCase();
  };

  // Handle file selection via paperclip
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file);
      setFeedbackError('');
    } else if (file) {
      setFeedbackError('Please attach a valid PDF document (e.g. Earnings Report)');
    }
  };

  // Trigger new analysis (Chat Send)
  const handleSendMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const queryText = customPrompt !== null ? customPrompt : inputText;
    
    if (!queryText.trim() && !attachedFile) return;

    const companyTicker = extractTicker(queryText || (attachedFile ? attachedFile.name.replace('.pdf', '') : 'COMPANY'));
    
    setActivePrompt(queryText || `Analyze ${companyTicker}`);
    setRunningAnalysis(true);
    setActiveAnalysis(null);
    setFeedbackError('');
    setInputText('');

    try {
      // Step 1: Optional PDF Upload
      if (attachedFile) {
        setLoadingStep('Uploading & indexing PDF document embeddings into FAISS...');
        const formData = new FormData();
        formData.append('companyName', companyTicker);
        formData.append('pdf', attachedFile);
        
        await API.post('/reports/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Step 2: RAG + Web Search + Gemini Reasoning
      setLoadingStep(`Searching real-time internet via Tavily & querying Gemini Flash for ${companyTicker}...`);
      const response = await API.post('/analysis/run', { companyName: companyTicker });
      
      if (response.data.success) {
        setActiveAnalysis(response.data.data);
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadDashboardData(); // Refresh history sidebar
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Analysis generation failed. Please verify API keys.');
    } finally {
      setRunningAnalysis(false);
      setLoadingStep('');
    }
  };

  // Load past chat from history sidebar
  const handleSelectHistoryItem = async (item) => {
    setRunningAnalysis(true);
    setActiveAnalysis(null);
    setFeedbackError('');
    setActivePrompt(`Loaded research history for ${item.companyName}`);
    setLoadingStep(`Retrieving archived equity report for ${item.companyName}...`);

    try {
      const response = await API.get(`/analysis/${item._id}`);
      if (response.data.success) {
        setActiveAnalysis(response.data.data);
      }
    } catch (err) {
      setFeedbackError('Failed to load past chat report details.');
    } finally {
      setRunningAnalysis(false);
      setLoadingStep('');
    }
  };

  // Start New Chat
  const handleNewChat = () => {
    setActiveAnalysis(null);
    setActivePrompt('');
    setInputText('');
    setAttachedFile(null);
    setFeedbackError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Color & styling helpers
  const getScoreColor = (score) => {
    if (score >= 75) return '#22c55e'; // Green
    if (score >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getRecommendationStyle = (rec = '') => {
    const norm = rec.toLowerCase();
    if (norm.includes('buy')) return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '#22c55e' };
    if (norm.includes('sell')) return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#ef4444' };
    return { bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '#eab308' };
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      
      {/* LEFT SIDEBAR: CHAT HISTORY */}
      <aside style={{
        width: '280px',
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
          
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              color: '#0f172a',
              fontSize: '18px',
            }}>
              IQ
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px', color: '#f8fafc' }}>InvestIQ</div>
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Analyst Desk</div>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(2, 132, 199, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span> New Research Chat
          </button>

          {/* Chat History List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', paddingRight: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Recent Chats
            </div>

            {loadingHistory ? (
              <div style={{ fontSize: '12px', color: '#64748b', padding: '10px' }}>Loading history...</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#475569', padding: '10px', fontStyle: 'italic' }}>No past chats yet.</div>
            ) : (
              history.map((item) => {
                const recStyle = getRecommendationStyle(item.recommendation);
                const isSelected = activeAnalysis?._id === item._id;
                return (
                  <button
                    key={item._id}
                    onClick={() => handleSelectHistoryItem(item)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: isSelected ? '#1e293b' : 'transparent',
                      border: isSelected ? '1px solid #334155' : '1px solid transparent',
                      color: '#cbd5e1',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                        💬 {item.companyName}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: recStyle.bg,
                        color: recStyle.color,
                        border: `1px solid ${recStyle.border}`,
                      }}>
                        {item.investmentScore}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* User Profile Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', background: '#0b1329', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '700', padding: '6px' }}
          >
            Exit
          </button>
        </div>
      </aside>

      {/* MAIN CHAT STREAM AREA */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 0%, #131c31 0%, #090d16 100%)',
      }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: '60px',
          padding: '0 32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' }}>
            <span>Model:</span>
            <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontWeight: '700', fontSize: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              ⚡ Gemini 1.5 Flash + Tavily Web
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {activeAnalysis ? `Active Report: ${activeAnalysis.companyName}` : 'Ready for inquiry'}
          </div>
        </header>

        {/* Central Chat Stream Box */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 24px 120px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* VIEW 1: GEMINI / CHATGPT WELCOME SCREEN (When Idle) */}
            {!activeAnalysis && !runningAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '60px', animation: 'fadeIn 0.5s ease-in' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #0284c7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '24px', boxShadow: '0 12px 32px rgba(56, 189, 248, 0.25)' }}>
                  ✨
                </div>
                <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '12px', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  What company shall we research today?
                </h2>
                <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '540px', lineHeight: '1.6', marginBottom: '40px' }}>
                  Type any company ticker below for live RAG suggestions. You can also optionally attach a PDF earnings report using the paperclip icon.
                </p>

                {/* Suggestion Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '700px' }}>
                  {[
                    { ticker: 'TESLA', prompt: 'Analyze Tesla (TSLA) EV delivery margins & robo-taxi news', icon: '🚗' },
                    { ticker: 'APPLE', prompt: 'Evaluate Apple (AAPL) services revenue & AI roadmap', icon: '📱' },
                    { ticker: 'TATA', prompt: 'Assess Tata Motors debt reduction & EV market share', icon: '⚡' },
                    { ticker: 'MICROSOFT', prompt: 'Research Microsoft Azure AI monetization thesis', icon: '🌐' },
                  ].map((sug, i) => (
                    <button
                      key={i}
                      onClick={(e) => handleSendMessage(e, sug.ticker)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#cbd5e1',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <span style={{ fontSize: '20px' }}>{sug.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc', marginBottom: '4px' }}>{sug.ticker} Analysis</div>
                        <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{sug.prompt}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ERROR ALERT */}
            {feedbackError && (
              <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>⚠️</span>
                <span>{feedbackError}</span>
              </div>
            )}

            {/* VIEW 2: USER PROMPT BUBBLE (When Active or Running) */}
            {(runningAnalysis || activeAnalysis) && activePrompt && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '14px 20px',
                  borderRadius: '20px 20px 4px 20px',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '500',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.3)',
                }}>
                  {activePrompt}
                </div>
              </div>
            )}

            {/* VIEW 3: AI RUNNING / LOADING BUBBLE */}
            {runningAnalysis && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0f172a', fontSize: '14px', flexShrink: 0 }}>
                  IQ
                </div>
                <div style={{ flex: 1, padding: '24px', borderRadius: '4px 20px 20px 20px', background: '#1e293b', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontWeight: '700', color: '#38bdf8', fontSize: '15px' }}>InvestIQ AI is researching...</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    &gt; {loadingStep || 'Synthesizing equity insights...'}
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              </div>
            )}

            {/* VIEW 4: AI COMPLETED RECOMMENDATION CARD */}
            {activeAnalysis && !runningAnalysis && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#0f172a', fontSize: '14px', flexShrink: 0 }}>
                  IQ
                </div>
                
                {/* Institutional Chat Card */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px', borderRadius: '4px 20px 20px 20px', background: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 12px 36px rgba(0,0,0,0.25)' }}>
                  
                  {/* Top Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Investment Analyst Report</span>
                      <h3 style={{ fontSize: '28px', fontWeight: '900', margin: '4px 0 0 0', color: '#ffffff' }}>{activeAnalysis.companyName}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Investment Score</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: getScoreColor(activeAnalysis.investmentScore) }}>{activeAnalysis.investmentScore}/100</div>
                      </div>
                      
                      {(() => {
                        const recStyle = getRecommendationStyle(activeAnalysis.recommendation);
                        return (
                          <div style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: '900', fontSize: '14px', background: recStyle.bg, color: recStyle.color, border: `1px solid ${recStyle.border}` }}>
                            {activeAnalysis.recommendation}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Thesis Reasoning (Executive Summary) */}
                  <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.08)', borderLeft: '4px solid #38bdf8' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '6px' }}>💡 Concluding Investment Thesis</div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0', fontWeight: '500' }}>{activeAnalysis.finalReasoning}</p>
                  </div>

                  {/* Financial & Document Insights */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '16px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>📊 Financial Overview</div>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1' }}>{activeAnalysis.financialSummary}</p>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>📑 RAG Filing Disclosures</div>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1' }}>{activeAnalysis.documentInsights}</p>
                    </div>
                  </div>

                  {/* 3-Column Strengths / Weaknesses / Risks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#4ade80', marginBottom: '8px' }}>✓ Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                        {activeAnalysis.strengths?.map((s, idx) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#facc15', marginBottom: '8px' }}>⚠️ Weaknesses</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                        {activeAnalysis.weaknesses?.map((w, idx) => <li key={idx}>{w}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#f87171', marginBottom: '8px' }}>✕ Macro Risks</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                        {activeAnalysis.risks?.map((r, idx) => <li key={idx}>{r}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Live Web News Citations */}
                  {activeAnalysis.latestNews?.length > 0 && (
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px' }}>🌐 Live Web Intelligence (Tavily)</div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                        {activeAnalysis.latestNews.map((n, idx) => <li key={idx}>{n}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* FIXED BOTTOM INPUT PROMPT BAR (Gemini / ChatGPT Style) */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '0',
          right: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 24px',
          pointerEvents: 'none',
        }}>
          <div style={{ width: '100%', maxWidth: '860px', pointerEvents: 'auto' }}>
            
            {/* Attached file indicator */}
            {attachedFile && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: '#0284c7', color: '#ffffff', fontSize: '12px', fontWeight: '700', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                <span>📄 {attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '900', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Prompt Input Box */}
            <form onSubmit={(e) => handleSendMessage(e)} style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '28px', padding: '8px 12px', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
              
              {/* Hidden File Input & Paperclip Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Optional: Attach PDF Report (non-compulsory)"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: attachedFile ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: 'none',
                  color: attachedFile ? '#38bdf8' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Main Text Prompt */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={attachedFile ? `Ask InvestIQ to analyze ${attachedFile.name}...` : "Ask InvestIQ to research any stock (e.g. TESLA, NVIDIA)..."}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '15px',
                  padding: '10px 14px',
                  outline: 'none',
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !attachedFile) || runningAnalysis}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: (!inputText.trim() && !attachedFile) || runningAnalysis ? '#334155' : '#38bdf8',
                  color: '#0f172a',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!inputText.trim() && !attachedFile) || runningAnalysis ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: '900',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

            </form>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
              InvestIQ AI can make mistakes. Verify important financial disclosures.
            </div>
          </div>
        </div>

      </main>

    </div>
  );
};

export default Dashboard;
