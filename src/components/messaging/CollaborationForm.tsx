'use client';

import React, { useState } from 'react';
import type { CollaborationFormProps, CollaborationRequest } from '../../lib/types/messaging';
import {
  Calendar,
  DollarSign,
  Users,
  Music,
  Mic,
  Video,
  FileText,
  Send,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function CollaborationForm({
  recipientId,
  recipientName,
  onSubmit,
  isLoading
}: CollaborationFormProps) {
  const [formData, setFormData] = useState<CollaborationRequest>({
    subject: '',
    description: '',
    deadline: '',
    projectType: '',
    compensation: '',
    requirements: []
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [newRequirement, setNewRequirement] = useState('');

  const projectTypes = [
    { id: 'recording', label: 'Recording Session', icon: Music },
    { id: 'live_performance', label: 'Live Performance', icon: Mic },
    { id: 'music_video', label: 'Music Video', icon: Video },
    { id: 'songwriting', label: 'Songwriting', icon: FileText },
    { id: 'production', label: 'Music Production', icon: Music },
    { id: 'mixing', label: 'Mixing & Mastering', icon: Music },
    { id: 'event', label: 'Event Collaboration', icon: Users },
    { id: 'other', label: 'Other', icon: FileText }
  ];

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.projectType) {
      newErrors.projectType = 'Project type is required';
    }

    if (formData.deadline && new Date(formData.deadline) < new Date()) {
      newErrors.deadline = 'Deadline cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({
        subject: '',
        description: '',
        deadline: '',
        projectType: '',
        compensation: '',
        requirements: []
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to send collaboration request:', error);
    }
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim() && !formData.requirements.includes(newRequirement.trim())) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRequirement();
    }
  };

  return (
    <div className="collaboration-form bg-white/5 rounded-lg p-4 border border-accent-pink/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-accent-pink" />
          <h3 className="text-lg font-semibold text-white">Collaboration Request</h3>
        </div>
        <span className="text-sm text-gray-400">to {recipientName}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Subject *
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors ${errors.subject ? 'border-red-500' : 'border-white/20'
              }`}
            placeholder="Enter collaboration subject..."
          />
          {errors.subject && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.subject}
            </p>
          )}
        </div>

        {/* Project Type */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Project Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {projectTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, projectType: type.id }))}
                className={`p-3 rounded-lg border transition-all duration-200 flex items-center gap-2 ${formData.projectType === type.id
                    ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <type.icon size={16} />
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
          {errors.projectType && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.projectType}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-white/20'
              }`}
            placeholder="Describe your collaboration proposal..."
          />
          {errors.description && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.description}
            </p>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Deadline
          </label>
          <input
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-accent-pink transition-colors ${errors.deadline ? 'border-red-500' : 'border-white/20'
              }`}
          />
          {errors.deadline && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.deadline}
            </p>
          )}
        </div>

        {/* Compensation */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Compensation
          </label>
          <div className="relative">
            <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={formData.compensation}
              onChange={(e) => setFormData(prev => ({ ...prev, compensation: e.target.value }))}
              className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors"
              placeholder="e.g., $500, Revenue share, etc."
            />
          </div>
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Requirements
          </label>
          <div className="space-y-2">
            {formData.requirements.map((requirement, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                <span className="text-sm text-white flex-1">{requirement}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(index)}
                  className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors"
                placeholder="Add a requirement..."
              />
              <button
                type="button"
                onClick={handleAddRequirement}
                disabled={!newRequirement.trim()}
                className="px-3 py-2 bg-accent-pink/20 border border-accent-pink/30 rounded-lg text-accent-pink hover:bg-accent-pink/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary-red to-accent-pink text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 