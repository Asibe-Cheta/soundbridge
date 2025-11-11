'use client';

import React, { useState } from 'react';
import type { MessageBubbleProps } from '../../lib/types/messaging';
import { MoreVertical, Trash2, Reply, Copy, Download, Play, Pause, Volume2, Calendar, FileText, Music, Image as ImageIcon } from 'lucide-react';

export function MessageBubble({
  message,
  isOwnMessage,
  onDeleteMessage,
  onReplyToMessage
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatAudioTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const handleDeleteMessage = () => {
    if (onDeleteMessage) {
      onDeleteMessage(message.id);
    }
    setShowMenu(false);
  };

  const handleReplyToMessage = () => {
    if (onReplyToMessage) {
      onReplyToMessage(message);
    }
    setShowMenu(false);
  };

  const renderCollaborationRequest = () => {
    try {
      const request = JSON.parse(message.content);
      return (
        <div className="bg-white/10 rounded-lg p-3 border border-accent-pink/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-accent-pink" />
            <span className="text-sm font-medium text-accent-pink">Collaboration Request</span>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Subject:</span>
              <p className="text-white font-medium">{request.subject}</p>
            </div>

            <div>
              <span className="text-gray-400">Description:</span>
              <p className="text-white">{request.description}</p>
            </div>

            {request.deadline && (
              <div>
                <span className="text-gray-400">Deadline:</span>
                <p className="text-white">{request.deadline}</p>
              </div>
            )}

            {request.projectType && (
              <div>
                <span className="text-gray-400">Project Type:</span>
                <p className="text-white">{request.projectType}</p>
              </div>
            )}

            {request.compensation && (
              <div>
                <span className="text-gray-400">Compensation:</span>
                <p className="text-white">{request.compensation}</p>
              </div>
            )}
          </div>
        </div>
      );
    } catch {
      return <p className="text-white">{message.content}</p>;
    }
  };

  const renderAudioMessage = () => {
    return (
      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-accent-pink flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Music size={14} className="text-accent-pink" />
              <span className="text-sm font-medium text-white">Audio Message</span>
            </div>

            <div className="bg-white/5 rounded-full h-2 mb-2">
              <div
                className="bg-accent-pink h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImageMessage = () => {
    return (
      <div className="bg-white/10 rounded-lg p-2 border border-white/20">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={14} className="text-accent-pink" />
          <span className="text-sm font-medium text-white">Image</span>
        </div>

        <img
          src={message.attachment_url || ''}
          alt="Message attachment"
          className="rounded-lg max-w-full max-h-64 object-cover"
        />
      </div>
    );
  };

  const renderFileMessage = () => {
    return (
      <div className="bg-white/10 rounded-lg p-3 border border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-pink/20 rounded-lg flex items-center justify-center">
            <FileText size={20} className="text-accent-pink" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-white">{message.attachment_name}</p>
            <p className="text-xs text-gray-400">
              {message.attachment_type} • {(message.attachment_url ? 0 : 0).toFixed(2)} MB
            </p>
          </div>

          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Download size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'collaboration':
        return renderCollaborationRequest();
      case 'audio':
        return renderAudioMessage();
      case 'image':
        return renderImageMessage();
      case 'file':
        return renderFileMessage();
      default:
        return <p className="text-white whitespace-pre-wrap">{message.content}</p>;
    }
  };

  return (
    <div className={`message-container flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`message-bubble max-w-[70%] relative group ${isOwnMessage
          ? 'bg-gradient-to-r from-primary-red to-accent-pink text-white'
          : 'bg-white/10 border border-white/20 text-white'
        }`}>
        {/* Message Content */}
        <div className="p-3 rounded-lg">
          {renderMessageContent()}
        </div>

        {/* Message Footer */}
        <div className="flex items-center justify-between mt-2 px-3 pb-2">
          <span className="text-xs opacity-70">
            {formatTime(message.created_at)}
          </span>

          <div className="flex items-center gap-1">
            {message.is_read && (
              <div className="w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
            >
              <MoreVertical size={12} />
            </button>
          </div>
        </div>

        {/* Message Menu */}
        {showMenu && (
          <div className="absolute top-0 right-0 mt-2 mr-2 bg-gray-900 rounded-lg shadow-lg border border-white/20 z-10">
            <div className="py-1">
              <button
                onClick={handleReplyToMessage}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors w-full"
              >
                <Reply size={14} />
                Reply
              </button>

              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors w-full"
              >
                <Copy size={14} />
                Copy
              </button>

              {isOwnMessage && onDeleteMessage && (
                <button
                  onClick={handleDeleteMessage}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 