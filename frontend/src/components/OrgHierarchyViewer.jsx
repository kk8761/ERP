import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Shield, ChevronRight, ChevronDown, Search,
  Briefcase, Mail, Phone, Building2, Crown, Sparkles, ArrowDown,
  ArrowRight, Edit3, Save, X, RefreshCw, CheckCircle2, AlertTriangle,
  Layers, GitFork, User, Lock, Eye
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function OrgHierarchyViewer({ onSelectEmployee }) {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'tiers'

  // Edit Reporting Line Modal
  const [editModal, setEditModal] = useState({
    isOpen: false,
    employee: null,
    targetManagerId: '',
    targetTier: 'MEMBER'
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/hr/org-hierarchy');
      setData(res);
      if (res && res.flat && res.flat.length > 0) {
        // Default select executive or first employee
        if (!selectedNode) {
          const root = res.flat.find(e => e.hierarchy_role === 'EXECUTIVE') || res.flat[0];
          setSelectedNode(root);
        } else {
          const refreshed = res.flat.find(e => e.id === selectedNode.id);
          if (refreshed) setSelectedNode(refreshed);
        }
      }
    } catch (err) {
      console.error('Failed to load org hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const canEdit = Boolean(
    user?.is_superuser ||
    data?.permissions?.can_edit_hierarchy ||
    hasPermission('hr.manage') ||
    hasPermission('roles.manage')
  );

  const handleOpenEdit = (emp) => {
    if (!canEdit) {
      alert("Role-Based Restriction: You have viewing access only. Manager or HR Administrator permissions required to edit reporting lines.");
      return;
    }
    setEditModal({
      isOpen: true,
      employee: emp,
      targetManagerId: emp.reports_to_id ? String(emp.reports_to_id) : '',
      targetTier: emp.hierarchy_role || 'MEMBER'
    });
    setModalError('');
  };

  const handleSaveReportingLine = async (e) => {
    e.preventDefault();
    if (!editModal.employee) return;
    setSaving(true);
    setModalError('');

    try {
      const payload = {
        reports_to_id: editModal.targetManagerId ? parseInt(editModal.targetManagerId) : null,
        hierarchy_role: editModal.targetTier
      };

      const res = await apiRequest(`/api/hr/employees/${editModal.employee.id}/reporting-line`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setSuccessToast(res.message || 'Reporting line updated successfully!');
      setTimeout(() => setSuccessToast(''), 3500);
      setEditModal({ isOpen: false, employee: null, targetManagerId: '', targetTier: 'MEMBER' });
      await loadHierarchy();

      // Trigger global event for real-time synchronization across app
      window.dispatchEvent(new CustomEvent('nexaerp:employee_hierarchy_updated'));
    } catch (err) {
      setModalError(err.message || 'Failed to update reporting line.');
    } finally {
      setSaving(false);
    }
  };

  const getTierBadge = (role) => {
    switch (role) {
      case 'EXECUTIVE':
        return {
          label: 'Executive / Boss',
          icon: Crown,
          bg: 'rgba(234, 179, 8, 0.15)',
          color: '#b45309',
          border: '1px solid rgba(234, 179, 8, 0.35)'
        };
      case 'MANAGER':
        return {
          label: 'Department Manager',
          icon: Shield,
          bg: 'rgba(59, 130, 246, 0.12)',
          color: '#1d4ed8',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        };
      case 'TEAM_LEAD':
        return {
          label: 'Team Lead',
          icon: Sparkles,
          bg: 'rgba(168, 85, 247, 0.12)',
          color: '#7e22ce',
          border: '1px solid rgba(168, 85, 247, 0.3)'
        };
      default:
        return {
          label: 'Team Member',
          icon: User,
          bg: 'rgba(100, 116, 139, 0.1)',
          color: '#475569',
          border: '1px solid rgba(100, 116, 139, 0.25)'
        };
    }
  };

  const filterEmployees = () => {
    if (!data?.flat) return [];
    return data.flat.filter(e => {
      const matchSearch = !searchQuery ||
        e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTier = filterTier === 'ALL' || e.hierarchy_role === filterTier;
      return matchSearch && matchTier;
    });
  };

  // Find boss chain for selected employee
  const getBossChain = (emp) => {
    if (!emp || !data?.flat) return [];
    const chain = [];
    let curr = emp;
    const visited = new Set();
    while (curr && curr.reports_to_id && !visited.has(curr.id)) {
      visited.add(curr.id);
      const boss = data.flat.find(e => e.id === curr.reports_to_id);
      if (boss) {
        chain.unshift(boss);
        curr = boss;
      } else {
        break;
      }
    }
    return chain;
  };

  // Find direct subordinates for selected employee
  const getDirectSubordinates = (emp) => {
    if (!emp || !data?.flat) return [];
    return data.flat.filter(e => e.reports_to_id === emp.id);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 600 }}>Loading Centralized Company Org Structure...</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>Compiling reporting chains and multi-tier hierarchy</div>
      </div>
    );
  }

  const filtered = filterEmployees();
  const bossChain = getBossChain(selectedNode);
  const subordinates = getDirectSubordinates(selectedNode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Toast feedback */}
      {successToast && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#f0fdf4',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner: Company Hierarchy & Role-Based Security Notice */}
      <div className="nexa-card" style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.03) 0%, rgba(99, 102, 241, 0.06) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>
              CENTRALIZED ORG HIERARCHY
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              Company-Wide Chain of Command
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 2px', color: 'var(--text-main)' }}>
            Organizational Structure & Reporting Lines
          </h3>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Map and manage who is the boss of who across Executives, Department Managers, Team Leads, and Members. 
            Identical and synchronized across desktop, tablet, and mobile.
          </p>
        </div>

        {/* Role-Based Permissions Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: canEdit ? 'rgba(22, 163, 74, 0.08)' : 'rgba(100, 116, 139, 0.08)',
          border: `1px solid ${canEdit ? 'rgba(22, 163, 74, 0.25)' : 'var(--border-color)'}`,
          borderRadius: '8px'
        }}>
          {canEdit ? (
            <>
              <Shield size={16} color="#16a34a" />
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Hierarchy Editor Mode</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Authorized to reassign managers & tiers</div>
              </div>
            </>
          ) : (
            <>
              <Eye size={16} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)' }}>Role-Based View Only</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Standard member viewing permissions</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Tiers Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Company Headcount', count: data?.stats?.total_headcount || 0, icon: Users, color: '#0284c7', sub: 'All operational staff' },
          { label: 'C-Suite & Executives', count: data?.stats?.executives_count || 0, icon: Crown, color: '#b45309', sub: 'Board & General Directors' },
          { label: 'Department Managers', count: data?.stats?.managers_count || 0, icon: Shield, color: '#1d4ed8', sub: 'Finance, HR, Logistics heads' },
          { label: 'Team Leads', count: data?.stats?.team_leads_count || 0, icon: Sparkles, color: '#7e22ce', sub: 'Shift & functional leads' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="nexa-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: `${kpi.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: kpi.color,
                flexShrink: 0
              }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{kpi.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>{kpi.count}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: Search, Tier Filters & View Toggle */}
      <div className="nexa-card" style={{
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search person, boss, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '12px',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {['ALL', 'EXECUTIVE', 'MANAGER', 'TEAM_LEAD', 'MEMBER'].map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className="btn btn-ghost"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: filterTier === tier ? 800 : 500,
                  backgroundColor: filterTier === tier ? 'var(--primary-light)' : 'transparent',
                  color: filterTier === tier ? 'var(--primary)' : 'var(--text-secondary)',
                  border: filterTier === tier ? '1px solid var(--primary)' : '1px solid transparent',
                  borderRadius: '4px'
                }}
              >
                {tier === 'ALL' ? 'All Roles' : tier.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode('tree')}
            className="btn btn-ghost"
            style={{
              fontSize: '11.5px',
              padding: '5px 10px',
              backgroundColor: viewMode === 'tree' ? 'var(--primary-light)' : 'transparent',
              color: viewMode === 'tree' ? 'var(--primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <GitFork size={13} style={{ marginRight: '4px' }} />
            <span>Interactive Tree</span>
          </button>
          <button
            onClick={() => setViewMode('tiers')}
            className="btn btn-ghost"
            style={{
              fontSize: '11.5px',
              padding: '5px 10px',
              backgroundColor: viewMode === 'tiers' ? 'var(--primary-light)' : 'transparent',
              color: viewMode === 'tiers' ? 'var(--primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Layers size={13} style={{ marginRight: '4px' }} />
            <span>Tier Columns</span>
          </button>
        </div>
      </div>

      {/* Main Body: Hierarchy Explorer & "Who is the Boss of Who" Chain Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 340px' : '1fr', gap: '16px', alignItems: 'start' }}>
        
        {/* Left Column: Organization Chart View */}
        <div className="nexa-card" style={{ padding: '20px', minHeight: '520px', overflowX: 'auto' }}>
          
          {viewMode === 'tree' ? (
            /* Nested Tree Flowchart View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                EXECUTIVE SUITE ➔ MANAGERS ➔ TEAM LEADS ➔ CONTRIBUTORS
              </div>

              {data?.tree?.map(rootNode => (
                <TreeNode
                  key={rootNode.id}
                  node={rootNode}
                  selectedId={selectedNode?.id}
                  onSelect={(n) => setSelectedNode(n)}
                  onEdit={handleOpenEdit}
                  canEdit={canEdit}
                  getTierBadge={getTierBadge}
                />
              ))}

              {(!data?.tree || data.tree.length === 0) && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No hierarchy nodes found.
                </div>
              )}
            </div>
          ) : (
            /* Tier Columns Matrix View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {[
                { title: '👑 Executives & Directors', tier: 'EXECUTIVE', items: data?.tiers?.executives || [] },
                { title: '👔 Department Managers', tier: 'MANAGER', items: data?.tiers?.managers || [] },
                { title: '⚡ Team Leads', tier: 'TEAM_LEAD', items: data?.tiers?.team_leads || [] },
                { title: '💼 Team Members', tier: 'MEMBER', items: data?.tiers?.members || [] }
              ].map(col => (
                <div key={col.tier} style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{col.title}</span>
                    <span className="badge" style={{ fontSize: '10px' }}>{col.items.length}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.items.map(item => {
                      const isSelected = selectedNode?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedNode(item)}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.full_name}
                            </span>
                            {item.direct_reports_count > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>
                                {item.direct_reports_count} reports
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {item.designation}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Boss: <strong>{item.reports_to_name || 'Top Authority'}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: "Who is the Boss of Who" Chain Inspector */}
        {selectedNode && (
          <div className="nexa-card animate-fade-in" style={{
            padding: '18px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '20px'
          }}>
            {/* Inspector Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  CHAIN OF COMMAND INSPECTOR
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>
                  {selectedNode.full_name}
                </h4>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {selectedNode.designation} ({selectedNode.employee_code})
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleOpenEdit(selectedNode)}
                  className="btn btn-ghost"
                  title="Edit Boss / Reassign Reporting Line"
                  style={{ padding: '6px', color: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>

            {/* Role Badge */}
            {(() => {
              const badge = getTierBadge(selectedNode.hierarchy_role);
              const BadgeIcon = badge.icon;
              return (
                <div style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: badge.border,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <BadgeIcon size={14} />
                  <span>{badge.label}</span>
                </div>
              );
            })()}

            {/* Department & Branch */}
            <div style={{
              padding: '10px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px',
              fontSize: '11.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={13} color="var(--primary)" />
                <span>{selectedNode.department_name} • {selectedNode.branch_location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-secondary)' }}>{selectedNode.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={13} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-secondary)' }}>{selectedNode.phone}</span>
              </div>
            </div>

            {/* 1. Direct Boss / Superior Section ("Who is the boss of who?") */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Direct Boss (Reports To):
              </div>
              {selectedNode.reports_to_name ? (
                <div
                  onClick={() => {
                    const bossObj = data?.flat?.find(e => e.id === selectedNode.reports_to_id);
                    if (bossObj) setSelectedNode(bossObj);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d4ed8' }}>
                      {selectedNode.reports_to_name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      Senior Reporting Authority ➔
                    </div>
                  </div>
                  <ChevronRight size={15} color="#1d4ed8" />
                </div>
              ) : (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  color: '#b45309',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  👑 Root Executive / Top Company Authority (No direct boss)
                </div>
              )}
            </div>

            {/* 2. Direct Subordinates Section ("Who reports to this person?") */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Direct Subordinates ({subordinates.length}):
                </span>
              </div>
              {subordinates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {subordinates.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedNode(sub)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.full_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub.designation}</div>
                      </div>
                      <ChevronRight size={12} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  No team members report to this individual.
                </div>
              )}
            </div>

            {/* 3. Upward Chain of Command Breadcrumb */}
            {bossChain.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Upward Chain of Command:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  {bossChain.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Level {i + 1}:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{b.full_name}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>({b.designation})</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <ArrowDown size={11} color="var(--primary)" />
                    <strong style={{ color: 'var(--primary)' }}>{selectedNode.full_name} (Current)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Reporting Line Modal */}
      {editModal.isOpen && editModal.employee && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content animate-fade-in" style={{
            maxWidth: '520px',
            width: '92vw',
            padding: '24px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitFork size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Reassign Reporting Line & Boss
                </h3>
              </div>
              <button
                onClick={() => setEditModal({ isOpen: false, employee: null, targetManagerId: '', targetTier: 'MEMBER' })}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReportingLine} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Target Employee:
                </label>
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-main)'
                }}>
                  {editModal.employee.full_name} ({editModal.employee.designation})
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Hierarchy Authority Tier:
                </label>
                <select
                  value={editModal.targetTier}
                  onChange={(e) => setEditModal(prev => ({ ...prev, targetTier: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="EXECUTIVE">👑 Executive / Director (Top Leadership)</option>
                  <option value="MANAGER">👔 Department Manager (Supervises Leads & Staff)</option>
                  <option value="TEAM_LEAD">⚡ Team Lead (Supervises Functional Units)</option>
                  <option value="MEMBER">💼 Team Member / Contributor</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Direct Reporting Boss (Who is the boss of this employee?):
                </label>
                <select
                  value={editModal.targetManagerId}
                  onChange={(e) => setEditModal(prev => ({ ...prev, targetManagerId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    fontSize: '12.5px',
                    fontWeight: 600
                  }}
                >
                  <option value="">-- No Direct Boss (Root Executive / Top Authority) --</option>
                  {data?.flat
                    ?.filter(e => e.id !== editModal.employee.id)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} — {m.designation} ({m.hierarchy_role})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '10px',
                borderRadius: '6px',
                lineHeight: 1.4
              }}>
                ℹ️ <strong>Centralized & Loop Protected:</strong> Updates will be persisted to the central database, propagated to all connected web, tablet, and mobile clients, and recorded in the immutable audit log. Circular reporting loops are strictly prohibited.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, employee: null, targetManagerId: '', targetTier: 'MEMBER' })}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      <span>Updating Chain...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Apply Reporting Line</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Recursive Tree Node Renderer
function TreeNode({ node, selectedId, onSelect, onEdit, canEdit, getTierBadge, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const isSelected = selectedId === node.id;
  const hasChildren = node.subordinates && node.subordinates.length > 0;
  const badge = getTierBadge(node.hierarchy_role);
  const BadgeIcon = badge.icon;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      marginLeft: depth > 0 ? '28px' : '0px',
      position: 'relative'
    }}>
      {/* Connector line for children */}
      {depth > 0 && (
        <div style={{
          position: 'absolute',
          left: '-18px',
          top: '20px',
          width: '16px',
          height: '2px',
          backgroundColor: 'var(--border-color)'
        }} />
      )}

      {/* Node Card */}
      <div
        onClick={() => onSelect(node)}
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
          marginBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(!collapsed);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--text-secondary)'
              }}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <div style={{ width: '16px' }} />
          )}

          {/* Avatar Initials */}
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: badge.bg,
            color: badge.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '12px',
            border: badge.border,
            flexShrink: 0
          }}>
            {node.first_name[0]}{node.last_name[0]}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                {node.full_name}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: badge.bg,
                color: badge.color,
                border: badge.border,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <BadgeIcon size={10} />
                <span>{badge.label}</span>
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
              {node.designation} • <span style={{ color: 'var(--text-muted)' }}>{node.department_name}</span>
            </div>
          </div>
        </div>

        {/* Right side stats & edit trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {node.direct_reports_count > 0 && (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              padding: '2px 8px',
              borderRadius: '12px',
              color: 'var(--text-secondary)'
            }}>
              {node.direct_reports_count} direct reports
            </span>
          )}

          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              className="btn btn-ghost"
              title="Edit Reporting Boss"
              style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--primary)' }}
            >
              <Edit3 size={13} style={{ marginRight: '3px' }} />
              <span>Reassign</span>
            </button>
          )}
        </div>
      </div>

      {/* Children Subordinates (Recursion) */}
      {hasChildren && !collapsed && (
        <div style={{
          borderLeft: '2px dashed var(--border-color)',
          marginLeft: '16px',
          paddingLeft: '4px'
        }}>
          {node.subordinates.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              canEdit={canEdit}
              getTierBadge={getTierBadge}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
