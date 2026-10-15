import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Maximize2, Send, Bot, User, Loader2 } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your **NexaERP AI Assistant**. I can help you analyze sales figures, check low inventory levels, inspect expense distributions, and draft reports.\n\nSelect a quick query below or type your question!",
      suggestions: [
        "Show today's sales summary",
        "Which items are low in stock?",
        "Generate monthly report",
        "Suggest reorder items",
        "Show profit analysis"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    setInput('');
    // Append user message
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
          suggestions: response.suggestions
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ I encountered an error retrieving data: ${err.message}. Please check your permissions or try again.`,
          suggestions: ["Show today's sales summary", "Which items are low in stock?"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      width: '380px',
      height: 'calc(100vh - var(--header-height))',
      backgroundColor: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Nexa AI Assistant</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--success-text)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
              <span>Online</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', borderRadius: 'var(--radius-full)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Subheader */}
      <div style={{ padding: '10px 20px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>
        Ask anything about your business...
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {messages.map((msg, index) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isAI ? 'flex-start' : 'flex-end',
              gap: '8px'
            }}>
              <div style={{
                maxWidth: '92%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isAI ? 'var(--bg-subtle)' : 'var(--primary)',
                color: isAI ? 'var(--text-main)' : '#ffffff',
                border: isAI ? '1px solid var(--border-color)' : 'none',
                fontSize: '13px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>

              {/* Suggestions Chips matching screenshot */}
              {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '4px' }}>
                  {msg.suggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSend(suggestion)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px',
                        color: 'var(--primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '8px' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Analyzing database records...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Type your question..."
          className="form-input"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-full)' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: input.trim() ? 'var(--primary)' : 'var(--border-color)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.15s ease'
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
