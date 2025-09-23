'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  MessageCircle,
  Mail,
  Twitter,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Check,
  User,
  Users,
  Globe
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSocial } from '@/src/hooks/useSocial';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    title: string;
    type: 'track' | 'event';
    creator?: {
      name: string;
      username: string;
    };
    coverArt?: string;
    url?: string;
  };
}

interface Contact {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface ShareOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

export default function ShareModal({ isOpen, onClose, content }: ShareModalProps) {
  const { user } = useAuth();
  const { createShare } = useSocial();
  const [activeTab, setActiveTab] = useState<'contacts' | 'platforms' | 'link'>('contacts');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Mock contacts - in a real app, this would come from the user's contacts/following
  const mockContacts: Contact[] = [
    { id: '1', name: 'John Doe', username: '@john_doe', isOnline: true },
    { id: '2', name: 'Sarah Smith', username: '@sarah_smith', isOnline: false },
    { id: '3', name: 'Mike Johnson', username: '@mike_j', isOnline: true },
    { id: '4', name: 'Emma Wilson', username: '@emma_w', isOnline: true },
    { id: '5', name: 'David Brown', username: '@david_b', isOnline: false },
    { id: '6', name: 'Lisa Chen', username: '@lisa_chen', isOnline: true },
    { id: '7', name: 'Alex Rodriguez', username: '@alex_rod', isOnline: false },
    { id: '8', name: 'Maria Garcia', username: '@maria_g', isOnline: true },
    { id: '9', name: 'James Wilson', username: '@james_w', isOnline: true },
    { id: '10', name: 'Sophie Turner', username: '@sophie_t', isOnline: false },
    { id: '11', name: 'Chris Evans', username: '@chris_e', isOnline: true },
    { id: '12', name: 'Taylor Swift', username: '@taylor_s', isOnline: true },
    { id: '13', name: 'Adele', username: '@adele', isOnline: true },
    { id: '14', name: 'Drake', username: '@drake', isOnline: false },
    { id: '15', name: 'Beyoncé', username: '@beyonce', isOnline: true },
    { id: '16', name: 'Ed Sheeran', username: '@edsheeran', isOnline: false },
    { id: '17', name: 'Rihanna', username: '@rihanna', isOnline: true },
    { id: '18', name: 'Justin Bieber', username: '@justinbieber', isOnline: true },
    { id: '19', name: 'Lady Gaga', username: '@ladygaga', isOnline: false },
    { id: '20', name: 'Bruno Mars', username: '@brunomars', isOnline: true },
  ];

  const generateShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${content.type}/${content.id}`;
  };

  const generateShareText = () => {
    const creatorName = content.creator?.name || 'Unknown Artist';
    return `Check out "${content.title}" by ${creatorName} on SoundBridge! 🎵`;
  };

  const handleShareToContacts = async () => {
    if (selectedContacts.length === 0) return;

    setIsSharing(true);
    try {
      // Share to each selected contact
      for (const contactId of selectedContacts) {
        await createShare({
          content_id: content.id,
          content_type: content.type,
          share_type: 'repost',
          caption: shareMessage || generateShareText(),
          external_platform: 'direct_message',
          external_url: `user:${contactId}`
        });
      }
      
      // Show success message
      alert(`Shared with ${selectedContacts.length} contact(s)!`);
      onClose();
    } catch (error) {
      console.error('Error sharing to contacts:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExternalShare = async (platform: string) => {
    try {
      const shareUrl = generateShareUrl();
      const shareText = generateShareText();
      
      let shareLink = '';
      let shouldOpenNewWindow = true;
      let deepLink = '';
      
      switch (platform) {
        case 'twitter':
          shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
          break;
        case 'facebook':
          // Use Facebook Share Dialog API
          if (window.FB) {
            window.FB.ui({
              method: 'share',
              href: shareUrl,
              quote: shareText,
            }, function(response) {
              console.log('Facebook share response:', response);
            });
          } else {
            // Fallback to web sharing
            shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
          }
          break;
        case 'linkedin':
          shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
          break;
        case 'whatsapp':
          shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
          deepLink = `whatsapp://send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
          // Try deep link first, fallback to web
          tryDeepLink(deepLink, shareLink, 'WhatsApp');
          return;
        case 'telegram':
          shareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
          deepLink = `tg://msg?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
          // Try deep link first, fallback to web
          tryDeepLink(deepLink, shareLink, 'Telegram');
          return;
        case 'email':
          shareLink = `mailto:?subject=${encodeURIComponent('Check out this track on SoundBridge')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
          shouldOpenNewWindow = false; // Email opens in default mail client
          break;
        case 'youtube':
          // Use YouTube Data API for sharing
          try {
            // Check if user is logged into YouTube
            if (window.gapi && window.gapi.auth2) {
              const auth2 = window.gapi.auth2.getAuthInstance();
              if (auth2.isSignedIn.get()) {
                // User is signed in, can use YouTube API
                console.log('YouTube API available, user signed in');
                // For now, fallback to clipboard with better messaging
                await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
                alert('Share text copied! You can now paste it in YouTube Studio or create a YouTube Short. For direct sharing, you\'ll need to connect your YouTube account in settings.');
              } else {
                // User not signed in, prompt to sign in
                alert('To share directly to YouTube, please sign in to your YouTube account first. For now, the share text has been copied to your clipboard.');
                await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
              }
            } else {
              // YouTube API not loaded, fallback to clipboard
              await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
              alert('Share text copied! You can paste this in YouTube Studio or create a YouTube Short. To enable direct sharing, we\'ll need to integrate the YouTube API.');
            }
          } catch (error) {
            console.error('YouTube sharing error:', error);
            // Fallback to clipboard
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            alert('Share text copied to clipboard! You can paste this in YouTube Studio or create a YouTube Short.');
          }
          return;
        case 'instagram':
          // Instagram doesn't have a public sharing API, but we can provide better UX
          try {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            alert('Share text copied! You can now paste this in Instagram Stories, Reels, or posts. Instagram doesn\'t allow direct web sharing, but you can easily paste the copied text.');
          } catch (error) {
            console.error('Error copying to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = `${shareText}\n\n${shareUrl}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Share text copied! You can paste this in Instagram Stories, Reels, or posts.');
          }
          return;
        case 'discord':
          shareLink = `https://discord.com/channels/@me?content=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
          break;
        case 'reddit':
          shareLink = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
          break;
        case 'pinterest':
          shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}`;
          break;
        case 'tiktok':
          // TikTok doesn't have a public sharing API
          try {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            alert('Share text copied! You can paste this in TikTok when creating a video. TikTok doesn\'t allow direct web sharing, but you can easily paste the copied text.');
          } catch (error) {
            console.error('Error copying to clipboard:', error);
            const textArea = document.createElement('textarea');
            textArea.value = `${shareText}\n\n${shareUrl}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Share text copied! You can paste this in TikTok when creating a video.');
          }
          return;
        case 'snapchat':
          // Snapchat doesn't have a public sharing API
          try {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            alert('Share text copied! You can paste this in Snapchat when creating a snap. Snapchat doesn\'t allow direct web sharing, but you can easily paste the copied text.');
          } catch (error) {
            console.error('Error copying to clipboard:', error);
            const textArea = document.createElement('textarea');
            textArea.value = `${shareText}\n\n${shareUrl}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Share text copied! You can paste this in Snapchat when creating a snap.');
          }
          return;
        default:
          break;
      }
      
      if (shareLink) {
        if (shouldOpenNewWindow) {
          // Open in a popup window for better UX
          const popup = window.open(shareLink, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
          
          // Focus the popup if it was blocked
          if (popup) {
            popup.focus();
          } else {
            // If popup was blocked, open in new tab
            window.open(shareLink, '_blank');
          }
        } else {
          // For email, just open the link (will open default mail client)
          window.location.href = shareLink;
        }
      }
      
      // Also save to our database
      try {
        await createShare({
          content_id: content.id,
          content_type: content.type,
          share_type: 'external_share',
          caption: shareText,
          external_platform: platform,
          external_url: shareUrl
        });
      } catch (error) {
        console.error('Error saving external share:', error);
      }
    } catch (error) {
      console.error('Error in handleExternalShare:', error);
      // Fallback - just copy the link
      try {
        const shareUrl = generateShareUrl();
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        alert('Failed to share. Please try again.');
      }
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = generateShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  // Helper function to try deep link and fallback to web
  const tryDeepLink = (deepLink: string, webLink: string, platformName: string) => {
    try {
      // Try to open the deep link
      const link = document.createElement('a');
      link.href = deepLink;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Set a timeout to detect if the app opened
      const timeout = setTimeout(() => {
        try {
          // App didn't open, fallback to web
          window.open(webLink, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
        } catch (fallbackError) {
          console.error('Error opening web fallback:', fallbackError);
          // Final fallback - just copy the link
          navigator.clipboard.writeText(webLink).catch(() => {
            console.error('Failed to copy link to clipboard');
          });
        }
      }, 2000);
      
      // Try to open the deep link
      try {
        link.click();
      } catch (error) {
        console.log(`${platformName} app not installed, falling back to web`);
      }
      
      // Clean up
      try {
        document.body.removeChild(link);
        clearTimeout(timeout);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    } catch (error) {
      console.error(`Error in tryDeepLink for ${platformName}:`, error);
      // Fallback to web version
      try {
        window.open(webLink, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
      } catch (fallbackError) {
        console.error('Error opening web fallback:', fallbackError);
      }
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: content.title,
            text: generateShareText(),
            url: generateShareUrl(),
          });
          
          // Save to our database
          try {
            await createShare({
              content_id: content.id,
              content_type: content.type,
              share_type: 'external_share',
              caption: generateShareText(),
              external_platform: 'native_share',
              external_url: generateShareUrl()
            });
          } catch (dbError) {
            console.error('Error saving native share to database:', dbError);
          }
        } catch (shareError) {
          console.error('Error with native share:', shareError);
          // Fallback to copy link
          handleCopyLink();
        }
      } else {
        // Fallback to copy link
        handleCopyLink();
      }
    } catch (error) {
      console.error('Error in handleNativeShare:', error);
      // Final fallback
      handleCopyLink();
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Filter contacts based on search
  const filteredContacts = mockContacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.username.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const shareOptions: ShareOption[] = [
    {
      id: 'native',
      name: 'Share',
      icon: <Share2 size={20} />,
      color: '#3B82F6',
      action: handleNativeShare
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <Twitter size={20} />,
      color: '#1DA1F2',
      action: () => handleExternalShare('twitter')
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook size={20} />,
      color: '#1877F2',
      action: () => handleExternalShare('facebook')
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram size={20} />,
      color: '#E4405F',
      action: () => handleExternalShare('instagram')
    },
    {
      id: 'copy',
      name: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? <Check size={20} /> : <Copy size={20} />,
      color: copied ? '#10B981' : '#6B7280',
      action: handleCopyLink
    }
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .share-modal-scroll::-webkit-scrollbar {
            width: 16px;
          }
          .share-modal-scroll::-webkit-scrollbar-track {
            background: #374151;
            border-radius: 8px;
            border: 2px solid #4B5563;
          }
          .share-modal-scroll::-webkit-scrollbar-thumb {
            background: #D1D5DB;
            border-radius: 8px;
            border: 3px solid #374151;
            min-height: 50px;
          }
          .share-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #F3F4F6;
          }
          .share-modal-scroll::-webkit-scrollbar-corner {
            background: #374151;
          }
          .share-modal-scroll {
            scrollbar-width: auto;
            scrollbar-color: #D1D5DB #374151;
          }
        `
      }} />
                 <div style={{
           backgroundColor: '#1F2937',
           borderRadius: '20px',
           maxWidth: '500px',
           width: '100%',
           maxHeight: '90vh',
           overflow: 'hidden',
           border: '1px solid rgba(255, 255, 255, 0.1)',
           display: 'flex',
           flexDirection: 'column',
           position: 'relative'
         }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
            Share {content.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Preview */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {content.coverArt && (
              <img
                src={content.coverArt}
                alt={content.title}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                {content.title}
              </h3>
              <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
                by {content.creator?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>
        </div>

                 {/* Quick Share Options */}
         <div style={{
           padding: '1rem',
           borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
           flexShrink: 0
         }}>
           <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>
             Quick Share
           </h3>
           <div 
             className="share-modal-scroll"
             style={{
               display: 'grid',
               gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
               gap: '1rem',
               maxHeight: '120px',
               overflow: 'auto',
               scrollbarWidth: 'auto',
               scrollbarColor: '#D1D5DB #374151',
               paddingRight: '0.5rem'
             }}
           >
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={option.action}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div style={{ color: option.color }}>
                  {option.icon}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                  {option.name}
                </span>
              </button>
            ))}
          </div>
        </div>

                 {/* Tabs */}
         <div style={{
           display: 'flex',
           borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
           position: 'relative'
         }}>
           {[
             { id: 'contacts', name: 'Contacts', icon: <Users size={16} /> },
             { id: 'platforms', name: 'Platforms', icon: <Globe size={16} /> },
             { id: 'link', name: 'Link', icon: <LinkIcon size={16} /> }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => {
                 setActiveTab(tab.id as any);
                 setIsTabsExpanded(true);
               }}
               style={{
                 flex: 1,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 gap: '0.5rem',
                 padding: '1rem',
                 background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                 border: 'none',
                 color: activeTab === tab.id ? '#3B82F6' : '#9CA3AF',
                 cursor: 'pointer',
                 fontSize: '0.875rem',
                 fontWeight: '500'
               }}
             >
               {tab.icon}
               {tab.name}
             </button>
           ))}
           
           {/* Expand/Collapse Button */}
           <button
             onClick={() => setIsTabsExpanded(!isTabsExpanded)}
             style={{
               position: 'absolute',
               right: '0.5rem',
               top: '50%',
               transform: 'translateY(-50%)',
               background: 'rgba(255, 255, 255, 0.1)',
               border: 'none',
               borderRadius: '50%',
               width: '24px',
               height: '24px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               cursor: 'pointer',
               color: '#9CA3AF',
               fontSize: '12px'
             }}
           >
             {isTabsExpanded ? '−' : '+'}
           </button>
         </div>

                          {/* Tab Content */}
         <div 
           className="share-modal-scroll"
           style={{ 
             position: 'absolute',
             top: isTabsExpanded ? '0' : '100%',
             left: 0,
             right: 0,
             bottom: 0,
             background: '#1F2937',
             zIndex: 10,
             transition: 'top 0.3s ease',
             overflow: 'auto',
             scrollbarWidth: 'auto',
             scrollbarColor: '#D1D5DB #374151',
             display: 'flex',
             flexDirection: 'column'
           }}
         >
           {/* Expandable Header */}
           <div style={{
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             padding: '1rem 1.5rem',
             borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
             background: '#1F2937'
           }}>
             <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
               {activeTab === 'contacts' && 'Share with Contacts'}
               {activeTab === 'platforms' && 'Share on Platforms'}
               {activeTab === 'link' && 'Copy Share Link'}
             </h3>
             <button
               onClick={() => setIsTabsExpanded(false)}
               style={{
                 background: 'none',
                 border: 'none',
                 color: '#9CA3AF',
                 cursor: 'pointer',
                 padding: '0.5rem',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center'
               }}
             >
               <X size={16} />
             </button>
           </div>
           
           {activeTab === 'contacts' && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message (optional)"
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                />
              </div>
              
                             <div style={{ marginBottom: '1rem' }}>
                 <h4 style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600', margin: '0 0 0.75rem 0' }}>
                   Select Contacts
                 </h4>
                 
                 {/* Search Input */}
                 <div style={{ marginBottom: '0.75rem' }}>
                   <input
                     type="text"
                     value={contactSearch}
                     onChange={(e) => setContactSearch(e.target.value)}
                     placeholder="Search contacts..."
                     style={{
                       width: '100%',
                       padding: '0.5rem 0.75rem',
                       background: 'rgba(255, 255, 255, 0.05)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       borderRadius: '6px',
                       color: 'white',
                       fontSize: '0.875rem',
                       outline: 'none'
                     }}
                     onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                     onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                   />
                 </div>
                 
                 <div 
                   className="share-modal-scroll"
                   style={{ 
                     display: 'flex', 
                     flexDirection: 'column', 
                     gap: '0.5rem',
                     maxHeight: '100px',
                     overflow: 'auto',
                     scrollbarWidth: 'auto',
                     scrollbarColor: '#D1D5DB #374151'
                   }}
                 >
                                                        {filteredContacts.length > 0 ? (
                     filteredContacts.map((contact) => (
                       <button
                         key={contact.id}
                         onClick={() => toggleContact(contact.id)}
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.75rem',
                           padding: '0.75rem',
                           background: selectedContacts.includes(contact.id) 
                             ? 'rgba(59, 130, 246, 0.1)' 
                             : 'rgba(255, 255, 255, 0.05)',
                           border: '1px solid',
                           borderColor: selectedContacts.includes(contact.id) 
                             ? '#3B82F6' 
                             : 'rgba(255, 255, 255, 0.1)',
                           borderRadius: '8px',
                           color: 'white',
                           cursor: 'pointer',
                           width: '100%',
                           textAlign: 'left',
                           minHeight: '60px'
                         }}
                       >
                         <div style={{
                           width: '32px',
                           height: '32px',
                           borderRadius: '50%',
                           background: 'linear-gradient(45deg, #3B82F6, #8B5CF6)',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '0.75rem',
                           fontWeight: '600',
                           flexShrink: 0
                         }}>
                           {contact.name.charAt(0)}
                         </div>
                         <div style={{ flex: 1 }}>
                           <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                             {contact.name}
                           </div>
                           <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                             {contact.username}
                           </div>
                         </div>
                         <div style={{
                           width: '8px',
                           height: '8px',
                           borderRadius: '50%',
                           background: contact.isOnline ? '#10B981' : '#6B7280',
                           flexShrink: 0
                         }} />
                       </button>
                     ))
                   ) : (
                     <div style={{
                       textAlign: 'center',
                       padding: '1rem',
                       color: '#9CA3AF',
                       fontSize: '0.875rem'
                     }}>
                       {contactSearch ? 'No contacts found matching your search' : 'No contacts available'}
                     </div>
                   )}
                </div>
              </div>
              
              <button
                onClick={handleShareToContacts}
                disabled={selectedContacts.length === 0 || isSharing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: selectedContacts.length > 0 ? '#3B82F6' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: selectedContacts.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedContacts.length > 0 ? 1 : 0.5
                }}
              >
                {isSharing ? 'Sharing...' : `Share with ${selectedContacts.length} contact(s)`}
              </button>
            </div>
          )}

          {activeTab === 'platforms' && (
            <div style={{ padding: '1.5rem' }}>
              <div 
                className="share-modal-scroll"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#6B7280 #374151'
                }}
              >
                                 {[
                   { name: 'Twitter', icon: <Twitter size={20} />, color: '#1DA1F2', action: () => handleExternalShare('twitter'), hasDeepLink: false, hasAPI: false },
                   { name: 'Facebook', icon: <Facebook size={20} />, color: '#1877F2', action: () => handleExternalShare('facebook'), hasDeepLink: false, hasAPI: true },
                   { name: 'Instagram', icon: <Instagram size={20} />, color: '#E4405F', action: () => handleExternalShare('instagram'), hasDeepLink: false, hasAPI: false },
                   { name: 'LinkedIn', icon: <LinkIcon size={20} />, color: '#0077B5', action: () => handleExternalShare('linkedin'), hasDeepLink: false, hasAPI: false },
                   { name: 'WhatsApp', icon: <MessageCircle size={20} />, color: '#25D366', action: () => handleExternalShare('whatsapp'), hasDeepLink: true, hasAPI: false },
                   { name: 'Telegram', icon: <MessageCircle size={20} />, color: '#0088CC', action: () => handleExternalShare('telegram'), hasDeepLink: true, hasAPI: false },
                   { name: 'Email', icon: <Mail size={20} />, color: '#EA4335', action: () => handleExternalShare('email'), hasDeepLink: false, hasAPI: false },
                   { name: 'Discord', icon: <MessageCircle size={20} />, color: '#5865F2', action: () => handleExternalShare('discord'), hasDeepLink: false, hasAPI: false },
                   { name: 'Reddit', icon: <Globe size={20} />, color: '#FF4500', action: () => handleExternalShare('reddit'), hasDeepLink: false, hasAPI: false },
                   { name: 'Pinterest', icon: <Globe size={20} />, color: '#E60023', action: () => handleExternalShare('pinterest'), hasDeepLink: false, hasAPI: false },
                   { name: 'TikTok', icon: <Globe size={20} />, color: '#000000', action: () => handleExternalShare('tiktok'), hasDeepLink: false, hasAPI: false },
                   { name: 'YouTube', icon: <Globe size={20} />, color: '#FF0000', action: () => handleExternalShare('youtube'), hasDeepLink: false, hasAPI: true },
                   { name: 'Snapchat', icon: <Globe size={20} />, color: '#FFFC00', action: () => handleExternalShare('snapchat'), hasDeepLink: false, hasAPI: false },
                   { name: 'Copy Link', icon: <Copy size={20} />, color: '#6B7280', action: handleCopyLink, hasDeepLink: false, hasAPI: false }
                 ].map((platform) => (
                  <button
                    key={platform.name}
                    onClick={platform.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      minHeight: '60px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <div style={{ color: platform.color, flexShrink: 0 }}>
                      {platform.icon}
                    </div>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                       <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                         Share on {platform.name}
                       </span>
                                               {platform.hasDeepLink && (
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#10B981',
                            flexShrink: 0
                          }} title="Opens mobile app if installed" />
                        )}
                        {platform.hasAPI && (
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#3B82F6',
                            flexShrink: 0,
                            marginLeft: '4px'
                          }} title="Uses official API" />
                        )}
                     </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'link' && (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Share Link
                </label>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    value={generateShareUrl()}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    style={{
                      padding: '0.75rem',
                      background: copied ? '#10B981' : '#3B82F6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              
              <div style={{
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#3B82F6', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  💡 Tip
                </div>
                <div style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                  Anyone with this link can view and listen to this track. The link will work even if they don't have a SoundBridge account.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
