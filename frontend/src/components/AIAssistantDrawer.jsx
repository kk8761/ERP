import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, Loader2, Zap, BookOpen, 
  ShieldCheck, Lock, Plus, FileText, CheckCircle2, 
  ChevronRight, ArrowLeft, Maximize2, Minimize2 
} from 'lucide-react';
import { apiRequest } from '../services/api';
import MarkdownContent from './MarkdownContent';

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'knowledge'
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your **NexaERP AI Copilot** powered by Groq LLM (qwen/qwen3.8-27b) and your company's isolated operational knowledge base.\n\n🔒 **Company Boundary Protected**: Your queries, live ERP metrics, and documents never cross outside your organization's perimeter.\n\n💬 **Ask company questions**: Operational SOPs, procurement thresholds, return policies, leave entitlements, accounting standards.\n\n⚡ **Action execution**: Issue POs, raise requisitions, or adjust inventory directly through chat.",
      suggestions: [
        "What is our corporate procurement policy?",
        "What is our customer return policy?",
        "Create PO for 25 units of Basmati Rice from Adani Wilmar",
        "Create purchase requisition for 50 units of Atta",
        "Show today's sales summary",
        "Which items are low in stock?"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [privacyInfo, setPrivacyInfo] = useState(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'Operational SOP', content: '', tags: '' });
  const [savingDoc, setSavingDoc] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadPrivacyStatus();
      loadKnowledgeDocs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  const loadPrivacyStatus = async () => {
    try {
      const data = await apiRequest('/api/ai/privacy-status');
      setPrivacyInfo(data);
    } catch (err) {
      console.warn("Could not load privacy status:", err);
    }
  };

  const loadKnowledgeDocs = async () => {
    setLoadingDocs(true);
    try {
      const docs = await apiRequest('/api/ai/knowledge');
      setKnowledgeDocs(docs || []);
    } catch (err) {
      console.warn("Could not load knowledge docs:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) return;
    setSavingDoc(true);
    try {
      const created = await apiRequest('/api/ai/knowledge', {
        method: 'POST',
        body: JSON.stringify(newDoc)
      });
      setKnowledgeDocs(prev => [created, ...prev]);
      setShowAddDocModal(false);
      setNewDoc({ title: '', category: 'Operational SOP', content: '', tags: '' });
      // Notify chat
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `📄 **New Company Policy Indexed**: Successfully added **${created.title}** (${created.doc_code}) to your organization's RAG knowledge base. All future AI queries will cite this document!`,
          suggestions: [`What does ${created.title} say?`, "Show today's sales summary"]
        }
      ]);
      setActiveTab('chat');
    } catch (err) {
      alert(`Error creating document: ${err.message}`);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setLoading(true);

    try {
      const response = await apiRequest('/api/ai/query', {
        method: 'POST',
        body: JSON.stringify({ prompt: query })
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: response.answer,
          data: response.data,
          action_executed: response.action_executed,
          needs_details: response.needs_details,
          action_details: response.action_details,
          rag_sources: response.rag_sources,
          organization_name: response.organization_name,
          suggestions: response.suggestions
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ Error executing query: ${err.message}. Please verify enterprise permissions.`,
          suggestions: ["Show today's sales summary", "Which items are low in stock?"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentOrgName = privacyInfo?.organization_name || "Nexa Global Enterprises";

  return (
    <div style={{
      width: isExpanded ? '680px' : '460px',
      maxWidth: '90vw',
      transition: 'width 0.25s ease',
      height: 'calc(100vh - var(--header-height, 64px))',
      backgroundColor: 'var(--bg-surface, #ffffff)',
      borderLeft: '1px solid var(--border-color, #e2e8f0)',
      boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1))',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-subtle, #f8fafc)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary-light, #eff6ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary, #2563eb)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Nexa AI Copilot</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontWeight: 600
              }}>Groq LLM</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
              <span>Online • {privacyInfo?.active_model || 'qwen/qwen3.8-27b'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
            title={isExpanded ? "Collapse width (460px)" : "Expand width for wide tables (680px)"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tenant Privacy & Isolation Shield Banner */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#f0fdf4',
        borderBottom: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#166534'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <ShieldCheck size={14} color="#16a34a" style={{ flexShrink: 0 }} />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <strong>Isolated Tenant:</strong> {currentOrgName}
          </span>
        </div>
        <span style={{
          backgroundColor: '#dcfce7',
          padding: '1px 6px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '10px'
        }}>
          PII SHIELD
        </span>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        backgroundColor: 'var(--bg-surface, #ffffff)'
      }}>
        <button
          onClick={() => { setActiveTab('chat'); setSelectedDoc(null); }}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
            color: activeTab === 'chat' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #64748b)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Bot size={14} />
          <span>Copilot Chat</span>
        </button>
        <button
          onClick={() => { setActiveTab('knowledge'); setSelectedDoc(null); }}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'knowledge' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
            color: activeTab === 'knowledge' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #64748b)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={14} />
          <span>Knowledge Base ({knowledgeDocs.length})</span>
        </button>
      </div>

      {/* TAB 1: COPILOT CHAT */}
      {activeTab === 'chat' && (
        <>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((msg, index) => {
              const isAI = msg.sender === 'ai';
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isAI ? 'flex-start' : 'flex-end',
                  gap: '6px'
                }}>
                  {isAI && msg.action_executed && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      <Zap size={12} color="#059669" />
                      <span>ACTION EXECUTED & AUDITED</span>
                    </div>
                  )}

                  {isAI && msg.needs_details && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      <Sparkles size={12} color="#2563eb" />
                      <span>ACTION DETAILS NEEDED</span>
                    </div>
                  )}

                  <div style={{
                    maxWidth: isAI ? '100%' : '90%',
                    width: isAI ? '100%' : 'auto',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isAI ? 'var(--bg-subtle, #f8fafc)' : 'var(--primary, #2563eb)',
                    color: isAI ? 'var(--text-main, #0f172a)' : '#ffffff',
                    border: isAI ? '1px solid var(--border-color, #e2e8f0)' : 'none',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    boxShadow: isAI ? '0 1px 3px rgba(0,0,0,0.04)' : 'none'
                  }}>
                    {isAI ? (
                      <MarkdownContent content={msg.text} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    )}
                  </div>

                  {/* Grounded RAG Citations */}
                  {isAI && msg.rag_sources && msg.rag_sources.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '92%' }}>
                      {msg.rag_sources.map((src, sIdx) => (
                        <span key={sIdx} style={{
                          fontSize: '10px',
                          color: '#0369a1',
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontWeight: 500
                        }}>
                          <BookOpen size={10} color="#0284c7" />
                          <span>{src}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', marginTop: '3px' }}>
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(suggestion)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            fontSize: '11px',
                            color: 'var(--primary, #2563eb)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Sparkles size={12} />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #64748b)', fontSize: '12px', padding: '8px' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>Grounding query with company knowledge & Groq LLM...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-surface, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Ask policies, stock, or instruct actions..."
              className="form-input"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', fontSize: '12px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: input.trim() ? 'var(--primary, #2563eb)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}

      {/* TAB 2: COMPANY KNOWLEDGE BASE (RAG) */}
      {activeTab === 'knowledge' && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {selectedDoc ? (
            /* Document Detail View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #2563eb)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Documents</span>
              </button>

              <div style={{
                padding: '14px',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #e2e8f0)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary, #2563eb)' }}>
                    {selectedDoc.doc_code}
                  </span>
                  <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                    {selectedDoc.category}
                  </span>
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-main, #0f172a)' }}>
                  {selectedDoc.title}
                </h4>
                <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary, #475569)', whiteSpace: 'pre-wrap' }}>
                  {selectedDoc.content}
                </div>
                {selectedDoc.tags && (
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
                    <strong>Keywords:</strong> {selectedDoc.tags}
                  </div>
                )}
              </div>
            </div>
          ) : showAddDocModal ? (
            /* Add New Policy Form */
            <form onSubmit={handleCreateDoc} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '13px' }}>Add Company Policy / SOP</h4>
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel & Entertainment Expense SOP"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Category</label>
                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Procurement & Governance">Procurement & Governance</option>
                  <option value="Supply Chain & Warehousing">Supply Chain & Warehousing</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Human Capital Management">Human Capital Management</option>
                  <option value="Sales & Retail">Sales & Retail</option>
                  <option value="Information Security">Information Security</option>
                  <option value="Operational SOP">Operational SOP</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Policy / Rule Content</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explain exact policy limits, approvals required, standard timeframes..."
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Keywords (Tags)</label>
                <input
                  type="text"
                  placeholder="e.g. travel, flight, meal, reimbursement, approval"
                  value={newDoc.tags}
                  onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--primary, #2563eb)', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  {savingDoc ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          ) : (
            /* Document List */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Isolated to <strong>{currentOrgName}</strong>
                </span>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} />
                  <span>Add Policy</span>
                </button>
              </div>

              {loadingDocs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading company policies...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {knowledgeDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-subtle, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)'; }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary, #2563eb)' }}>
                            {doc.doc_code}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>• {doc.category}</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.title}
                        </div>
                      </div>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
