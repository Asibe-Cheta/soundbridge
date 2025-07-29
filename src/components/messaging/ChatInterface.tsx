'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ChatInterfaceProps, MessageType, MessageAttachment } from '../../lib/types/messaging';
import { MessageBubble } from './MessageBubble';
import { CollaborationForm } from './CollaborationForm';
import { FileUpload } from './FileUpload';
import {
  Send,
  Paperclip,
  Mic,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Search,
  Info,
  ArrowUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

export function ChatInterface({
  conversationId,
  messages,
  onSendMessage,
  onTyping,
  isTyping,
  typingUsers,
  onLoadMoreMessages,
  hasMoreMessages,
  isLoading
}: ChatInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const [showCollaborationForm, setShowCollaborationForm] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (messageText.length > 0) {
        onTyping(true);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      onTyping(false);
    };
  }, [messageText, onTyping]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    try {
      setIsSending(true);

      let attachment: MessageAttachment | undefined;
      if (selectedFile) {
        // In a real implementation, you would upload the file first
        attachment = {
          url: URL.createObjectURL(selectedFile),
          type: selectedFile.type,
          name: selectedFile.name,
          size: selectedFile.size
        };
      }

      await onSendMessage(messageText, selectedFile ? 'file' : 'text', attachment);

      setMessageText('');
      setSelectedFile(null);
      onTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowFileUpload(false);
  };

  const handleCollaborationSubmit = async (request: any) => {
    try {
      setIsSending(true);
      await onSendMessage(JSON.stringify(request), 'collaboration');
      setShowCollaborationForm(false);
    } catch (error) {
      console.error('Failed to send collaboration request:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getParticipantName = (message: any) => {
    return message.sender?.display_name || 'Unknown User';
  };

  return (
    <div className="chat-interface glass rounded-2xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-red to-accent-pink flex items-center justify-center text-white font-semibold">
            U
          </div>
          <div>
            <h3 className="font-semibold text-white">Chat</h3>
            <p className="text-sm text-gray-400">
              {typingUsers.length > 0 ? (
                <span className="text-accent-pink">
                  {typingUsers.length === 1 ? 'is typing' : 'are typing'}...
                </span>
              ) : (
                'Online'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Search size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Phone size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Video size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="text-center">
            <button
              onClick={onLoadMoreMessages}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </div>
              ) : (
                'Load more messages'
              )}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender_id === 'current-user-id'} // Replace with actual user ID
            onDeleteMessage={() => { }} // Implement delete functionality
            onReplyToMessage={() => { }} // Implement reply functionality
          />
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-accent-pink rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-accent-pink rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-accent-pink rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1 ? 'is typing' : 'are typing'}...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Collaboration Form */}
      {showCollaborationForm && (
        <div className="p-4 border-t border-white/10">
          <CollaborationForm
            recipientId="recipient-id"
            recipientName="Recipient Name"
            onSubmit={handleCollaborationSubmit}
            isLoading={isSending}
          />
        </div>
      )}

      {/* File Upload */}
      {showFileUpload && (
        <div className="p-4 border-t border-white/10">
          <FileUpload
            onFileSelect={handleFileSelect}
            acceptedTypes={['audio/*', 'image/*', 'application/pdf']}
            maxSize={10 * 1024 * 1024} // 10MB
            isLoading={isSending}
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-pink/20 rounded-lg flex items-center justify-center">
                📎
              </div>
              <div>
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <AlertCircle size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-end gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={() => setShowCollaborationForm(!showCollaborationForm)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Send size={16} />
            </button>
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10'
                }`}
            >
              <Mic size={16} />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Smile size={16} />
            </button>
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-accent-pink transition-colors resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px'
              }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && !selectedFile) || isSending}
            className={`p-3 rounded-lg transition-colors ${(messageText.trim() || selectedFile) && !isSending
                ? 'bg-gradient-to-r from-primary-red to-accent-pink text-white hover:opacity-90'
                : 'bg-white/10 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUp size={16} />
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(file);
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
} 