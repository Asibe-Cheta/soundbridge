'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Flag, 
  Users, 
  Clock, 
  CheckCircle, 
  X, 
  Eye,
  User,
  Mail,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  FileText,
  Copyright
} from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';

interface ReviewQueueItem {
  id: string;
  queue_type: string;
  priority: string;
  status: string;
  created_at: string;
  due_date: string;
  reference_type: string;
  reference_id: string;
  assigned_to?: {
    id: string;
    display_name: string;
    email: string;
  };
  reference_data?: any;
  metadata?: any;
}

interface QueueStatistics {
  total_pending: number;
  total_assigned: number;
  total_in_review: number;
  urgent_items: number;
  high_priority: number;
  dmca_requests: number;
  content_reports: number;
  content_flags: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [statistics, setStatistics] = useState<QueueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    assigned: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (user) {
      // You would check user role here
      loadReviewQueue();
    }
  }, [user]);

  const loadReviewQueue = async () => {
    try {
      setLoading(true);
      
      // Supabase automatically handles auth tokens in API calls
      const response = await fetch('/api/admin/review-queue', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for auth
      });

      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.data || []);
        setStatistics(data.statistics || null);
      } else {
        console.error('Failed to load review queue');
      }
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (action: string, queueId: string, additionalData?: any) => {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) return;

      const response = await fetch('/api/admin/review-queue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          queueId,
          ...additionalData
        })
      });

      if (response.ok) {
        await loadReviewQueue(); // Refresh the queue
        setSelectedItem(null);
        alert('Action completed successfully');
      } else {
        const error = await response.json();
        alert(`Action failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error performing admin action:', error);
      alert('Action failed');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'assigned': return 'text-blue-600 bg-blue-100';
      case 'in_review': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dmca': return <Copyright className="h-4 w-4" />;
      case 'content_report': return <Flag className="h-4 w-4" />;
      case 'content_flag': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredItems = queueItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.reference_data?.content?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference_data?.complainant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || item.status === filters.status;
    const matchesPriority = filters.priority === '' || item.priority === filters.priority;
    const matchesType = filters.type === '' || item.queue_type === filters.type;
    const matchesAssigned = filters.assigned === '' || 
      (filters.assigned === 'unassigned' && !item.assigned_to) ||
      (filters.assigned === 'assigned' && item.assigned_to);

    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAssigned;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600">Please log in with admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={loadReviewQueue}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Items</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.total_pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Urgent Items</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.urgent_items}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Copyright className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">DMCA Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.dmca_requests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Flag className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Content Reports</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.content_reports}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by content title or complainant name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="dmca">DMCA</option>
                <option value="content_report">Content Report</option>
                <option value="content_flag">Content Flag</option>
              </select>
            </div>
          </div>
        </div>

        {/* Review Queue Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Review Queue</h2>
            <p className="text-sm text-gray-600">Manage content reports, DMCA requests, and flagged content</p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading review queue...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.queue_type)}
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {item.queue_type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.reference_data?.content?.title || item.reference_data?.content_title || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.reference_data?.complainant_name || item.reference_data?.reporter_name || 'Anonymous'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.assigned_to ? (
                          <div>
                            <div className="font-medium">{item.assigned_to.display_name}</div>
                            <div className="text-gray-500">{item.assigned_to.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No items found in the review queue</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAction={handleAdminAction}
        />
      )}
    </div>
  );
}

// Item Detail Modal Component
function ItemDetailModal({ 
  item, 
  onClose, 
  onAction 
}: { 
  item: ReviewQueueItem; 
  onClose: () => void; 
  onAction: (action: string, queueId: string, data?: any) => void;
}) {
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const handleSubmitAction = () => {
    if (!action) return;

    const actionData: any = {};
    if (notes) actionData.reviewNotes = notes;
    if (assignTo) actionData.assignTo = assignTo;

    onAction(action, item.id, actionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Review Item Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Item Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Item Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{item.queue_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <p className="text-sm text-gray-900">{item.priority}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{item.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                {item.due_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Due Date</label>
                    <p className="text-sm text-gray-900">{new Date(item.due_date).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Content Details</h3>
              {item.reference_data && (
                <div className="space-y-3">
                  {item.reference_data.content?.title && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Content Title</label>
                      <p className="text-sm text-gray-900">{item.reference_data.content.title}</p>
                    </div>
                  )}
                  {item.reference_data.complainant_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Complainant</label>
                      <p className="text-sm text-gray-900">{item.reference_data.complainant_name}</p>
                    </div>
                  )}
                  {item.reference_data.reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Reason</label>
                      <p className="text-sm text-gray-900">{item.reference_data.reason}</p>
                    </div>
                  )}
                  {item.reference_data.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-900">{item.reference_data.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Action</option>
                  <option value="assign">Assign</option>
                  <option value="resolve">Resolve</option>
                  <option value="escalate">Escalate</option>
                  <option value="dismiss">Dismiss</option>
                </select>
              </div>

              {action === 'assign' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                  <input
                    type="text"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    placeholder="User ID or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this action..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={!action}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
