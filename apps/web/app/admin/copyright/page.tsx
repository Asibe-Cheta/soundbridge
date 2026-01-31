'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Flag, Users, Clock, CheckCircle, X, Eye, User, Mail, Calendar, Filter, Search, RefreshCw, TrendingUp, FileText, Copyright, Ban, CheckSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTheme } from '../../../src/contexts/ThemeContext';

interface CopyrightReport {
  id: string;
  report_type: string;
  status: string;
  priority: string;
  created_at: string;
  content: {
    id: string;
    title: string;
    user_id: string;
  };
  reporter_type: string;
  reporter_name?: string;
  reason: string;
  copyrighted_work_title?: string;
  copyrighted_work_owner?: string;
}

interface CopyrightFlag {
  id: string;
  flag_type: string;
  content_id: string;
  content_type: string;
  reason: string;
  status: string;
  confidence_score: number;
  risk_level: string;
  created_at: string;
  flagged_by?: string;
}

interface CopyrightStatistics {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  copyright_strikes: number;
  banned_users: number;
  flagged_content: number;
  high_risk_flags: number;
  dmca_requests: number;
}

export default function CopyrightAdminPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [reports, setReports] = useState<CopyrightReport[]>([]);
  const [flags, setFlags] = useState<CopyrightFlag[]>([]);
  const [statistics, setStatistics] = useState<CopyrightStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'reports' | 'flags' | 'statistics'>('reports');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    risk: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadCopyrightData();
    }
  }, [user]);

  const loadCopyrightData = async () => {
    try {
      setLoading(true);
      
      // Load reports
      const reportsResponse = await fetch('/api/reports/content?type=copyright', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.data || []);
      }

      // Load flags
      const flagsResponse = await fetch('/api/copyright/flags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (flagsResponse.ok) {
        const flagsData = await flagsResponse.json();
        setFlags(flagsData.data || []);
      }

      // Load statistics
      const statsResponse = await fetch('/api/admin/copyright/statistics', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData.data || null);
      }

    } catch (error) {
      console.error('Error loading copyright data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (action: string, itemId: string, additionalData?: any) => {
    try {
      const response = await fetch('/api/admin/review-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          queueId: itemId,
          ...additionalData
        })
      });

      if (response.ok) {
        loadCopyrightData(); // Reload data
      } else {
        console.error('Failed to perform admin action');
      }
    } catch (error) {
      console.error('Error performing admin action:', error);
    }
  };

  const isDark = theme === 'dark';

  const getPriorityColor = (priority: string) => {
    if (isDark) {
      switch (priority) {
        case 'urgent': return 'bg-red-500/20 text-red-300';
        case 'high': return 'bg-orange-500/20 text-orange-300';
        case 'normal': return 'bg-blue-500/20 text-blue-300';
        case 'low': return 'bg-gray-500/20 text-gray-300';
        default: return 'bg-gray-500/20 text-gray-300';
      }
    }
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-300';
        case 'in_review': return 'bg-blue-500/20 text-blue-300';
        case 'resolved': return 'bg-green-500/20 text-green-300';
        case 'dismissed': return 'bg-gray-500/20 text-gray-300';
        default: return 'bg-gray-500/20 text-gray-300';
      }
    }
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    if (isDark) {
      switch (risk) {
        case 'high': return 'bg-red-500/20 text-red-300';
        case 'medium': return 'bg-yellow-500/20 text-yellow-300';
        case 'low': return 'bg-green-500/20 text-green-300';
        default: return 'bg-gray-500/20 text-gray-300';
      }
    }
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading copyright management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Copyright Management</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Manage copyright reports, flags, and violations</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg shadow border`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <FileText className={`w-6 h-6 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Reports</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{statistics.total_reports}</p>
                </div>
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg shadow border`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
                  <Clock className={`w-6 h-6 ${isDark ? 'text-yellow-300' : 'text-yellow-600'}`} />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{statistics.pending_reports}</p>
                </div>
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg shadow border`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-red-300' : 'text-red-600'}`} />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Copyright Strikes</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{statistics.copyright_strikes}</p>
                </div>
              </div>
            </div>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg shadow border`}>
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <CheckCircle className={`w-6 h-6 ${isDark ? 'text-green-300' : 'text-green-600'}`} />
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{statistics.resolved_reports}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow mb-6 border`}>
          <div className={`${isDark ? 'border-gray-700' : 'border-gray-200'} border-b`}>
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setSelectedTab('reports')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : isDark
                      ? 'border-transparent text-gray-400 hover:text-gray-200'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Reports ({reports.length})
              </button>
              <button
                onClick={() => setSelectedTab('flags')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'flags'
                    ? 'border-blue-500 text-blue-600'
                    : isDark
                      ? 'border-transparent text-gray-400 hover:text-gray-200'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Flag className="w-4 h-4 inline mr-2" />
                Flagged Content ({flags.length})
              </button>
              <button
                onClick={() => setSelectedTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : isDark
                      ? 'border-transparent text-gray-400 hover:text-gray-200'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Statistics
              </button>
            </nav>
          </div>
        </div>

        {/* Reports Tab */}
        {selectedTab === 'reports' && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Copyright Reports</h2>
                <button
                  onClick={loadCopyrightData}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className={`border rounded-lg p-6 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {report.content?.title || 'Unknown Content'}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Reported by: {report.reporter_name || 'Anonymous'} • {report.reporter_type}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>{report.reason}</p>
                      {report.copyrighted_work_title && (
                        <div className={`${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50'} p-3 rounded-lg`}>
                          <p className={`text-sm font-semibold ${isDark ? 'text-red-200' : 'text-red-900'}`}>Copyrighted Work:</p>
                          <p className={isDark ? 'text-red-200' : 'text-red-800'}>{report.copyrighted_work_title}</p>
                          {report.copyrighted_work_owner && (
                            <p className={isDark ? 'text-red-200' : 'text-red-800'}>Owner: {report.copyrighted_work_owner}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdminAction('resolve', report.id, { actionTaken: 'takedown' })}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Remove Content
                        </button>
                        <button
                          onClick={() => handleAdminAction('resolve', report.id, { actionTaken: 'dismiss' })}
                          className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleAdminAction('escalate', report.id)}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                          Escalate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className={`w-12 h-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No copyright reports found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Flags Tab */}
        {selectedTab === 'flags' && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Flagged Content</h2>
                <button
                  onClick={loadCopyrightData}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {flags.map((flag) => (
                  <div key={flag.id} className={`border rounded-lg p-6 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Content ID: {flag.content_id}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Type: {flag.content_type} • Confidence: {Math.round(flag.confidence_score * 100)}%
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(flag.risk_level)}`}>
                          {flag.risk_level} risk
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(flag.status)}`}>
                          {flag.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>{flag.reason}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Flagged by: {flag.flagged_by ? 'User' : 'System'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(flag.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdminAction('resolve', flag.id, { actionTaken: 'approve' })}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAdminAction('resolve', flag.id, { actionTaken: 'remove' })}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => handleAdminAction('dismiss', flag.id)}
                          className={`px-3 py-1 rounded text-sm ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {flags.length === 0 && (
                  <div className="text-center py-12">
                    <Flag className={`w-12 h-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No flagged content found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {selectedTab === 'statistics' && statistics && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow p-6 border`}>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-6`}>Copyright Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className={`${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50'} p-6 rounded-lg`}>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-blue-200' : 'text-blue-900'} mb-2`}>Reports Overview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-blue-200' : 'text-blue-800'}>Total Reports:</span>
                    <span className={`font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{statistics.total_reports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-blue-200' : 'text-blue-800'}>Pending:</span>
                    <span className={`font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{statistics.pending_reports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-blue-200' : 'text-blue-800'}>Resolved:</span>
                    <span className={`font-semibold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>{statistics.resolved_reports}</span>
                  </div>
                </div>
              </div>

              <div className={`${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50'} p-6 rounded-lg`}>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-red-200' : 'text-red-900'} mb-2`}>Violations</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-red-200' : 'text-red-800'}>Copyright Strikes:</span>
                    <span className={`font-semibold ${isDark ? 'text-red-100' : 'text-red-900'}`}>{statistics.copyright_strikes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-red-200' : 'text-red-800'}>Banned Users:</span>
                    <span className={`font-semibold ${isDark ? 'text-red-100' : 'text-red-900'}`}>{statistics.banned_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-red-200' : 'text-red-800'}>DMCA Requests:</span>
                    <span className={`font-semibold ${isDark ? 'text-red-100' : 'text-red-900'}`}>{statistics.dmca_requests}</span>
                  </div>
                </div>
              </div>

              <div className={`${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50'} p-6 rounded-lg`}>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-yellow-200' : 'text-yellow-900'} mb-2`}>Content Flags</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-yellow-200' : 'text-yellow-800'}>Total Flagged:</span>
                    <span className={`font-semibold ${isDark ? 'text-yellow-100' : 'text-yellow-900'}`}>{statistics.flagged_content}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-yellow-200' : 'text-yellow-800'}>High Risk:</span>
                    <span className={`font-semibold ${isDark ? 'text-yellow-100' : 'text-yellow-900'}`}>{statistics.high_risk_flags}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
