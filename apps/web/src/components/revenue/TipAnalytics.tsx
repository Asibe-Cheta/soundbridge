'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Target, TrendingUp, Users, DollarSign, Calendar, Plus, Edit, Trash2, Eye, EyeOff, Crown, Star } from 'lucide-react';

interface TipAnalyticsData {
  total_tips: number;
  total_amount: number;
  total_earnings: number;
  total_fees: number;
  average_tip: number;
  tips_by_tier: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

interface TipGoal {
  id: string;
  goal_name: string;
  goal_description: string;
  target_amount: number;
  current_amount: number;
  completion_percentage: number;
  goal_type: string;
  is_active: boolean;
  is_completed: boolean;
  end_date?: string;
}

interface TipAnalyticsProps {
  userId: string;
  userTier: 'free' | 'pro';
}

export function TipAnalytics({ userId, userTier }: TipAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TipAnalyticsData | null>(null);
  const [goals, setGoals] = useState<TipGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<TipGoal | null>(null);

  // New goal form state
  const [newGoal, setNewGoal] = useState({
    goal_name: '',
    goal_description: '',
    target_amount: 100,
    goal_type: 'monthly',
    end_date: ''
  });

  useEffect(() => {
    loadAnalytics();
    if (userTier !== 'free') {
      loadGoals();
    }
  }, [userId, userTier]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/user/tip-analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load tip analytics');
    }
  };

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/user/tip-goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      const response = await fetch('/api/user/tip-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal)
      });

      if (response.ok) {
        setShowCreateGoal(false);
        setNewGoal({ goal_name: '', goal_description: '', target_amount: 100, goal_type: 'monthly', end_date: '' });
        loadGoals();
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/user/tip-goals?goal_id=${goalId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadGoals();
      }
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const hasProFeatures = userTier === 'pro' || userTier === 'enterprise';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Tip Analytics & Goals
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track your tip performance and set goals
            </p>
          </div>
        </div>
        {hasProFeatures && (
          <button
            onClick={() => setShowCreateGoal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        )}
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${analytics.total_earnings.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tips</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {analytics.total_tips}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Tip</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${analytics.average_tip.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Platform Fees</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${analytics.total_fees.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips by Tier Breakdown */}
      {analytics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tips by User Tier
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Free Users</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.tips_by_tier.free} tips
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Pro Users</span>
                <Crown className="w-4 h-4 text-blue-500" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.tips_by_tier.pro} tips
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700 dark:text-gray-300">Enterprise Users</span>
                <Star className="w-4 h-4 text-purple-500" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.tips_by_tier.enterprise} tips
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tip Goals Section */}
      {hasProFeatures ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tip Goals
            </h3>
            <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
              PRO FEATURE
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No tip goals yet
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Set goals to motivate your fans and track your progress
              </p>
              <button
                onClick={() => setShowCreateGoal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {goal.goal_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {goal.goal_description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Progress: ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {goal.completion_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(goal.completion_percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{goal.goal_type}</span>
                      <span className={goal.is_completed ? 'text-green-600' : 'text-gray-500'}>
                        {goal.is_completed ? 'Completed! 🎉' : goal.end_date ? `Due: ${new Date(goal.end_date).toLocaleDateString()}` : 'Ongoing'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Crown className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Tip Goals & Analytics
            </h3>
          </div>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            Upgrade to Pro to set tip goals, track detailed analytics, and motivate your fans with progress tracking!
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Tip Goal
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={newGoal.goal_name}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Monthly Content Creation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newGoal.goal_description}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what this goal is for..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Amount
                </label>
                <input
                  type="number"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Type
                </label>
                <select
                  value={newGoal.goal_type}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="one_time">One Time</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={newGoal.end_date}
                  onChange={(e) => setNewGoal({ ...newGoal, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateGoal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
