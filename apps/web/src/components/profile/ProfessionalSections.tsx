'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Briefcase, Award, Music2, Calendar, MapPin, Save, Loader2 } from 'lucide-react';

interface ExperienceEntry {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

interface ProfessionalSectionsProps {
  userId: string;
  isOwner: boolean;
  onHeadlineUpdate?: () => void;
  onConnectionUpdate?: () => void;
}

export function ProfessionalSections({ userId, isOwner, onHeadlineUpdate, onConnectionUpdate }: ProfessionalSectionsProps) {
  const [headline, setHeadline] = useState<string>('');
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [headlineInput, setHeadlineInput] = useState('');
  const [connectionCount, setConnectionCount] = useState(0);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingInstrument, setIsAddingInstrument] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newInstrument, setNewInstrument] = useState('');

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchHeadline(),
        fetchConnectionCount(),
        fetchExperience(),
        fetchSkills(),
        fetchInstruments(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeadline = async () => {
    try {
      const response = await fetch('/api/profile/headline', { credentials: 'include' });
      const data = await response.json();
      if (data.success && data.headline) {
        setHeadline(data.headline);
        setHeadlineInput(data.headline);
      }
    } catch (err) {
      console.error('Failed to fetch headline:', err);
    }
  };

  const fetchConnectionCount = async () => {
    try {
      const response = await fetch('/api/connections', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setConnectionCount(data.data?.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const fetchExperience = async () => {
    try {
      const response = await fetch('/api/profile/experience', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setExperience(data.data?.experience || []);
      }
    } catch (err) {
      console.error('Failed to fetch experience:', err);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/profile/skills', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSkills((data.data?.skills || []).map((s: any) => s.skill));
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    }
  };

  const fetchInstruments = async () => {
    try {
      const response = await fetch('/api/profile/instruments', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setInstruments((data.data?.instruments || []).map((i: any) => i.instrument));
      }
    } catch (err) {
      console.error('Failed to fetch instruments:', err);
    }
  };

  const handleSaveHeadline = async () => {
    try {
      const response = await fetch('/api/profile/headline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ headline: headlineInput }),
      });
      const data = await response.json();
      if (data.success) {
        setHeadline(headlineInput);
        setIsEditingHeadline(false);
        onHeadlineUpdate?.();
      }
    } catch (err) {
      console.error('Failed to save headline:', err);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || skills.includes(newSkill.trim())) return;

    try {
      const response = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ skill: newSkill.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setSkills([...skills, newSkill.trim()]);
        setNewSkill('');
        setIsAddingSkill(false);
      }
    } catch (err) {
      console.error('Failed to add skill:', err);
    }
  };

  const handleRemoveSkill = async (skill: string) => {
    try {
      const response = await fetch('/api/profile/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ skill }),
      });
      const data = await response.json();
      if (data.success) {
        setSkills(skills.filter(s => s !== skill));
      }
    } catch (err) {
      console.error('Failed to remove skill:', err);
    }
  };

  const handleAddInstrument = async () => {
    if (!newInstrument.trim() || instruments.includes(newInstrument.trim())) return;

    try {
      const response = await fetch('/api/profile/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instrument: newInstrument.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setInstruments([...instruments, newInstrument.trim()]);
        setNewInstrument('');
        setIsAddingInstrument(false);
      }
    } catch (err) {
      console.error('Failed to add instrument:', err);
    }
  };

  const handleRemoveInstrument = async (instrument: string) => {
    try {
      const response = await fetch('/api/profile/instruments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instrument }),
      });
      const data = await response.json();
      if (data.success) {
        setInstruments(instruments.filter(i => i !== instrument));
      }
    } catch (err) {
      console.error('Failed to remove instrument:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Headline */}
      {isOwner && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Professional Headline</h3>
          </div>
          <div className="card-content">
            {isEditingHeadline ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={headlineInput}
                  onChange={(e) => setHeadlineInput(e.target.value)}
                  maxLength={120}
                  className="flex-1 form-input"
                  placeholder="e.g., Gospel Singer & Songwriter"
                />
                <button
                  onClick={handleSaveHeadline}
                  className="btn-primary"
                >
                  <Save size={16} />
                  Save
                </button>
                <button
                  onClick={() => {
                    setHeadlineInput(headline);
                    setIsEditingHeadline(false);
                  }}
                  className="btn-secondary"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-300">
                  {headline || 'Add a professional headline (e.g., "Gospel Singer & Songwriter")'}
                </p>
                <button
                  onClick={() => setIsEditingHeadline(true)}
                  className="btn-secondary"
                >
                  <Edit2 size={16} />
                  {headline ? 'Edit' : 'Add'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection Count */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Connections</h3>
        </div>
        <div className="card-content">
          <p className="text-2xl font-bold text-white">{connectionCount}</p>
          <p className="text-gray-400 text-sm">Total connections</p>
        </div>
      </div>

      {/* Experience Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Experience</h3>
          {isOwner && (
            <button
              onClick={() => setIsAddingExperience(true)}
              className="btn-secondary"
            >
              <Plus size={16} />
              Add Experience
            </button>
          )}
        </div>
        <div className="card-content">
          {experience.length === 0 ? (
            <p className="text-gray-400 text-sm">No experience entries yet</p>
          ) : (
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} className="border-l-2 border-red-500/50 pl-4">
                  <h4 className="font-semibold text-white">{exp.title}</h4>
                  {exp.company && <p className="text-gray-300">{exp.company}</p>}
                  {(exp.start_date || exp.end_date || exp.is_current) && (
                    <p className="text-gray-400 text-sm">
                      {exp.start_date && new Date(exp.start_date).getFullYear()}
                      {exp.end_date && !exp.is_current && ` - ${new Date(exp.end_date).getFullYear()}`}
                      {exp.is_current && ' - Present'}
                    </p>
                  )}
                  {exp.description && (
                    <p className="text-gray-300 text-sm mt-1">{exp.description}</p>
                  )}
                  {isOwner && (
                    <div className="flex gap-2 mt-2">
                      <button className="text-red-400 hover:text-red-300 text-xs">
                        <Edit2 size={12} /> Edit
                      </button>
                      <button className="text-red-400 hover:text-red-300 text-xs">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Skills</h3>
          {isOwner && (
            <button
              onClick={() => setIsAddingSkill(true)}
              className="btn-secondary"
            >
              <Plus size={16} />
              Add Skill
            </button>
          )}
        </div>
        <div className="card-content">
          {isAddingSkill ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                className="flex-1 form-input"
                placeholder="e.g., Vocals, Production"
                autoFocus
              />
              <button onClick={handleAddSkill} className="btn-primary">
                <Save size={16} />
              </button>
              <button
                onClick={() => {
                  setNewSkill('');
                  setIsAddingSkill(false);
                }}
                className="btn-secondary"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-gray-400 text-sm">No skills added yet</p>
              ) : (
                skills.map((skill, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 text-sm flex items-center gap-2"
                  >
                    <span>{skill}</span>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instruments Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Instruments</h3>
          {isOwner && (
            <button
              onClick={() => setIsAddingInstrument(true)}
              className="btn-secondary"
            >
              <Plus size={16} />
              Add Instrument
            </button>
          )}
        </div>
        <div className="card-content">
          {isAddingInstrument ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newInstrument}
                onChange={(e) => setNewInstrument(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddInstrument()}
                className="flex-1 form-input"
                placeholder="e.g., Piano, Guitar, Drums"
                autoFocus
              />
              <button onClick={handleAddInstrument} className="btn-primary">
                <Save size={16} />
              </button>
              <button
                onClick={() => {
                  setNewInstrument('');
                  setIsAddingInstrument(false);
                }}
                className="btn-secondary"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {instruments.length === 0 ? (
                <p className="text-gray-400 text-sm">No instruments added yet</p>
              ) : (
                instruments.map((instrument, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-gray-800 rounded-full text-gray-300 text-sm flex items-center gap-2"
                  >
                    <span>{instrument}</span>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveInstrument(instrument)}
                        className="hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

