import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Send, Inbox, Star, Sparkles, RefreshCw, AlertCircle,
  CheckCircle2, Clock, Tag, FileText, DollarSign, Calendar,
  ArrowRight, Search, Filter, X, ShieldCheck, Check, Zap,
  ChevronRight, Reply, CornerUpRight, Trash2, ShieldAlert,
  Sliders, MessageSquare, Copy, Settings, ExternalLink, Lock, Key,
  Paperclip, Download, Bold, Italic, Underline, List, Quote, Code,
  Link, File, Image, Archive, ReplyAll, Eye, EyeOff, Flag, Plus,
  Truck, Building2, Briefcase, Activity, Package, CheckCheck
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Helper: Format bytes to human readable string
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper: Download attachment data base64 directly
function downloadAttachment(att) {
  if (!att || !att.data_base64) return;
  const link = document.createElement('a');
  link.href = `data:${att.content_type || 'application/octet-stream'};base64,${att.data_base64}`;
  link.download = att.filename || 'attachment';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper: Parse attachments data safely
function parseAttachments(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export default function EmailHubPage({ onNavigate }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Folders: 'inbox' | 'starred' | 'sent' | 'drafts' | 'urgent' | 'archived' | 'trash'
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedSentEmail, setSelectedSentEmail] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [isForwardingOriginal, setIsForwardingOriginal] = useState(false);
  const [rawSourceModalData, setRawSourceModalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // SMTP Relay Configuration & Diagnostics State
  const [smtpConfig, setSmtpConfig] = useState(null);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpFormData, setSmtpFormData] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_use_tls: true,
    smtp_from_email: '',
    smtp_from_name: 'NexaERP Enterprise Mailer'
  });
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [smtpTab, setSmtpTab] = useState('gmail'); // 'gmail' | 'custom'

  // Composer Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composeData, setComposeData] = useState({
    draft_id: null,
    recipient_email: '',
    recipient_name: '',
    cc_recipients: '',
    bcc_recipients: '',
    subject: '',
    body_text: '',
    attachments: [],
    priority: 'NORMAL',
    document_type: 'GENERAL_COMMUNICATION',
    document_reference: 'COMM-OUT',
    cc_me: true,
    original_mail_id: null
  });
  const [aiPromptTopic, setAiPromptTopic] = useState('');
  const [aiTone, setAiTone] = useState('formal');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Role & Duties Context
  const [userContext, setUserContext] = useState(null);

  // Vendor Master & PO Context
  const [vendorsAndOrders, setVendorsAndOrders] = useState([]);
  const [linkedVendor, setLinkedVendor] = useState(null);
  const [linkedOrder, setLinkedOrder] = useState(null);
  const [isMatchingVendor, setIsMatchingVendor] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);

  // Full Flow Order Tracking Modal
  const [orderTrackingModal, setOrderTrackingModal] = useState({
    isOpen: false,
    orderRef: '',
    data: null,
    loading: false
  });

  // Auto-sync timer (every 45s)
  const [secondsUntilSync, setSecondsUntilSync] = useState(45);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Inbox Emails with folder routing
  const fetchInbox = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = `/api/emails/inbox?limit=50&folder=${activeFolder}`;
      if (categoryFilter !== 'ALL') url += `&category=${categoryFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const data = await apiRequest(url);
      setEmails(data || []);

      if (data && data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      } else if (selectedEmail && data) {
        const found = data.find(e => e.id === selectedEmail.id);
        if (found) setSelectedEmail(found);
      }
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Load Sent Emails
  const fetchSent = async () => {
    try {
      const data = await apiRequest('/api/emails/sent?limit=50');
      setSentEmails(data || []);
      if (data && data.length > 0 && !selectedSentEmail) {
        setSelectedSentEmail(data[0]);
      }
    } catch (err) {
      console.error('Failed to load sent emails:', err);
    }
  };

  // Load Drafts
  const fetchDrafts = async () => {
    try {
      const data = await apiRequest('/api/emails/drafts');
      setDrafts(data || []);
      if (data && data.length > 0 && !selectedDraft) {
        setSelectedDraft(data[0]);
      }
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  };

  // Load System Status
  const fetchStatus = async () => {
    try {
      const statusData = await apiRequest('/api/emails/status');
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Failed to fetch email status:', err);
    }
  };

  // Load SMTP Configuration
  const fetchSmtpConfig = async () => {
    try {
      const data = await apiRequest('/api/emails/smtp-config');
      setSmtpConfig(data);
      if (data) {
        setSmtpFormData(prev => ({
          ...prev,
          smtp_host: data.smtp_host || 'smtp.gmail.com',
          smtp_port: data.smtp_port || 587,
          smtp_username: data.smtp_username || prev.smtp_username || (user?.email || ''),
          smtp_use_tls: data.smtp_use_tls !== undefined ? data.smtp_use_tls : true,
          smtp_from_email: data.smtp_from_email || (user?.email || 'procurement@nexaerp.internal'),
          smtp_from_name: data.smtp_from_name || (user?.full_name || 'NexaERP Enterprise Mailer')
        }));
      }
      if (!smtpTestRecipient && user?.email) {
        setSmtpTestRecipient(user.email);
      }
    } catch (err) {
      console.error('Failed to fetch SMTP config:', err);
    }
  };

  // Test SMTP Live Connection & Dispatch
  const handleTestSmtp = async () => {
    if (!smtpFormData.smtp_host || !smtpFormData.smtp_username) {
      setSmtpTestResult({ success: false, message: 'Please provide both SMTP Host and Account Email.' });
      return;
    }
    const targetEmail = smtpTestRecipient.trim() || user?.email;
    if (!targetEmail) {
      setSmtpTestResult({ success: false, message: 'Please enter a test recipient email address.' });
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await apiRequest('/api/emails/smtp-test', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: targetEmail,
          smtp_host: smtpFormData.smtp_host,
          smtp_port: parseInt(smtpFormData.smtp_port, 10) || 587,
          smtp_username: smtpFormData.smtp_username,
          smtp_password: smtpFormData.smtp_password,
          smtp_use_tls: smtpFormData.smtp_use_tls,
          smtp_from_email: smtpFormData.smtp_from_email || smtpFormData.smtp_username,
          smtp_from_name: smtpFormData.smtp_from_name
        })
      });
      setSmtpTestResult({ success: true, message: res.message || `Live verification email sent to ${targetEmail}!` });
      showToast(`✓ Test email delivered to ${targetEmail}! Check your inbox.`);
    } catch (err) {
      setSmtpTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Save and Persist SMTP Configuration
  const handleSaveSmtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!smtpFormData.smtp_host || !smtpFormData.smtp_username) {
      showToast('Please provide both SMTP Host and Account Email.', 'error');
      return;
    }

    setIsSavingSmtp(true);
    try {
      await apiRequest('/api/emails/smtp-config', {
        method: 'POST',
        body: JSON.stringify({
          smtp_host: smtpFormData.smtp_host,
          smtp_port: parseInt(smtpFormData.smtp_port, 10) || 587,
          smtp_username: smtpFormData.smtp_username,
          smtp_password: smtpFormData.smtp_password,
          smtp_use_tls: smtpFormData.smtp_use_tls,
          smtp_from_email: smtpFormData.smtp_from_email || smtpFormData.smtp_username,
          smtp_from_name: smtpFormData.smtp_from_name
        })
      });
      showToast('🎉 Live SMTP Relay configured! Future emails will reach real inboxes.');
      await fetchSmtpConfig();
      await fetchStatus();
      setIsSmtpModalOpen(false);
    } catch (err) {
      showToast(`Failed to save SMTP settings: ${err.message}`, 'error');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // Manual or Auto Sync Trigger
  const triggerSync = async (isManual = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await apiRequest('/api/emails/inbox/sync', { method: 'POST' });
      // Only show toast notification if manually clicked by the user
      // Completely silent on background periodic auto-sync to avoid notification fatigue
      if (isManual) {
        showToast(`Inbox synchronized! ${res?.new_messages_count || 0} messages synced.`);
      }
      setSecondsUntilSync(45);
      await fetchInbox(false);
      await fetchStatus();
    } catch (err) {
      if (isManual) {
        showToast(`Sync failed: ${err.message}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Load User Role Context
  const fetchUserContext = async () => {
    try {
      const data = await apiRequest('/api/emails/user-context');
      setUserContext(data);
    } catch (err) {
      console.error('Failed to load user context:', err);
    }
  };

  // Load Registered Vendors and Orders
  const fetchVendorsAndOrders = async () => {
    try {
      const data = await apiRequest('/api/emails/vendors-and-orders');
      setVendorsAndOrders(data.vendors || []);
    } catch (err) {
      console.error('Failed to load vendors and orders:', err);
    }
  };

  // Auto-match vendor when recipient changes
  const checkVendorMatch = async (queryText) => {
    if (!queryText || queryText.trim().length < 3) return;
    setIsMatchingVendor(true);
    try {
      const res = await apiRequest(`/api/emails/entities/lookup?query=${encodeURIComponent(queryText.trim())}`);
      if (res && res.matched && res.vendor) {
        setLinkedVendor(res.vendor);
        if (res.vendor.orders && res.vendor.orders.length > 0 && !linkedOrder) {
          setLinkedOrder(res.vendor.orders[0]);
        }
      }
    } catch (err) {
      // silent
    } finally {
      setIsMatchingVendor(false);
    }
  };

  // Open Order Tracking Flow Modal
  const openOrderTracking = async (orderRef) => {
    if (!orderRef) return;
    setOrderTrackingModal({
      isOpen: true,
      orderRef,
      data: null,
      loading: true
    });
    try {
      const data = await apiRequest(`/api/emails/orders/track/${encodeURIComponent(orderRef)}`);
      setOrderTrackingModal({
        isOpen: true,
        orderRef,
        data,
        loading: false
      });
    } catch (err) {
      showToast(`Could not load tracking for ${orderRef}: ${err.message}`, 'error');
      setOrderTrackingModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Advance Order Tracking Stage
  const handleAdvanceOrderStage = async (orderRef, stageKey) => {
    try {
      const res = await apiRequest(`/api/emails/orders/track/${encodeURIComponent(orderRef)}/stage`, {
        method: 'POST',
        body: JSON.stringify({ stage: stageKey })
      });
      setOrderTrackingModal(prev => ({
        ...prev,
        data: res
      }));
      showToast(`Order ${orderRef} stage advanced to ${stageKey}!`);
    } catch (err) {
      showToast(`Failed to update stage: ${err.message}`, 'error');
    }
  };

  // Insert Order Summary into email composer
  const handleInsertOrderSummary = () => {
    if (!linkedOrder) return;
    const itemsText = (linkedOrder.items || [])
      .map(it => `  • ${it.product_name} — Qty: ${it.quantity_ordered || it.quantity} @ ₹${(it.unit_cost || it.unit_price || 0).toLocaleString()} (Line Total: ₹${(it.line_total || 0).toLocaleString()})`)
      .join('\n');

    const summaryBlock = 
`\n\n--- [ERP ORDER SUMMARY: ${linkedOrder.po_number || linkedOrder.order_reference}] ---
• Vendor / Supplier: ${linkedVendor?.name || 'Authorized Partner'} (${linkedVendor?.vendor_code || 'VEND-N/A'})
• Status: ${linkedOrder.status}
• Total Order Value: ₹${(linkedOrder.total_amount || 0).toLocaleString()} INR
• Payment Terms: ${linkedOrder.payment_terms || linkedVendor?.payment_terms || 'Net 30 Days'}
• Line Items:
${itemsText || '  • Standard Procured Items'}
--------------------------------------------------------\n`;

    setComposeData(prev => ({
      ...prev,
      body_text: (prev.body_text ? prev.body_text + summaryBlock : summaryBlock.trim())
    }));
    showToast(`Inserted order summary for ${linkedOrder.po_number || linkedOrder.order_reference}!`);
  };

  // Initial Load
  useEffect(() => {
    fetchInbox();
    fetchSent();
    fetchDrafts();
    fetchStatus();
    fetchSmtpConfig();
    fetchUserContext();
    fetchVendorsAndOrders();
  }, [categoryFilter, activeFolder]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilSync(prev => {
        if (prev <= 1) {
          triggerSync();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Search debounce
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchInbox(false);
    }, 350);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Handle Select Email & Mark Read
  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      try {
        const updated = await apiRequest(`/api/emails/inbox/${email.id}`);
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
        setSelectedEmail(updated);
        fetchStatus();
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  };

  // Toggle Star
  const handleToggleStar = async (e, emailId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const res = await apiRequest(`/api/emails/inbox/${emailId}/toggle-star`, { method: 'POST' });
      setEmails(prev => prev.map(item => item.id === emailId ? { ...item, is_starred: res.is_starred } : item));
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(prev => ({ ...prev, is_starred: res.is_starred }));
      }
    } catch (err) {
      showToast('Could not update star status', 'error');
    }
  };

  // Toggle Read / Unread
  const handleToggleRead = async (e, emailId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const res = await apiRequest(`/api/emails/inbox/${emailId}/toggle-read`, { method: 'POST' });
      setEmails(prev => prev.map(item => item.id === emailId ? { ...item, is_read: res.is_read } : item));
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(prev => ({ ...prev, is_read: res.is_read }));
      }
      showToast(res.is_read ? 'Marked as read' : 'Marked as unread');
      fetchStatus();
    } catch (err) {
      showToast('Could not update read status', 'error');
    }
  };

  // Toggle Trash
  const handleToggleTrash = async (e, emailId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const res = await apiRequest(`/api/emails/inbox/${emailId}/trash`, { method: 'POST' });
      showToast(res.is_trash ? 'Moved to Trash' : 'Restored from Trash');
      await fetchInbox();
      fetchStatus();
    } catch (err) {
      showToast('Could not update trash status', 'error');
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (e, emailId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const res = await apiRequest(`/api/emails/inbox/${emailId}/archive`, { method: 'POST' });
      showToast(res.is_archived ? 'Conversation archived' : 'Moved to Inbox');
      await fetchInbox();
      fetchStatus();
    } catch (err) {
      showToast('Could not update archive status', 'error');
    }
  };

  // Draft Management
  const handleSaveDraft = async () => {
    try {
      const payload = {
        id: composeData.draft_id || undefined,
        recipient_email: composeData.recipient_email,
        recipient_name: composeData.recipient_name,
        cc_recipients: composeData.cc_recipients,
        bcc_recipients: composeData.bcc_recipients,
        subject: composeData.subject || '(Draft - No Subject)',
        body_text: composeData.body_text,
        attachments: composeData.attachments,
        priority: composeData.priority || 'NORMAL'
      };
      const saved = await apiRequest('/api/emails/drafts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setComposeData(prev => ({ ...prev, draft_id: saved.id }));
      showToast('✓ Draft saved successfully!');
      await fetchDrafts();
    } catch (err) {
      showToast(`Failed to save draft: ${err.message}`, 'error');
    }
  };

  const handleDeleteDraft = async (e, draftId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await apiRequest(`/api/emails/drafts/${draftId}`, { method: 'DELETE' });
      showToast('Draft deleted.');
      await fetchDrafts();
    } catch (err) {
      showToast(`Failed to delete draft: ${err.message}`, 'error');
    }
  };

  const handleOpenDraft = (draft) => {
    const parsedAtts = parseAttachments(draft.attachments_data);
    setComposeData({
      draft_id: draft.id,
      recipient_email: draft.recipient_email || '',
      recipient_name: draft.recipient_name || '',
      cc_recipients: draft.cc_recipients || '',
      bcc_recipients: draft.bcc_recipients || '',
      subject: draft.subject || '',
      body_text: draft.body_text || '',
      attachments: parsedAtts,
      priority: draft.priority || 'NORMAL',
      document_type: 'GENERAL_COMMUNICATION',
      document_reference: 'COMM-OUT',
      cc_me: true
    });
    if (draft.cc_recipients) setShowCc(true);
    if (draft.bcc_recipients) setShowBcc(true);
    setIsComposeOpen(true);
  };

  // Attachment Management in Composer
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 15MB limit.`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(',')[1];
        setComposeData(prev => ({
          ...prev,
          attachments: [
            ...(prev.attachments || []),
            {
              filename: file.name,
              content_type: file.type || 'application/octet-stream',
              size: file.size,
              data_base64: base64String
            }
          ]
        }));
        showToast(`Attached ${file.name} (${formatBytes(file.size)})`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setComposeData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Rich text formatting toolbar helper
  const handleInsertFormat = (prefix, suffix = '') => {
    const textarea = document.getElementById('compose-body-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = composeData.body_text || '';
    const before = text.substring(0, start);
    const selected = text.substring(start, end) || 'text';
    const after = text.substring(end);
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    setComposeData(prev => ({ ...prev, body_text: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  // AI Content Generator for Composer with Vendor & Order Grounding (Anti-Criss-Cross)
  const handleGenerateAiDraft = async (topicOverride = null) => {
    const topicToUse = (typeof topicOverride === 'string' ? topicOverride : aiPromptTopic).trim();
    if (!topicToUse) {
      showToast('Please type what you want the email to say, or select a template.', 'error');
      return;
    }
    if (topicOverride && typeof topicOverride === 'string') {
      setAiPromptTopic(topicOverride);
    }
    setIsAiGenerating(true);
    try {
      const result = await apiRequest('/api/emails/ai-suggest', {
        method: 'POST',
        body: JSON.stringify({
          topic: topicToUse,
          recipient_name: composeData.recipient_name || linkedVendor?.name || composeData.recipient_email,
          recipient_email: composeData.recipient_email || linkedVendor?.email || null,
          vendor_id: linkedVendor?.id || null,
          order_reference: linkedOrder?.po_number || linkedOrder?.order_reference || null,
          context: `NexaERP enterprise business communication from ${userContext?.job_title || user?.full_name || 'System Administrator'}`,
          tone: aiTone
        })
      });

      if (result) {
        setComposeData(prev => ({
          ...prev,
          subject: result.subject || prev.subject,
          body_text: result.body || prev.body_text
        }));
        showToast('✨ AI successfully generated grounded email draft!');
      }
    } catch (err) {
      showToast(`AI generation error: ${err.message}`, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Send Email Handler with complete CC, BCC, Attachments & Priority
  const handleSendEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!composeData.recipient_email || !composeData.subject || !composeData.body_text) {
      showToast('Please provide recipient, subject, and message content.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const res = await apiRequest('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify(composeData)
      });

      if (res.is_simulated) {
        showToast('Email dispatched in SIMULATED mode. Connect live SMTP to deliver to personal inboxes.', 'warning');
      } else {
        showToast(`Email delivered via live SMTP to ${res.recipient}!`);
      }
      setIsComposeOpen(false);
      setComposeData({
        draft_id: null,
        recipient_email: '',
        recipient_name: '',
        cc_recipients: '',
        bcc_recipients: '',
        subject: '',
        body_text: '',
        attachments: [],
        priority: 'NORMAL',
        document_type: 'GENERAL_COMMUNICATION',
        document_reference: 'COMM-OUT',
        cc_me: true
      });
      setAiPromptTopic('');
      await fetchSent();
      await fetchDrafts();
      await fetchStatus();
      setTimeout(() => {
        triggerSync();
      }, 1500);
    } catch (err) {
      showToast(`Failed to dispatch email: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Forward original mail to user's inbox
  const handleForwardOriginalMail = async (emailId) => {
    if (!emailId) return;
    setIsForwardingOriginal(true);
    try {
      const target = user?.email || 'admin@nexaerp.internal';
      const res = await apiRequest(`/api/emails/inbox/${emailId}/forward-original`, {
        method: 'POST',
        body: JSON.stringify({ target_email: target })
      });
      showToast(`📧 Original email successfully forwarded to ${res.recipient}!`);
      await fetchSent();
    } catch (err) {
      showToast(`Failed to forward original mail: ${err.message}`, 'error');
    } finally {
      setIsForwardingOriginal(false);
    }
  };

  // View raw RFC 822 source headers
  const handleViewRawSource = async (email) => {
    try {
      const res = await apiRequest(`/api/emails/inbox/${email.id}/raw`);
      setRawSourceModalData(res);
    } catch (err) {
      setRawSourceModalData({
        id: email.id,
        headers: email.raw_headers || `From: ${email.sender_name || email.sender_email} <${email.sender_email}>\nTo: ${email.recipient_email}\nSubject: ${email.subject}`,
        raw_rfc822: (email.raw_headers || '') + '\n\n' + email.body_text
      });
    }
  };

  // Reply with Quoted Thread
  const handleApplySmartReply = (replyText) => {
    if (!selectedEmail) return;
    const dateStr = selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : 'Recent';
    const originalQuote = `\n\n----- Original Message -----\nFrom: ${selectedEmail.sender_name || selectedEmail.sender_email} <${selectedEmail.sender_email}>\nDate: ${dateStr}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body_text}`;

    setComposeData({
      draft_id: null,
      recipient_email: selectedEmail.sender_email,
      recipient_name: selectedEmail.sender_name || selectedEmail.sender_email,
      cc_recipients: '',
      bcc_recipients: '',
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body_text: (replyText || '') + originalQuote,
      attachments: [],
      priority: selectedEmail.priority || 'NORMAL',
      document_type: 'REPLY',
      document_reference: `RE-${selectedEmail.id}`,
      original_mail_id: selectedEmail.id,
      cc_me: true
    });
    setIsComposeOpen(true);
  };

  // Reply All (To sender + CC original CCs)
  const handleReplyAll = () => {
    if (!selectedEmail) return;
    const dateStr = selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : 'Recent';
    const originalQuote = `\n\n----- Original Message -----\nFrom: ${selectedEmail.sender_name || selectedEmail.sender_email} <${selectedEmail.sender_email}>\nDate: ${dateStr}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body_text}`;

    const existingCc = selectedEmail.cc_recipients || '';
    setComposeData({
      draft_id: null,
      recipient_email: selectedEmail.sender_email,
      recipient_name: selectedEmail.sender_name || selectedEmail.sender_email,
      cc_recipients: existingCc,
      bcc_recipients: '',
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      body_text: originalQuote,
      attachments: [],
      priority: selectedEmail.priority || 'NORMAL',
      document_type: 'REPLY_ALL',
      document_reference: `RE-${selectedEmail.id}`,
      original_mail_id: selectedEmail.id,
      cc_me: true
    });
    if (existingCc) setShowCc(true);
    setIsComposeOpen(true);
  };

  // Forward Email
  const handleForwardMail = () => {
    if (!selectedEmail) return;
    const dateStr = selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : 'Recent';
    const originalQuote = `\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.sender_name || selectedEmail.sender_email} <${selectedEmail.sender_email}>\nDate: ${dateStr}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.recipient_email}\n\n${selectedEmail.body_text}`;
    const parsedAtts = parseAttachments(selectedEmail.attachments_data);

    setComposeData({
      draft_id: null,
      recipient_email: '',
      recipient_name: '',
      cc_recipients: '',
      bcc_recipients: '',
      subject: selectedEmail.subject.startsWith('Fwd:') ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`,
      body_text: originalQuote,
      attachments: parsedAtts,
      priority: selectedEmail.priority || 'NORMAL',
      document_type: 'FORWARD',
      document_reference: `FWD-${selectedEmail.id}`,
      original_mail_id: selectedEmail.id,
      cc_me: true
    });
    setIsComposeOpen(true);
  };

  // Quick Send Smart Reply
  const handleQuickSendReply = async (replyText) => {
    if (!selectedEmail) return;
    setIsSending(true);
    try {
      const dateStr = selectedEmail.received_at ? new Date(selectedEmail.received_at).toLocaleString() : 'Recent';
      const originalQuote = `\n\n----- Original Message -----\nFrom: ${selectedEmail.sender_name || selectedEmail.sender_email} <${selectedEmail.sender_email}>\nDate: ${dateStr}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body_text}`;

      await apiRequest('/api/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: selectedEmail.sender_email,
          recipient_name: selectedEmail.sender_name || selectedEmail.sender_email,
          subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          body_text: (replyText || '') + originalQuote,
          document_type: 'QUICK_REPLY',
          document_reference: `RE-${selectedEmail.id}`,
          original_mail_id: selectedEmail.id,
          cc_me: true
        })
      });
      showToast(`✨ Smart reply dispatched to ${selectedEmail.sender_email}!`);
      await fetchSent();
      await fetchStatus();
      setTimeout(() => {
        triggerSync();
      }, 1500);
    } catch (err) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Filtered email list
  const filteredEmails = emails.filter(item => {
    if (activeFolder === 'starred') return item.is_starred;
    if (activeFolder === 'urgent') return item.ai_urgency === 'HIGH' || item.ai_urgency === 'CRITICAL' || item.priority === 'HIGH';
    return true;
  });

  const unreadCount = emails.filter(e => !e.is_read && !e.is_trash && !e.is_archived).length;

  // Safe parse JSON extracted data
  let parsedExtractedData = {};
  if (selectedEmail && selectedEmail.ai_extracted_data) {
    try {
      parsedExtractedData = typeof selectedEmail.ai_extracted_data === 'string'
        ? JSON.parse(selectedEmail.ai_extracted_data)
        : selectedEmail.ai_extracted_data;
    } catch (e) {
      parsedExtractedData = {};
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--header-height) - 48px)',
      gap: '16px',
      color: 'var(--text-main)'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 99999,
          backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
          }}>
            <Mail size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Mail Center & AI Hub</h2>
              <span style={{
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                color: '#0284c7',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={11} /> AI Powered
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Bi-directional enterprise messaging, autonomous auto-sync, content generation, and entity extraction.
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Auto-sync pill */}
          <div
            onClick={() => triggerSync(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: isSyncing ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: isSyncing ? '#0284c7' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            title="Click to trigger instant IMAP & inbox sync"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : `Auto-Sync in ${secondsUntilSync}s`}</span>
          </div>

          {/* Role & Duties Context Pill */}
          {userContext && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px'
              }}
              title={`Assigned Operational Duties:\n• ${userContext.duties.join('\n• ')}`}
            >
              <Briefcase size={14} color="#0284c7" />
              <div>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>{userContext.job_title}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '11px' }}>
                  ({userContext.department})
                </span>
              </div>
            </div>
          )}

          {/* Order Tracking Explorer Button */}
          <button
            onClick={() => openOrderTracking('PO-6C719B')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Open Order Lifecycle & Logistics Tracker"
          >
            <Truck size={14} color="#0284c7" />
            <span>Order Tracking Flow</span>
          </button>

          {/* SMTP Relay Configuration Button */}
          <button
            onClick={() => {
              if (user?.email && !smtpFormData.smtp_username) {
                setSmtpFormData(prev => ({
                  ...prev,
                  smtp_username: user.email,
                  smtp_from_email: user.email
                }));
              }
              if (user?.email && !smtpTestRecipient) {
                setSmtpTestRecipient(user.email);
              }
              setSmtpTestResult(null);
              setIsSmtpModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '7px 14px',
              borderRadius: '8px',
              backgroundColor: smtpConfig?.mode === 'LIVE_SMTP' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${smtpConfig?.mode === 'LIVE_SMTP' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              color: smtpConfig?.mode === 'LIVE_SMTP' ? '#10b981' : '#f59e0b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Configure real Gmail / SMTP relay for live email delivery"
          >
            <Sliders size={14} />
            <span>
              {smtpConfig?.mode === 'LIVE_SMTP' ? 'Live Relay: Active' : 'Relay: Simulated (Setup Gmail)'}
            </span>
          </button>

          {/* Compose Email Button */}
          <button
            onClick={() => {
              setComposeData({
                recipient_email: '',
                recipient_name: '',
                subject: '',
                body_text: '',
                document_type: 'GENERAL_COMMUNICATION',
                document_reference: 'COMM-OUT'
              });
              setAiPromptTopic('');
              setIsComposeOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={15} />
            <span>Compose with AI</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '220px 380px 1fr',
        gap: '14px',
        flex: 1,
        minHeight: 0
      }}>
        {/* Pane 1: Folders & System Diagnostics */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '14px',
          overflowY: 'auto'
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '10px',
              paddingLeft: '6px'
            }}>
              Mailboxes
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => { setActiveFolder('inbox'); setCategoryFilter('ALL'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'inbox' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  color: activeFolder === 'inbox' ? '#0284c7' : 'var(--text-main)',
                  fontWeight: activeFolder === 'inbox' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Inbox size={16} />
                  <span>Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFolder('starred')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'starred' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  color: activeFolder === 'starred' ? '#0284c7' : 'var(--text-main)',
                  fontWeight: activeFolder === 'starred' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Star size={16} />
                  <span>Starred</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {emails.filter(e => e.is_starred && !e.is_trash).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('sent')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'sent' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  color: activeFolder === 'sent' ? '#0284c7' : 'var(--text-main)',
                  fontWeight: activeFolder === 'sent' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Send size={16} />
                  <span>Sent Dispatches</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {sentEmails.length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('drafts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'drafts' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  color: activeFolder === 'drafts' ? '#0284c7' : 'var(--text-main)',
                  fontWeight: activeFolder === 'drafts' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} />
                  <span>Drafts</span>
                </div>
                {drafts.length > 0 && (
                  <span style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.2)',
                    color: '#0284c7',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {drafts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFolder('urgent')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'urgent' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                  color: activeFolder === 'urgent' ? '#ef4444' : 'var(--text-main)',
                  fontWeight: activeFolder === 'urgent' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={16} />
                  <span>Urgent & High</span>
                </div>
                <span style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {emails.filter(e => (e.ai_urgency === 'HIGH' || e.ai_urgency === 'CRITICAL' || e.priority === 'HIGH') && !e.is_trash).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('archived')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'archived' ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                  color: activeFolder === 'archived' ? '#0284c7' : 'var(--text-main)',
                  fontWeight: activeFolder === 'archived' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Archive size={16} />
                  <span>Archived</span>
                </div>
              </button>

              <button
                onClick={() => setActiveFolder('trash')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeFolder === 'trash' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                  color: activeFolder === 'trash' ? '#ef4444' : 'var(--text-main)',
                  fontWeight: activeFolder === 'trash' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trash2 size={16} />
                  <span>Trash</span>
                </div>
              </button>
            </div>

            {/* Smart Category Tags */}
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginTop: '24px',
              marginBottom: '10px',
              paddingLeft: '6px'
            }}>
              Smart Categories
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: 'All Categories', value: 'ALL', icon: Tag, color: '#64748b' },
                { label: 'Purchase Orders', value: 'PURCHASE_ORDER', icon: FileText, color: '#0284c7' },
                { label: 'Invoices & Billing', value: 'INVOICE', icon: DollarSign, color: '#10b981' },
                { label: 'Client RFQ / Sales', value: 'SALES_INQUIRY', icon: Tag, color: '#f59e0b' },
                { label: 'Banking & Remit', value: 'PAYMENT', icon: ShieldCheck, color: '#8b5cf6' }
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setActiveFolder('inbox'); setCategoryFilter(cat.value); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: categoryFilter === cat.value && activeFolder === 'inbox' ? 'var(--bg-subtle)' : 'transparent',
                    color: categoryFilter === cat.value && activeFolder === 'inbox' ? 'var(--text-main)' : 'var(--text-secondary)',
                    fontWeight: categoryFilter === cat.value && activeFolder === 'inbox' ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Subsystem Health Card */}
          <div style={{
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid var(--border-color)',
            marginTop: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>SUBSYSTEM ENGINE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SMTP Relay:</span>
                <button
                  type="button"
                  onClick={() => setIsSmtpModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontWeight: 700,
                    color: smtpConfig?.mode === 'LIVE_SMTP' ? '#10b981' : '#f59e0b',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: 'underline'
                  }}
                  title="Configure live SMTP relay"
                >
                  {smtpConfig?.mode === 'LIVE_SMTP' ? (smtpConfig.smtp_host || 'Live SMTP') : 'Simulated (Setup)'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>IMAP Ingestion:</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{systemStatus?.imap_inbox_status || 'Active'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>AI Extractor:</span>
                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>Groq Qwen 27B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pane 2: Email List & Search */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Search Bar */}
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-subtle)'
          }}>
            <Search size={15} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search sender, PO #, amount, or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                width: '100%',
                color: 'var(--text-main)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeFolder === 'drafts' ? (
              // Drafts List
              drafts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>No drafts found</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Unsent messages and drafts will appear here</div>
                </div>
              ) : (
                drafts.map(item => {
                  const isSelected = selectedDraft && selectedDraft.id === item.id;
                  const atts = parseAttachments(item.attachments_data);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDraft(item)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: item.recipient_email ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                          To: {item.recipient_name || item.recipient_email || '(No recipient)'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteDraft(e, item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                              padding: '2px'
                            }}
                            title="Delete draft"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: '#0284c7' }}>
                        Draft: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.subject || '(Draft - No Subject)'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        {atts.length > 0 && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(2, 132, 199, 0.12)',
                            color: '#0284c7',
                            border: '1px solid rgba(2, 132, 199, 0.3)',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Paperclip size={10} /> {atts.length} files
                          </span>
                        )}
                        {item.priority === 'HIGH' && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            padding: '1px 5px'
                          }}>
                            HIGH
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Click to open & edit
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : activeFolder === 'sent' ? (
              // Sent List
              sentEmails.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No sent dispatches recorded yet.
                </div>
              ) : (
                sentEmails.map(item => {
                  const isSelected = selectedSentEmail && selectedSentEmail.id === item.id;
                  const atts = parseAttachments(item.attachments_data);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedSentEmail(item)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>To: {item.recipient_name || item.recipient_email}</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: 'var(--text-main)' }}>
                        {item.subject}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '4px',
                          padding: '1px 5px'
                        }}>
                          {item.status}
                        </span>
                        {atts.length > 0 && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(2, 132, 199, 0.12)',
                            color: '#0284c7',
                            border: '1px solid rgba(2, 132, 199, 0.3)',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Paperclip size={10} /> {atts.length}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Ref: {item.document_reference}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Inbox / Starred / Urgent / Archived / Trash List
              filteredEmails.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Inbox size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>No messages found in this folder</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Try syncing or switching filters</div>
                </div>
              ) : (
                filteredEmails.map(email => {
                  const isSelected = selectedEmail && selectedEmail.id === email.id;
                  const isUnread = !email.is_read;
                  const atts = parseAttachments(email.attachments_data);

                  // Urgency badge styling
                  const urgencyColors = {
                    CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' },
                    HIGH: { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706', border: '#f59e0b' },
                    MEDIUM: { bg: 'rgba(2, 132, 199, 0.15)', text: '#0284c7', border: '#38bdf8' },
                    LOW: { bg: 'rgba(100, 116, 139, 0.15)', text: '#64748b', border: '#94a3b8' }
                  };
                  const urgencyStyle = urgencyColors[email.ai_urgency] || urgencyColors.LOW;

                  return (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected
                          ? 'rgba(2, 132, 199, 0.08)'
                          : isUnread
                          ? 'var(--bg-surface)'
                          : 'var(--bg-subtle)',
                        borderLeft: isSelected ? '4px solid #0284c7' : isUnread ? '4px solid #3b82f6' : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Row 1: Sender & Star & Time */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <button
                            onClick={(e) => handleToggleStar(e, email.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: email.is_starred ? '#f59e0b' : 'var(--text-secondary)'
                            }}
                          >
                            <Star size={14} fill={email.is_starred ? '#f59e0b' : 'none'} />
                          </button>
                          <span style={{
                            fontSize: '12.5px',
                            fontWeight: isUnread ? 800 : 600,
                            color: 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {email.sender_name || email.sender_email}
                          </span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Row 2: Subject */}
                      <div style={{
                        fontSize: '12.5px',
                        fontWeight: isUnread ? 700 : 500,
                        color: 'var(--text-main)',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {email.subject}
                      </div>

                      {/* Row 3: Preview snippet */}
                      <div style={{
                        fontSize: '11.5px',
                        color: 'var(--text-secondary)',
                        marginTop: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3
                      }}>
                        {email.ai_summary || email.body_text}
                      </div>

                      {/* Row 4: Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>
                        {atts.length > 0 && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(2, 132, 199, 0.1)',
                            color: '#0284c7',
                            border: '1px solid rgba(2, 132, 199, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Paperclip size={10} /> {atts.length}
                          </span>
                        )}
                        {(email.priority === 'HIGH' || email.ai_urgency === 'HIGH' || email.ai_urgency === 'CRITICAL') && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid #ef4444'
                          }}>
                            HIGH PRIORITY
                          </span>
                        )}
                        {email.ai_intent && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(139, 92, 246, 0.12)',
                            color: '#8b5cf6',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}>
                            {email.ai_intent.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Pane 3: Reading Pane & AI Intelligence Co-Pilot */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '20px'
        }}>
          {activeFolder === 'drafts' ? (
            !selectedDraft ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Select a Draft to Preview</div>
                <div style={{ fontSize: '13px', maxWidth: '320px', marginTop: '6px' }}>
                  Click on any draft in the list to inspect, edit, attach additional documents, or dispatch via SMTP.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(2, 132, 199, 0.15)',
                        color: '#0284c7',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        DRAFT
                      </span>
                      {selectedDraft.priority === 'HIGH' && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>
                      {selectedDraft.subject || '(Draft - No Subject)'}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                      To: {selectedDraft.recipient_email || '(No recipient assigned yet)'}
                    </div>
                    {selectedDraft.cc_recipients && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        CC: {selectedDraft.cc_recipients}
                      </div>
                    )}
                    {selectedDraft.bcc_recipients && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        BCC: {selectedDraft.bcc_recipients}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Last edited: {new Date(selectedDraft.updated_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => handleDeleteDraft(e, selectedDraft.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#ef4444'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={() => handleOpenDraft(selectedDraft)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0284c7',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#ffffff'
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Edit & Send</span>
                    </button>
                  </div>
                </div>

                {/* Draft Attachments */}
                {(() => {
                  const atts = parseAttachments(selectedDraft.attachments_data);
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                        <Paperclip size={14} color="#0284c7" />
                        <span>Attached Files ({atts.length})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {atts.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.filename}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                {formatBytes(att.size)}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadAttachment(att)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#0284c7'
                              }}
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Draft Body */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  padding: '18px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedDraft.body_text || '(Empty draft message)'}
                </div>
              </div>
            )
          ) : activeFolder === 'sent' ? (
            !selectedSentEmail ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                <Send size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Select a Sent Dispatch</div>
                <div style={{ fontSize: '13px', maxWidth: '320px', marginTop: '6px' }}>
                  Select an outgoing email from the list to review the original dispatched content, counterparty delivery status, and RFC822 audit headers.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Sent Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {selectedSentEmail.priority === 'HIGH' && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>
                      {selectedSentEmail.subject}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        <Send size={15} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          To: {selectedSentEmail.recipient_name || selectedSentEmail.recipient_email} &lt;{selectedSentEmail.recipient_email}&gt;
                        </div>
                        {selectedSentEmail.cc_recipients && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            CC: {selectedSentEmail.cc_recipients}
                          </div>
                        )}
                        {selectedSentEmail.bcc_recipients && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            BCC: {selectedSentEmail.bcc_recipients}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          From: &lt;{selectedSentEmail.sender_email || 'admin@nexaerp.internal'}&gt; • {new Date(selectedSentEmail.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleViewRawSource({
                        id: selectedSentEmail.id,
                        sender_name: selectedSentEmail.sender_name,
                        sender_email: selectedSentEmail.sender_email,
                        recipient_email: selectedSentEmail.recipient_email,
                        subject: selectedSentEmail.subject,
                        raw_headers: selectedSentEmail.raw_headers,
                        body_text: selectedSentEmail.body_html ? selectedSentEmail.body_html.replace(/<[^>]+>/g, '') : ''
                      })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-main)'
                      }}
                      title="Inspect original RFC 822 MIME headers"
                    >
                      <FileText size={14} />
                      <span>Raw Headers</span>
                    </button>
                  </div>
                </div>

                {/* Sent Metadata Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '6px',
                    padding: '2px 8px'
                  }}>
                    Status: {selectedSentEmail.status}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    color: '#0284c7',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    borderRadius: '6px',
                    padding: '2px 8px'
                  }}>
                    Type: {selectedSentEmail.document_type}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                  }}>
                    Document Ref: {selectedSentEmail.document_reference}
                  </span>
                </div>

                {/* Sent Attachments Cards */}
                {(() => {
                  const atts = parseAttachments(selectedSentEmail.attachments_data);
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                        <Paperclip size={14} color="#0284c7" />
                        <span>Attached Files ({atts.length})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {atts.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.filename}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                {formatBytes(att.size)}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadAttachment(att)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#0284c7'
                              }}
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Sent Email Body Content */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: '8px'
                  }}>
                    Dispatched Original Message
                  </div>
                  <div style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    padding: '18px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'var(--text-main)',
                    overflowX: 'auto'
                  }}>
                    {selectedSentEmail.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedSentEmail.body_html }} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selectedSentEmail.body_text || 'No message content.'}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            !selectedEmail ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                <Mail size={48} style={{ opacity: 0.3, marginBottom: '14px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Select a Message</div>
                <div style={{ fontSize: '13px', maxWidth: '320px', marginTop: '6px' }}>
                  Select an incoming message from the inbox to review AI extracted entities, action items, and smart replies.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Message Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {(selectedEmail.priority === 'HIGH' || selectedEmail.ai_urgency === 'HIGH' || selectedEmail.ai_urgency === 'CRITICAL') && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>
                      {selectedEmail.subject}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        {(selectedEmail.sender_name || selectedEmail.sender_email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {selectedEmail.sender_name || selectedEmail.sender_email}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          From: &lt;{selectedEmail.sender_email}&gt; • To: &lt;{selectedEmail.recipient_email}&gt;
                          {selectedEmail.cc_recipients && <span> • CC: {selectedEmail.cc_recipients}</span>}
                          <span> • {new Date(selectedEmail.received_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Platform Actions Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Reply */}
                    <button
                      onClick={() => handleApplySmartReply('')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Reply to sender"
                    >
                      <Reply size={13} />
                      <span>Reply</span>
                    </button>

                    {/* Reply All */}
                    <button
                      onClick={handleReplyAll}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Reply all (Sender + CCs)"
                    >
                      <ReplyAll size={13} />
                      <span>Reply All</span>
                    </button>

                    {/* Forward */}
                    <button
                      onClick={handleForwardMail}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Forward to another recipient"
                    >
                      <CornerUpRight size={13} />
                      <span>Forward</span>
                    </button>

                    {/* Toggle Read */}
                    <button
                      onClick={(e) => handleToggleRead(e, selectedEmail.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                      title={selectedEmail.is_read ? 'Mark as Unread' : 'Mark as Read'}
                    >
                      {selectedEmail.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    {/* Star */}
                    <button
                      onClick={(e) => handleToggleStar(e, selectedEmail.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        color: selectedEmail.is_starred ? '#f59e0b' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                      title={selectedEmail.is_starred ? 'Remove star' : 'Star message'}
                    >
                      <Star size={14} fill={selectedEmail.is_starred ? '#f59e0b' : 'none'} />
                    </button>

                    {/* Archive */}
                    <button
                      onClick={(e) => handleToggleArchive(e, selectedEmail.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                      title={selectedEmail.is_archived ? 'Move back to Inbox' : 'Archive conversation'}
                    >
                      <Archive size={14} />
                    </button>

                    {/* Trash */}
                    <button
                      onClick={(e) => handleToggleTrash(e, selectedEmail.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        color: '#ef4444',
                        cursor: 'pointer'
                      }}
                      title={selectedEmail.is_trash ? 'Restore from Trash' : 'Move to Trash'}
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Forward Original to Me Button */}
                    <button
                      onClick={() => handleForwardOriginalMail(selectedEmail.id)}
                      disabled={isForwardingOriginal}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'rgba(2, 132, 199, 0.12)',
                        border: '1px solid rgba(2, 132, 199, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#0284c7'
                      }}
                      title="Deliver original RFC copy to your email address"
                    >
                      <Send size={12} />
                      <span>{isForwardingOriginal ? 'Forwarding...' : 'Forward to Me'}</span>
                    </button>

                    {/* Raw Source Button */}
                    <button
                      onClick={() => handleViewRawSource(selectedEmail)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-main)'
                      }}
                      title="Inspect original RFC 822 MIME headers"
                    >
                      <FileText size={12} />
                      <span>Headers</span>
                    </button>
                  </div>
                </div>

                {/* 📎 Attachments Gallery */}
                {(() => {
                  const atts = parseAttachments(selectedEmail.attachments_data);
                  if (!atts || atts.length === 0) return null;
                  return (
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        <Paperclip size={14} color="#0284c7" />
                        <span>Attached Files ({atts.length})</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                        {atts.map((att, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <FileText size={15} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                                  {att.filename}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  {formatBytes(att.size)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadAttachment(att)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-subtle)',
                                color: '#0284c7',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                              title={`Download ${att.filename}`}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ⚡ AI Extracted Intelligence Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(139, 92, 246, 0.08))',
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Zap size={15} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                        AI EXTRACTED INTELLIGENCE
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        GROQ QWEN
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Processed automatically upon receipt
                    </span>
                  </div>

                  {/* Summary */}
                  {selectedEmail.ai_summary && (
                    <div style={{
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                      color: 'var(--text-main)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '14px'
                    }}>
                      <strong>Executive Summary:</strong> {selectedEmail.ai_summary}
                    </div>
                  )}

                  {/* Structured Extraction Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                    marginBottom: '12px'
                  }}>
                    {/* Intent */}
                    <div style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 10px'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Identified Intent
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                        {selectedEmail.ai_intent ? selectedEmail.ai_intent.replace('_', ' ') : 'General'}
                      </div>
                    </div>

                    {/* Urgency */}
                    <div style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 10px'
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Urgency Score
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: selectedEmail.ai_urgency === 'HIGH' || selectedEmail.ai_urgency === 'CRITICAL' ? '#ef4444' : '#10b981',
                        marginTop: '2px'
                      }}>
                        {selectedEmail.ai_urgency || 'NORMAL'}
                      </div>
                    </div>

                    {/* PO or Invoice # */}
                    {(parsedExtractedData.po_number || parsedExtractedData.invoice_number) && (
                      <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Extracted Reference
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', marginTop: '2px' }}>
                          {parsedExtractedData.po_number || parsedExtractedData.invoice_number}
                        </div>
                      </div>
                    )}

                    {/* Extracted Amount */}
                    {parsedExtractedData.amount && (
                      <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Extracted Amount
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                          {parsedExtractedData.currency || '$'} {parsedExtractedData.amount}
                        </div>
                      </div>
                    )}

                    {/* Extracted Due Date */}
                    {parsedExtractedData.due_date && (
                      <div style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Due / Delivery Date
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                          {parsedExtractedData.due_date}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extracted Action Items */}
                  {parsedExtractedData.action_items && parsedExtractedData.action_items.length > 0 && (
                    <div style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        EXTRACTED ACTION ITEMS:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.5 }}>
                        {parsedExtractedData.action_items.map((action, idx) => (
                          <li key={idx} style={{ color: 'var(--text-main)' }}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 🚚 Visual Order Tracking Flow Trigger Card in Reading Pane */}
                {(() => {
                  const docRef = parsedExtractedData.document_reference || 
                    parsedExtractedData.po_number ||
                    parsedExtractedData.invoice_number ||
                    (selectedEmail.subject && selectedEmail.subject.match(/\b(PO-[A-Z0-9-]+|INV-[A-Z0-9-]+)\b/i)?.[1]) ||
                    (selectedEmail.body_text && selectedEmail.body_text.match(/\b(PO-[A-Z0-9-]+|INV-[A-Z0-9-]+)\b/i)?.[1]);
                  if (!docRef) return null;
                  return (
                    <div style={{
                      backgroundColor: 'rgba(2, 132, 199, 0.07)',
                      border: '1px solid rgba(2, 132, 199, 0.28)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                        }}>
                          <Truck size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Associated ERP Order:</span>
                            <span style={{
                              color: '#0284c7',
                              backgroundColor: 'rgba(2, 132, 199, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontWeight: 800
                            }}>
                              {docRef.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Procurement lifecycle progression & carrier consignment status
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openOrderTracking(docRef)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '7px',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                        }}
                      >
                        <Activity size={14} />
                        <span>Track Order Flow</span>
                      </button>
                    </div>
                  );
                })()}

                {/* ✨ AI Suggested Smart Reply Box */}
                {selectedEmail.ai_suggested_reply && (
                  <div style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color="#8b5cf6" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                          AI Recommended Smart Reply
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleApplySmartReply(selectedEmail.ai_suggested_reply)}
                          style={{
                            backgroundColor: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Edit in Composer
                        </button>
                        <button
                          onClick={() => handleQuickSendReply(selectedEmail.ai_suggested_reply)}
                          disabled={isSending}
                          style={{
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isSending ? 'Sending...' : '⚡ Quick Send Now'}
                        </button>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      backgroundColor: 'var(--bg-surface)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-color)'
                    }}>
                      "{selectedEmail.ai_suggested_reply}"
                    </div>
                  </div>
                )}

                {/* 📩 Original Mail / Quoted Thread Archive Card */}
                {(selectedEmail.original_message_body || selectedEmail.original_mail_id) && (
                  <div style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Mail size={14} />
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                            Original Outgoing Communication / Thread Archive
                          </span>
                          {selectedEmail.original_mail_id && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10.5px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(2, 132, 199, 0.1)',
                              color: '#0284c7',
                              fontWeight: 700
                            }}>
                              Ref: Log #{selectedEmail.original_mail_id}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleForwardOriginalMail(selectedEmail.id)}
                          disabled={isForwardingOriginal}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Forward original mail to your email"
                        >
                          <Send size={11} />
                          <span>Forward to Me</span>
                        </button>
                        <button
                          onClick={() => handleViewRawSource(selectedEmail)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                          }}
                        >
                          <FileText size={11} />
                          <span>Headers</span>
                        </button>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}>
                      {selectedEmail.original_message_body}
                    </div>
                  </div>
                )}

                {/* Full Email Body Content */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: '8px'
                  }}>
                    Message Content
                  </div>
                  <div style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    padding: '18px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'var(--text-main)',
                    fontFamily: 'inherit'
                  }}>
                    {selectedEmail.body_text && selectedEmail.body_text.includes('----- Original Message -----') ? (
                      <div>
                        <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                          {selectedEmail.body_text.split('----- Original Message -----')[0].trim()}
                        </div>
                        <div style={{
                          borderLeft: '3px solid #0284c7',
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: '0 8px 8px 0',
                          padding: '12px 16px',
                          marginTop: '12px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#0284c7',
                            marginBottom: '8px'
                          }}>
                            <Mail size={12} />
                            <span>QUOTED ORIGINAL EMAIL</span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5
                          }}>
                            {selectedEmail.body_text.split('----- Original Message -----')[1].trim()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{selectedEmail.body_text}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Compose Email & AI Content Suggestion Modal */}
      {isComposeOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Compose Business Email
                </h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Delivery Mode Banner */}
            {smtpConfig?.mode !== 'LIVE_SMTP' ? (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#d97706'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>
                    <strong>Simulated Delivery:</strong> Live SMTP is not connected. This email will be archived in the ERP ledger, but will <em>not</em> arrive in real Gmail inboxes.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsComposeOpen(false);
                    setIsSmtpModalOpen(true);
                  }}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Connect Real Gmail
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#059669'
              }}>
                <CheckCircle2 size={15} />
                <span>
                  <strong>Live Relay Active:</strong> Email will be transmitted over the internet directly to external mailboxes via {smtpConfig.smtp_host}.
                </span>
              </div>
            )}

            {/* Modal Content */}
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '20px', gap: '14px' }}>
              {/* ✨ AI Content Suggestion Assistant Section */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: '10px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} color="#0284c7" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      AI Content Suggestion Generator
                    </span>
                  </div>

                  {/* Tone selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tone:</span>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-main)',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}
                    >
                      <option value="formal">Corporate & Formal</option>
                      <option value="friendly">Warm & Friendly</option>
                      <option value="urgent">Urgent & Directive</option>
                      <option value="concise">Concise & Direct</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Describe what you want to say, e.g. 'Acknowledge PO-2026-8891 and confirm shipment by Monday'..."
                    value={aiPromptTopic}
                    onChange={(e) => setAiPromptTopic(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiDraft}
                    disabled={isAiGenerating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAiGenerating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{isAiGenerating ? 'Drafting...' : 'Draft with AI'}</span>
                  </button>
                </div>

                {/* Role-Specific Intelligent Quick Prompts */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {(userContext?.quick_prompts || [
                    { label: 'Purchase Order Acknowledgment', prompt: 'Acknowledge receipt of the purchase order and confirm fulfillment schedule' },
                    { label: 'Payment Remittance Follow-Up', prompt: 'Provide payment remittance advice and bank confirmation reference' },
                    { label: 'Carrier Consignment Tracking', prompt: 'Follow up on the scheduled dispatch and freight carrier waybill' },
                    { label: 'Delivery Schedule Confirmation', prompt: 'Confirm arrival appointment time at receiving warehouse bay' }
                  ]).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleGenerateAiDraft(item.prompt)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={item.prompt}
                    >
                      ⚡ {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Field + CC/BCC Toggles + Link Vendor Button */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    To *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowVendorPicker(!showVendorPicker)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Building2 size={12} />
                      <span>{showVendorPicker ? 'Close Picker' : '🏢 Link Vendor / PO'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCc(!showCc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showCc ? '#0284c7' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {showCc ? '- Hide Cc' : '+ Cc'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBcc(!showBcc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showBcc ? '#0284c7' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {showBcc ? '- Hide Bcc' : '+ Bcc'}
                    </button>
                  </div>
                </div>
                <input
                  type="email"
                  required
                  placeholder="Recipient email address (e.g. orders@adaniwilmar.internal)"
                  value={composeData.recipient_email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setComposeData({ ...composeData, recipient_email: val });
                    checkVendorMatch(val);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Vendor Selector Dropdown (when opened manually) */}
              {showVendorPicker && (
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    SELECT FROM KNOWN ERP VENDORS:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {vendorsAndOrders.map(v => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setLinkedVendor(v);
                          setComposeData(prev => ({
                            ...prev,
                            recipient_email: v.email || prev.recipient_email,
                            recipient_name: v.name || prev.recipient_name
                          }));
                          if (v.purchase_orders && v.purchase_orders.length > 0) {
                            setLinkedOrder(v.purchase_orders[0]);
                          } else {
                            setLinkedOrder(null);
                          }
                          setShowVendorPicker(false);
                          showToast(`Linked vendor ${v.name}!`);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{v.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          {v.vendor_code} • {v.purchase_orders?.length || 0} Open POs
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🏢 Verified Vendor & Order Grounding Context Bar */}
              {linkedVendor && (
                <div style={{
                  backgroundColor: 'rgba(2, 132, 199, 0.07)',
                  border: '1px solid rgba(2, 132, 199, 0.28)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={16} color="#0284c7" />
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                        Verified ERP Vendor: <strong style={{ color: '#0284c7' }}>{linkedVendor.name}</strong>
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(2, 132, 199, 0.12)',
                        color: '#0284c7',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {linkedVendor.vendor_code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLinkedVendor(null);
                        setLinkedOrder(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      × Reset Vendor
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Linked PO Dropdown Selector */}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <select
                        value={linkedOrder?.po_number || ''}
                        onChange={(e) => {
                          const poNum = e.target.value;
                          const found = (linkedVendor.orders || linkedVendor.purchase_orders || []).find(p => p.po_number === poNum);
                          setLinkedOrder(found || null);
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        <option value="">-- Select Specific Purchase Order to Anchor --</option>
                        {(linkedVendor.orders || linkedVendor.purchase_orders || []).map(po => (
                          <option key={po.id} value={po.po_number}>
                            {po.po_number} — ₹{(po.total_amount || 0).toLocaleString()} ({po.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Order Action Buttons */}
                    {linkedOrder && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleInsertOrderSummary}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Paste itemized order details into email body"
                        >
                          <FileText size={12} />
                          <span>Insert Order Summary</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openOrderTracking(linkedOrder.po_number)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: '#0284c7',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="View live shipment and fulfillment flow"
                        >
                          <Truck size={12} />
                          <span>Track Flow</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateAiDraft(`Follow up on scheduled dispatch and carrier tracking details for order ${linkedOrder.po_number}`)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#0284c7',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Generate grounded email draft strictly for this PO with zero criss-cross"
                        >
                          <Sparkles size={12} />
                          <span>AI Draft with this PO</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CC Field */}
              {showCc && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Cc (Carbon Copy)
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated emails (e.g. manager@corp.com, partner@corp.com)"
                    value={composeData.cc_recipients || ''}
                    onChange={(e) => setComposeData({ ...composeData, cc_recipients: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              )}

              {/* BCC Field */}
              {showBcc && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Bcc (Blind Carbon Copy — Omitted from headers for privacy)
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated emails for discreet delivery"
                    value={composeData.bcc_recipients || ''}
                    onChange={(e) => setComposeData({ ...composeData, bcc_recipients: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              )}

              {/* Subject & Priority Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Subject of your message"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Priority / Urgency
                  </label>
                  <select
                    value={composeData.priority || 'NORMAL'}
                    onChange={(e) => setComposeData({ ...composeData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: composeData.priority === 'HIGH' ? '#ef4444' : 'var(--text-main)',
                      fontSize: '12.5px',
                      fontWeight: 700
                    }}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">🔴 High Priority</option>
                    <option value="LOW">🔵 Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Rich Formatting Toolbar & Body Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Message Body *
                  </label>

                  {/* Formatting Toolbar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '2px 4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('**', '**')}
                      title="Bold"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('*', '*')}
                      title="Italic"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('<u>', '</u>')}
                      title="Underline"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Underline size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('\n- ')}
                      title="Bullet List"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('\n> ')}
                      title="Quote"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Quote size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('`', '`')}
                      title="Code"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Code size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('[Link Title](', ')')}
                      title="Insert Link"
                      style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-main)', borderRadius: '4px' }}
                    >
                      <Link size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat(`\n\nBest regards,\n${user?.full_name || 'System Administrator'}\nNexaERP Enterprise Mailer`)}
                      title="Insert Enterprise Signature"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '3px 6px',
                        cursor: 'pointer',
                        color: '#0284c7',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '4px'
                      }}
                    >
                      + Sig
                    </button>
                  </div>
                </div>

                <textarea
                  id="compose-body-textarea"
                  required
                  rows={9}
                  placeholder="Write your email body here or use AI Suggest above..."
                  value={composeData.body_text}
                  onChange={(e) => setComposeData({ ...composeData, body_text: e.target.value })}
                  style={{
                    width: '100%',
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Attachments Pills List */}
              {composeData.attachments && composeData.attachments.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Attached Files ({composeData.attachments.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {composeData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px'
                        }}
                      >
                        <Paperclip size={12} color="#0284c7" />
                        <span style={{ fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.filename}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          ({formatBytes(att.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '0 2px',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                          title="Remove attachment"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '14px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'var(--text-main)'
                    }}
                    title="Attach files (PDF, images, spreadsheets up to 15MB)"
                  >
                    <Paperclip size={14} color="#0284c7" />
                    <span>Attach Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                    title="Save current work to Drafts folder"
                  >
                    <FileText size={14} />
                    <span>Save Draft</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Discard
                  </button>

                  <button
                    type="submit"
                    disabled={isSending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 22px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
                    }}
                  >
                    <Send size={15} />
                    <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 Raw RFC 822 MIME Source Modal */}
      {rawSourceModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                  Original RFC 822 MIME Source & Headers
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(rawSourceModalData.raw_rfc822 || rawSourceModalData.headers);
                    showToast('Raw email headers copied to clipboard!');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => setRawSourceModalData(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div style={{
              padding: '18px',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#090d16',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap'
            }}>
              {rawSourceModalData.raw_rfc822 || rawSourceModalData.headers}
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ Live SMTP & Gmail Relay Configuration Modal */}
      {isSmtpModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(2, 132, 199, 0.15)',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Live Email Relay & SMTP Setup
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Deliver purchase orders, invoices, and mail to real Gmail & personal inboxes
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsSmtpModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Relay Mode Explanation Box */}
              <div style={{
                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>Why didn't my email arrive in Gmail?</span>
                </div>
                <div style={{ color: 'var(--text-main)' }}>
                  By default, NexaERP operates in <strong>simulated mode</strong> so you can test sending without entering mail credentials. To transmit real emails over the public internet to your personal Gmail or external vendors, enter your Google App Password below.
                </div>
              </div>

              {/* Provider Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpTab('gmail');
                    setSmtpFormData(prev => ({
                      ...prev,
                      smtp_host: 'smtp.gmail.com',
                      smtp_port: 587,
                      smtp_use_tls: true
                    }));
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: smtpTab === 'gmail' ? '#0284c7' : 'var(--bg-subtle)',
                    color: smtpTab === 'gmail' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Gmail / Google Workspace (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpTab('custom');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: smtpTab === 'custom' ? '#0284c7' : 'var(--bg-subtle)',
                    color: smtpTab === 'custom' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Custom SMTP / Office 365
                </button>
              </div>

              {/* Step-by-Step Google App Password Guide (if Gmail tab) */}
              {smtpTab === 'gmail' && (
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={14} />
                    <span>How to get a 16-Character Google App Password:</span>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <li>
                      Open your Google Account Security page:{' '}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                        myaccount.google.com/apppasswords <ExternalLink size={10} style={{ display: 'inline' }} />
                      </a>
                    </li>
                    <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google account.</li>
                    <li>Under 'App passwords', enter <strong>NexaERP</strong> and click <strong>Create</strong>.</li>
                    <li>Copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>) and paste below.</li>
                  </ol>
                </div>
              )}

              {/* Form Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpFormData.smtp_host}
                    onChange={e => setSmtpFormData({ ...smtpFormData, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpFormData.smtp_port}
                    onChange={e => setSmtpFormData({ ...smtpFormData, smtp_port: e.target.value })}
                    placeholder="587"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Account Email / Username
                  </label>
                  <input
                    type="email"
                    value={smtpFormData.smtp_username}
                    onChange={e => setSmtpFormData({
                      ...smtpFormData,
                      smtp_username: e.target.value,
                      smtp_from_email: smtpFormData.smtp_from_email || e.target.value
                    })}
                    placeholder="yourname@gmail.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {smtpTab === 'gmail' ? '16-Character App Password' : 'Password / API Key'}
                  </label>
                  <input
                    type="password"
                    value={smtpFormData.smtp_password}
                    onChange={e => setSmtpFormData({ ...smtpFormData, smtp_password: e.target.value })}
                    placeholder={smtpConfig?.has_password ? '•••••••••••••••• (Saved - enter to change)' : 'e.g. abcd efgh ijkl mnop'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={smtpFormData.smtp_from_name}
                    onChange={e => setSmtpFormData({ ...smtpFormData, smtp_from_name: e.target.value })}
                    placeholder="NexaERP Enterprise Mailer"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
                  <input
                    type="checkbox"
                    id="smtp_tls"
                    checked={smtpFormData.smtp_use_tls}
                    onChange={e => setSmtpFormData({ ...smtpFormData, smtp_use_tls: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="smtp_tls" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Enable STARTTLS (Standard for port 587)
                  </label>
                </div>
              </div>

              {/* Live Test Dispatch Sandbox */}
              <div style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                marginTop: '4px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
                  Verify Live Delivery to Personal Inbox:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    value={smtpTestRecipient}
                    onChange={e => setSmtpTestRecipient(e.target.value)}
                    placeholder="Your personal email (e.g. personal@gmail.com)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-main)',
                      fontSize: '12px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isTestingSmtp ? 0.7 : 1
                    }}
                  >
                    {isTestingSmtp ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>{isTestingSmtp ? 'Sending Test...' : 'Send Test Mail'}</span>
                  </button>
                </div>

                {/* Test Feedback */}
                {smtpTestResult && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: smtpTestResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${smtpTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: smtpTestResult.success ? '#10b981' : '#ef4444',
                    lineHeight: 1.45
                  }}>
                    {smtpTestResult.success ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                        <span>{smtpTestResult.message} Check your inbox (or spam folder) now!</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                        <span>{smtpTestResult.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <button
                type="button"
                onClick={() => setIsSmtpModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSmtp}
                disabled={isSavingSmtp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Check size={14} />
                <span>{isSavingSmtp ? 'Saving...' : 'Save & Activate Live Relay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 Full Lifecycle Order Tracking Modal */}
      {orderTrackingModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 22px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Order Lifecycle & Status Tracking
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Reference: <strong style={{ color: '#0284c7' }}>{orderTrackingModal.orderRef}</strong> • Milestone status progression
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOrderTrackingModal({ ...orderTrackingModal, isOpen: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {orderTrackingModal.loading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                  <div>Loading live lifecycle & waybill telemetry...</div>
                </div>
              ) : !orderTrackingModal.data ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No tracking data available for {orderTrackingModal.orderRef}
                </div>
              ) : (
                (() => {
                  const d = orderTrackingModal.data;
                  return (
                    <>
                      {/* Top Summary Banner */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '12px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        padding: '14px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            {d.order_type === 'PURCHASE_ORDER' ? 'Vendor / Supplier' : 'Customer Client'}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                            {d.vendor_name || d.customer_name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            {d.vendor_code || 'Direct Client'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Total Order Value
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                            ₹{(d.total_amount || 0).toLocaleString()} INR
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            {d.payment_terms || 'Standard Terms'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Lifecycle Progress
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                            {d.progress_percent}% Complete
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            Stage {d.current_step_index + 1} of {d.total_steps}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Order Status
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              padding: '2px 8px'
                            }}>
                              {d.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div style={{
                          height: '8px',
                          backgroundColor: 'var(--bg-subtle)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{
                            width: `${d.progress_percent}%`,
                            height: '100%',
                            backgroundColor: '#0284c7',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>

                      {/* 6-Stage Visual Stepper Timeline */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                          Lifecycle Milestone Timeline
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(d.milestones || []).map((m, idx) => {
                            const isDone = m.status === 'COMPLETED';
                            const isCurrent = m.status === 'IN_PROGRESS';
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: isCurrent ? 'rgba(2, 132, 199, 0.08)' : (isDone ? 'var(--bg-surface)' : 'var(--bg-subtle)'),
                                  border: `1px solid ${isCurrent ? '#0284c7' : 'var(--border-color)'}`
                                }}
                              >
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: isDone ? '#10b981' : (isCurrent ? '#0284c7' : 'var(--border-color)'),
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  flexShrink: 0,
                                  marginTop: '2px'
                                }}>
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#0284c7' : 'var(--text-main)' }}>
                                      {m.title}
                                    </span>
                                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                      {m.timestamp}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {m.description}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '3px', fontWeight: 600 }}>
                                    Responsible: {m.responsible_role}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Carrier & Freight Logistics Card */}
                      {d.carrier_info && (
                        <div style={{
                          backgroundColor: 'rgba(2, 132, 199, 0.06)',
                          border: '1px solid rgba(2, 132, 199, 0.25)',
                          borderRadius: '10px',
                          padding: '14px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Truck size={16} color="#0284c7" />
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                              Carrier Consignment & Waybill Status
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px' }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Carrier Name: </span>
                              <strong>{d.carrier_info.carrier_name}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Waybill Tracking #: </span>
                              <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>{d.carrier_info.tracking_number}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Estimated Arrival: </span>
                              <strong>{d.carrier_info.estimated_delivery}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>Destination Bay: </span>
                              <strong>{d.carrier_info.destination_hub}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order Line Items */}
                      {d.items && d.items.length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                            Order Items Breakdown ({d.items.length} items)
                          </div>
                          <div style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ padding: '8px 12px' }}>Product</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty Ordered</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty Received</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Cost</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.items.map((it, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.product_name}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.quantity_ordered || it.quantity}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.quantity_received || 0}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{(it.unit_cost || it.unit_price || 0).toLocaleString()}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                      ₹{(it.line_total || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Advance Stage Control */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          Advance Lifecycle Milestone:
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrderStage(d.order_reference, 'IN_TRANSIT')}
                            style={{
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark In Transit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrderStage(d.order_reference, 'DOCK_RECEIVED')}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Mark Dock Received
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)'
            }}>
              <button
                type="button"
                onClick={() => setOrderTrackingModal({ ...orderTrackingModal, isOpen: false })}
                style={{
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Tracking Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
