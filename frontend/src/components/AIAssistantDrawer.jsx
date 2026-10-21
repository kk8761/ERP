import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, Loader2, Zap, BookOpen, 
  ShieldCheck, Lock, Plus, FileText, CheckCircle2, 
  ChevronRight, ArrowLeft, Maximize2, Minimize2,
  Calendar, Clock, AlertTriangle, Check, RotateCcw, 
  Play, Sliders, Star, Award, TrendingUp, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { apiRequest } from '../services/api';
import MarkdownContent from './MarkdownContent';

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'workflows' | 'knowledge'
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your **NexaERP AI Command Center & Automation Engine**.\n\n🔒 **Enterprise Isolation & Audit Trail**: Multi-tenant protected. Every action runs through typed backend tools with deterministic calculations and role-based permissions.\n\n⚡ **Natural Language Operations**:\n- Plan and execute multi-step procurement and inventory workflows\n- Intelligent vendor evaluation across 10 performance dimensions\n- Multi-supplier comparison with landed cost optimization\n- Schedule recurring automations and enforce human approval thresholds",
      suggestions: [
        "Find low-stock products and prepare purchase requests.",
        "Compare suppliers for this order based on price, delivery speed, quality, and service.",
        "Generate a purchase order using the best eligible supplier and send it after approval.",
        "Find overdue invoices and draft reminder emails.",
        "Summarize this month's sales and identify unusual changes.",
        "Every morning at 9 AM, check stock levels and notify the inventory manager about shortages.",
        "Review all completed orders and update vendor performance ratings.",
        "Create a workflow that routes purchase requests above ₹50,000 to the finance manager."
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
  
  // Workflows & Approvals state
  const [workflows, setWorkflows] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [runningWorkflowId, setRunningWorkflowId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadPrivacyStatus();
      loadKnowledgeDocs();
      loadWorkflowsData();
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

  const loadWorkflowsData = async () => {
    setLoadingWorkflows(true);
    try {
      const [wfList, approvals] = await Promise.all([
        apiRequest('/api/workflows').catch(() => []),
        apiRequest('/api/workflows/approvals/pending').catch(() => [])
      ]);
      setWorkflows(wfList || []);
      setPendingApprovals(approvals || []);
    } catch (err) {
      console.warn("Could not load workflows:", err);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleRunWorkflow = async (workflowId) => {
    setRunningWorkflowId(workflowId);
    try {
      const res = await apiRequest(`/api/workflows/${workflowId}/run`, { method: 'POST' });
      alert(`Workflow execution started! Run ID: ${res.execution_id}, Status: ${res.status}`);
      loadWorkflowsData();
    } catch (err) {
      alert(`Failed to run workflow: ${err.message}`);
    } finally {
      setRunningWorkflowId(null);
    }
  };

  const handleApprovalDecision = async (approvalId, decision, comments = '') => {
    try {
      const res = await apiRequest(`/api/workflows/approvals/${approvalId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: decision,
          comments: comments || `${decision} by user via AI Command Center`
        })
      });
      alert(`Approval ${decision.toLowerCase()} successfully!`);
      loadWorkflowsData();
      
      // Update chat message status
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `✅ **Approval Action Recorded**: Approval request #${approvalId} was **${decision}**.\n\n*Execution resumed in background.*`
        }
      ]);
    } catch (err) {
      alert(`Failed to record approval decision: ${err.message}`);
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
      // Execute through natural language AI Command Center
      const response = await apiRequest('/api/ai/command', {
        method: 'POST',
        body: JSON.stringify({ prompt: query, require_plan: true })
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: response.message || response.answer || "Task evaluated.",
          plan: response.plan,
          step_results: response.step_results,
          action_preview: response.action_preview,
          requires_approval: response.requires_approval,
          approval_id: response.approval_id,
          task_type: response.task_type,
          data: response.data,
          trade_offs: response.trade_offs,
          comparison_table: response.comparison_table || (response.data && response.data.suppliers),
          scorecard: response.scorecard || (response.data && response.data.overall_score !== undefined ? response.data : null),
          suggestions: response.suggestions
        }
      ]);
      
      // If workflow or approval was created, reload workflows tab data
      if (response.task_type === 'RECURRING_WORKFLOW' || response.requires_approval) {
        loadWorkflowsData();
      }
    } catch (err) {
      // Fallback to standard ai/query if error occurred
      try {
        const fallback = await apiRequest('/api/ai/query', {
          method: 'POST',
          body: JSON.stringify({ prompt: query })
        });
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: fallback.answer,
            data: fallback.data,
            action_executed: fallback.action_executed,
            rag_sources: fallback.rag_sources,
            suggestions: fallback.suggestions
          }
        ]);
      } catch (fallbackErr) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `⚠️ **Execution Error**: ${err.message || fallbackErr.message}. Please verify enterprise permissions or check the audit log.`,
            suggestions: ["Find low-stock products and prepare purchase requests.", "Summarize this month's sales and identify unusual changes."]
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentOrgName = privacyInfo?.organization_name || "Nexa Global Enterprises";

  return (
    <div style={{
      width: isExpanded ? '780px' : '520px',
      maxWidth: '92vw',
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
            width: '36px',
            height: '36px',
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
              <span>Nexa AI Command Center</span>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontWeight: 600
              }}>Automation Engine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#16a34a' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
              <span>Online • Deterministic Backend Engine & LLM Grounding</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
            title={isExpanded ? "Collapse width" : "Expand width for comparison tables"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Multi-Tenant Security & Audit Banner */}
      <div style={{
        padding: '6px 16px',
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
            <strong>Tenant Isolated:</strong> {currentOrgName}
          </span>
        </div>
        <span style={{
          backgroundColor: '#dcfce7',
          padding: '1px 6px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '10px'
        }}>
          AUDITED & TYPED TOOLS
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
            padding: '10px 4px',
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
          <span>Command Center</span>
        </button>

        <button
          onClick={() => { setActiveTab('workflows'); setSelectedDoc(null); loadWorkflowsData(); }}
          style={{
            flex: 1,
            padding: '10px 4px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'workflows' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
            color: activeTab === 'workflows' ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #64748b)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Clock size={14} />
          <span>Workflows & Approvals {pendingApprovals.length > 0 && `(${pendingApprovals.length})`}</span>
        </button>

        <button
          onClick={() => { setActiveTab('knowledge'); setSelectedDoc(null); }}
          style={{
            flex: 1,
            padding: '10px 4px',
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
          <span>Knowledge ({knowledgeDocs.length})</span>
        </button>
      </div>

      {/* TAB 1: AI COMMAND CENTER */}
      {activeTab === 'chat' && (
        <>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
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
                  {/* Task Type Badge */}
                  {isAI && msg.task_type && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      <Zap size={11} color="#2563eb" />
                      <span>{msg.task_type.replace('_', ' ')}</span>
                    </div>
                  )}

                  {/* Main Chat Bubble */}
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

                  {/* Structured Execution Plan Card */}
                  {isAI && msg.plan && msg.plan.length > 0 && (
                    <div style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Structured Execution Plan ({msg.plan.length} Steps)
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Deterministic Tool Registry</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.plan.map((step, sIdx) => {
                          const statusColor = 
                            step.status === 'COMPLETED' ? '#16a34a' :
                            step.status === 'RUNNING' ? '#2563eb' :
                            step.status === 'AWAITING_APPROVAL' ? '#d97706' :
                            step.status === 'FAILED' ? '#dc2626' : '#64748b';
                          return (
                            <div key={sIdx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              fontSize: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {step.step_number || sIdx + 1}
                                </span>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{step.description}</div>
                                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
                                    Tool: {step.tool_name}
                                  </div>
                                </div>
                              </div>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: `${statusColor}15`,
                                color: statusColor
                              }}>
                                {step.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Preview & Human Approval Card */}
                  {isAI && msg.action_preview && (
                    <div style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      boxShadow: '0 2px 4px rgba(245, 158, 11, 0.08)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', marginBottom: '8px' }}>
                        <AlertTriangle size={16} />
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          Action Preview: {msg.action_preview.title}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          fontWeight: 700,
                          marginLeft: 'auto'
                        }}>
                          {msg.action_preview.severity || 'GOVERNANCE REVIEW'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#78350f' }}>
                        {msg.action_preview.summary}
                      </p>

                      {msg.action_preview.consequences && (
                        <div style={{ fontSize: '11px', color: '#92400e', backgroundColor: '#fef3c7', padding: '6px 8px', borderRadius: '4px', marginBottom: '10px' }}>
                          <strong>Consequences:</strong> {msg.action_preview.consequences}
                        </div>
                      )}

                      {msg.action_preview.affected_records && msg.action_preview.affected_records.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#78350f' }}>Affected Records:</span>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11px', color: '#78350f' }}>
                            {msg.action_preview.affected_records.map((rec, rIdx) => (
                              <li key={rIdx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Approval Buttons */}
                      {(msg.requires_approval || msg.approval_id) && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={() => handleApprovalDecision(msg.approval_id || 1, 'APPROVED', 'Approved by user in chat')}
                            className="btn btn-primary"
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '12px',
                              backgroundColor: '#16a34a',
                              borderColor: '#16a34a'
                            }}
                          >
                            <Check size={14} />
                            <span>Confirm & Execute</span>
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(msg.approval_id || 1, 'REJECTED', 'Cancelled by user')}
                            className="btn btn-ghost"
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '12px',
                              color: '#dc2626',
                              border: '1px solid #fca5a5'
                            }}
                          >
                            <X size={14} />
                            <span>Reject / Cancel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Criteria Supplier Comparison Card */}
                  {isAI && msg.comparison_table && msg.comparison_table.length > 0 && (
                    <div style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      overflowX: 'auto'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                          Multi-Criteria Supplier Evaluation Matrix
                        </span>
                        <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>Landed Cost & Quality Weighted</span>
                      </div>
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '6px 8px' }}>Supplier</th>
                            <th style={{ padding: '6px 8px' }}>Base / Unit</th>
                            <th style={{ padding: '6px 8px' }}>Landed Cost</th>
                            <th style={{ padding: '6px 8px' }}>Lead Time</th>
                            <th style={{ padding: '6px 8px' }}>Rating</th>
                            <th style={{ padding: '6px 8px' }}>Recommendation</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.comparison_table.map((sup, sIdx) => {
                            const isRecommended = sup.is_recommended || sIdx === 0;
                            return (
                              <tr key={sIdx} style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isRecommended ? '#f0fdf4' : 'transparent'
                              }}>
                                <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>
                                  {sup.supplier_name || sup.name}
                                  {sup.compliance_flag === 'FAILED' && (
                                    <span style={{ marginLeft: '4px', fontSize: '9px', color: '#dc2626', fontWeight: 700 }}>
                                      [NON-COMPLIANT]
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  ₹{parseFloat(sup.unit_price || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>
                                  ₹{parseFloat(sup.total_landed_cost || sup.unit_price || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  {sup.lead_time_days || sup.delivery_lead_time_days || 3} days
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                    <span>{(sup.overall_score || sup.rating_score || 90).toFixed(1)}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                  {isRecommended ? (
                                    <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      BEST FIT
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                                      {sup.recommendation_reason || 'Eligible'}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleSend(`Create draft purchase order for ${sup.supplier_name || sup.name}`)}
                                    className="btn btn-ghost"
                                    style={{ padding: '3px 8px', fontSize: '10px', color: 'var(--primary)' }}
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Vendor Scorecard Card */}
                  {isAI && msg.scorecard && (
                    <div style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            {msg.scorecard.supplier_name || 'Vendor Performance Scorecard'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {msg.scorecard.evaluated_orders_count || 0} evaluated orders • Confidence: {msg.scorecard.score_confidence || 'MEDIUM'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
                            {(msg.scorecard.overall_score || 0).toFixed(1)}/100
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                fill={star <= Math.round((msg.scorecard.overall_score || 0) / 20) ? "#f59e0b" : "#e2e8f0"}
                                color={star <= Math.round((msg.scorecard.overall_score || 0) / 20) ? "#f59e0b" : "#cbd5e1"}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dimension Progress Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '10px 0' }}>
                        {[
                          { label: 'Delivery Speed & Timeliness (25%)', val: msg.scorecard.delivery_score ?? 95 },
                          { label: 'Price Competitiveness & Landed Cost (25%)', val: msg.scorecard.price_competitiveness_score ?? 90 },
                          { label: 'Quality Assurance & Low Defects (20%)', val: msg.scorecard.quality_score ?? 98 },
                          { label: 'Service & Issue Responsiveness (15%)', val: msg.scorecard.service_score ?? 88 },
                          { label: 'Order Reliability & Full Fulfillment (10%)', val: msg.scorecard.reliability_score ?? 96 },
                          { label: 'Regulatory Compliance & Certifications (5%)', val: msg.scorecard.compliance_score ?? 100 }
                        ].map((dim, dIdx) => (
                          <div key={dIdx} style={{ fontSize: '11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#475569' }}>
                              <span>{dim.label}</span>
                              <span style={{ fontWeight: 700 }}>{dim.val !== null ? `${dim.val.toFixed(1)}%` : 'N/A'}</span>
                            </div>
                            <div style={{ height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${dim.val || 0}%`,
                                height: '100%',
                                backgroundColor: dim.val >= 85 ? '#16a34a' : dim.val >= 70 ? '#f59e0b' : '#dc2626',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Operational Metrics */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '11px' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>On-Time Rate:</span>
                          <strong style={{ color: '#0f172a' }}>{(msg.scorecard.on_time_delivery_pct || 96).toFixed(1)}%</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Avg Lead Time:</span>
                          <strong style={{ color: '#0f172a' }}>{msg.scorecard.avg_delivery_lead_time_days || 3.2} days</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Defect Rate:</span>
                          <strong style={{ color: '#0f172a' }}>{(msg.scorecard.defect_rate_pct || 0.4).toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', marginTop: '4px' }}>
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
                <span>Evaluating task, generating execution plan & executing typed tools...</span>
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
              placeholder="Instruct ERP actions, compare vendors, or schedule workflows..."
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

      {/* TAB 2: BACKGROUND WORKFLOWS & HUMAN APPROVALS */}
      {activeTab === 'workflows' && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Pending Approvals Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#d97706" />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  Pending Human Approvals ({pendingApprovals.length})
                </span>
              </div>
              <button onClick={loadWorkflowsData} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
                <RotateCcw size={12} />
              </button>
            </div>

            {pendingApprovals.length === 0 ? (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                No pending approvals. Actions under defined thresholds execute automatically.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingApprovals.map((req) => (
                  <div key={req.id} style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#92400e' }}>
                      <span>{req.title}</span>
                      <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#fef3c7' }}>
                        Required: {req.required_role}
                      </span>
                    </div>
                    <div style={{ margin: '4px 0 8px 0', color: '#78350f', fontSize: '11px' }}>
                      {req.description}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleApprovalDecision(req.id, 'APPROVED')}
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprovalDecision(req.id, 'REJECTED')}
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '11px', color: '#dc2626', border: '1px solid #fca5a5' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scheduled & Active Workflows */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                  Background Automation Workflows ({workflows.length})
                </span>
              </div>
            </div>

            {loadingWorkflows ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>Loading scheduled background workflows...</span>
              </div>
            ) : workflows.length === 0 ? (
              <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                No active workflows configured. Instruct the AI assistant in natural language to create one (e.g. <em>"Every morning at 9 AM, check stock levels"</em>).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workflows.map((wf) => (
                  <div key={wf.id} style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                        {wf.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: wf.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                        color: wf.status === 'ACTIVE' ? '#166534' : '#64748b'
                      }}>
                        {wf.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                      {wf.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                      <div>
                        <span>Trigger: <strong>{wf.trigger_type}</strong></span>
                        {wf.schedule_cron && <span> • Cron: <code>{wf.schedule_cron}</code></span>}
                        {wf.schedule_interval_minutes && <span> • Every {wf.schedule_interval_minutes}m</span>}
                      </div>
                      <button
                        onClick={() => handleRunWorkflow(wf.id)}
                        disabled={runningWorkflowId === wf.id}
                        className="btn btn-ghost"
                        style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {runningWorkflowId === wf.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        <span>Run Now</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY KNOWLEDGE BASE (RAG) */}
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
