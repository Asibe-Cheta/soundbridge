import { createBrowserClient } from './supabase';
import {
  Comment,
  Like,
  Share,
  Bookmark,
  Playlist,
  PlaylistTrack,
  Collaboration,
  CollaborationTrack,
  Notification,
  UserFeed,
  SocialAnalytics,
  CreateCommentRequest,
  CreateLikeRequest,
  CreateShareRequest,
  CreateBookmarkRequest,
  CreatePlaylistRequest,
  AddTrackToPlaylistRequest,
  CreateCollaborationRequest,
  UpdateCollaborationRequest,
  CommentFilters,
  PlaylistFilters,
  CollaborationFilters,
  SocialStats,
  FeedItem,
  FeedFilters
} from './types/social';

export class SocialService {
  private static instance: SocialService;
  private supabase = createBrowserClient();

  private constructor() {}

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  // ===== COMMENTS =====
  async createComment(userId: string, request: CreateCommentRequest): Promise<{ data: Comment | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('comments')
        .insert({
          user_id: userId,
          content_id: request.content_id,
          content_type: request.content_type,
          content: request.content,
          parent_comment_id: request.parent_comment_id
        })
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Create notification for content creator
      await this.createNotification({
        user_id: data.content_id, // This will be updated to get the actual creator_id
        type: 'comment',
        title: 'New Comment',
        message: `Someone commented on your ${request.content_type}`,
        related_id: data.id,
        related_type: 'comment'
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating comment:', error);
      return { data: null, error };
    }
  }

  async getComments(filters: CommentFilters): Promise<{ data: Comment[] | null; error: any }> {
    try {
      let query = this.supabase
        .from('comments')
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.content_id) {
        query = query.eq('content_id', filters.content_id);
      }
      if (filters.content_type) {
        query = query.eq('content_type', filters.content_type);
      }
      if (filters.parent_comment_id) {
        query = query.eq('parent_comment_id', filters.parent_comment_id);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await this.getComments({
            parent_comment_id: comment.id,
            limit: 10
          });
          return { ...comment, replies: replies || [] };
        })
      );

      return { data: commentsWithReplies, error: null };
    } catch (error) {
      console.error('Error getting comments:', error);
      return { data: null, error };
    }
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<{ data: Comment | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('comments')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select(`
          *,
          user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating comment:', error);
      return { data: null, error };
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { error };
    }
  }

  // ===== LIKES =====
  async toggleLike(userId: string, request: CreateLikeRequest): Promise<{ data: Like | null; error: any }> {
    try {
      // Check if already liked
      const { data: existingLike, error: existingError } = await this.supabase
        .from('likes')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', request.content_id)
        .eq('content_type', request.content_type)
        .maybeSingle();

      // Handle the case where no like exists (PGRST116 error)
      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existingLike) {
        // Unlike
        const { error } = await this.supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;
        return { data: null, error: null };
      } else {
        // Like
        const { data, error } = await this.supabase
          .from('likes')
          .insert({
            user_id: userId,
            content_id: request.content_id,
            content_type: request.content_type
          })
          .select(`
            *,
            user:profiles!likes_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .single();

        if (error) throw error;

        // Get the content creator's ID for notification
        let creatorId: string | null = null;
        
        if (request.content_type === 'track') {
          const { data: track, error: trackError } = await this.supabase
            .from('audio_tracks')
            .select('creator_id')
            .eq('id', request.content_id)
            .single();
          
          if (trackError) {
            console.error('❌ Error fetching track creator:', trackError);
          } else {
            creatorId = track?.creator_id || null;
            console.log('📝 Track creator ID:', creatorId);
          }
        } else if (request.content_type === 'event') {
          const { data: event, error: eventError } = await this.supabase
            .from('events')
            .select('creator_id')
            .eq('id', request.content_id)
            .single();
          
          if (eventError) {
            console.error('❌ Error fetching event creator:', eventError);
          } else {
            creatorId = event?.creator_id || null;
            console.log('📝 Event creator ID:', creatorId);
          }
        }

        // Create notification for content creator (if creator is different from liker)
        if (creatorId && creatorId !== userId) {
          try {
            console.log('🔔 Creating notification for creator:', creatorId);
            
            // Check if the creator exists in the profiles table
            const { data: creatorProfile, error: profileError } = await this.supabase
              .from('profiles')
              .select('id')
              .eq('id', creatorId)
              .single();
            
            if (profileError) {
              console.error('❌ Error checking creator profile:', profileError);
              console.log('ℹ️ Skipping notification creation due to profile error');
            } else if (!creatorProfile) {
              console.error('❌ Creator profile not found for ID:', creatorId);
              console.log('ℹ️ Skipping notification creation due to missing profile');
            } else {
              console.log('✅ Creator profile found, creating notification');
              const notificationResult = await this.createNotification({
                user_id: creatorId,
                type: 'like',
                title: 'New Like',
                message: `Someone liked your ${request.content_type}`,
                related_id: data.id,
                related_type: 'like'
              });
              
              if (notificationResult.error) {
                console.error('❌ Notification creation failed:', notificationResult.error);
                console.log('ℹ️ Continuing with like operation despite notification failure');
              } else {
                console.log('✅ Notification created successfully');
              }
            }
          } catch (notificationError) {
            console.error('❌ Error creating notification:', notificationError);
            console.log('ℹ️ Continuing with like operation despite notification failure');
          }
        } else {
          console.log('ℹ️ No notification needed (same user or no creator found)');
        }

        return { data, error: null };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { data: null, error };
    }
  }

  async getLikes(contentId: string, contentType: 'track' | 'event' | 'comment'): Promise<{ data: Like[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('likes')
        .select(`
          *,
          user:profiles!likes_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting likes:', error);
      return { data: null, error };
    }
  }

  async isLiked(userId: string, contentId: string, contentType: 'track' | 'event' | 'comment'): Promise<{ data: boolean; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .maybeSingle();

      // PGRST116 means no rows found, which is expected when user hasn't liked the content
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking if liked:', error);
        return { data: false, error };
      }
      
      return { data: !!data, error: null };
    } catch (error) {
      console.error('Error checking if liked:', error);
      return { data: false, error };
    }
  }

  // ===== SHARES =====
  async createShare(userId: string, request: CreateShareRequest): Promise<{ data: Share | null; error: any }> {
    try {
      console.log('🔍 Creating share with:', { userId, request });
      
      const { data, error } = await this.supabase
        .from('shares')
        .insert({
          user_id: userId,
          content_id: request.content_id,
          content_type: request.content_type,
          share_type: request.share_type,
          external_platform: request.external_platform,
          external_url: request.external_url,
          caption: request.caption
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error inserting share:', error);
        throw error;
      }

      console.log('✅ Share created successfully:', data);

      // Get the content creator's ID for notification
      let creatorId: string | null = null;
      
      if (request.content_type === 'track') {
        const { data: track, error: trackError } = await this.supabase
          .from('audio_tracks')
          .select('creator_id')
          .eq('id', request.content_id)
          .single();
        
        if (trackError) {
          console.error('❌ Error fetching track creator:', trackError);
        } else {
          creatorId = track?.creator_id || null;
          console.log('📝 Track creator ID:', creatorId);
        }
      } else if (request.content_type === 'event') {
        const { data: event, error: eventError } = await this.supabase
          .from('events')
          .select('creator_id')
          .eq('id', request.content_id)
          .single();
        
        if (eventError) {
          console.error('❌ Error fetching event creator:', eventError);
        } else {
          creatorId = event?.creator_id || null;
          console.log('📝 Event creator ID:', creatorId);
        }
      }

      // Create notification for content creator (if it's a repost and creator is different from sharer)
      if (request.share_type === 'repost' && creatorId && creatorId !== userId) {
        try {
          console.log('🔔 Creating notification for creator:', creatorId);
          
          // Check if the creator exists in the profiles table
          const { data: creatorProfile, error: profileError } = await this.supabase
            .from('profiles')
            .select('id')
            .eq('id', creatorId)
            .single();
          
          if (profileError) {
            console.error('❌ Error checking creator profile:', profileError);
            console.log('ℹ️ Skipping notification creation due to profile error');
          } else if (!creatorProfile) {
            console.error('❌ Creator profile not found for ID:', creatorId);
            console.log('ℹ️ Skipping notification creation due to missing profile');
          } else {
            console.log('✅ Creator profile found, creating notification');
            await this.createNotification({
              user_id: creatorId,
              type: 'share',
              title: 'Your content was shared',
              message: `Someone shared your ${request.content_type}`,
              related_id: data.id,
              related_type: 'share'
            });
            console.log('✅ Notification created successfully');
          }
        } catch (notificationError) {
          console.error('❌ Error creating notification:', notificationError);
          // Don't fail the share if notification fails
        }
      } else {
        console.log('ℹ️ No notification needed (not a repost or same user)');
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error creating share:', error);
      return { data: null, error };
    }
  }

  async getShares(contentId: string, contentType: 'track' | 'event'): Promise<{ data: Share[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('shares')
        .select(`
          *,
          user:profiles!shares_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting shares:', error);
      return { data: null, error };
    }
  }

  async getUserShares(userId: string): Promise<{ data: Share[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('shares')
        .select(`
          *,
          user:profiles!shares_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting user shares:', error);
      return { data: null, error };
    }
  }

  // ===== BOOKMARKS =====
  async toggleBookmark(userId: string, request: CreateBookmarkRequest): Promise<{ data: Bookmark | null; error: any }> {
    try {
      // Check if already bookmarked
      const { data: existingBookmark } = await this.supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('content_id', request.content_id)
        .eq('content_type', request.content_type)
        .single();

      if (existingBookmark) {
        // Remove bookmark
        const { error } = await this.supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;
        return { data: null, error: null };
      } else {
        // Add bookmark
        const { data, error } = await this.supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            content_id: request.content_id,
            content_type: request.content_type
          })
          .select('*')
          .single();

        if (error) throw error;
        return { data, error: null };
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return { data: null, error };
    }
  }

  async getBookmarks(userId: string, contentType?: 'track' | 'event' | 'post'): Promise<{ data: Bookmark[] | null; error: any }> {
    try {
      let query = this.supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return { data: null, error };
    }
  }

  async isBookmarked(userId: string, contentId: string, contentType: 'track' | 'event' | 'post'): Promise<{ data: boolean; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { data: !!data, error: null };
    } catch (error) {
      console.error('Error checking if bookmarked:', error);
      return { data: false, error };
    }
  }

  // ===== PLAYLISTS =====
  async createPlaylist(userId: string, request: CreatePlaylistRequest): Promise<{ data: Playlist | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('playlists')
        .insert({
          creator_id: userId,
          name: request.name,
          description: request.description,
          is_public: request.is_public,
          cover_image_url: request.cover_image_url
        })
        .select(`
          *,
          creator:profiles!playlists_creator_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating playlist:', error);
      return { data: null, error };
    }
  }

  async getPlaylists(filters: PlaylistFilters): Promise<{ data: Playlist[] | null; error: any }> {
    try {
      let query = this.supabase
        .from('playlists')
        .select(`
          *,
          creator:profiles!playlists_creator_id_fkey(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.creator_id) {
        query = query.eq('creator_id', filters.creator_id);
      }
      if (filters.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting playlists:', error);
      return { data: null, error };
    }
  }

  async addTrackToPlaylist(playlistId: string, userId: string, request: AddTrackToPlaylistRequest): Promise<{ data: PlaylistTrack | null; error: any }> {
    try {
      // Check if user owns the playlist
      const { data: playlist } = await this.supabase
        .from('playlists')
        .select('creator_id')
        .eq('id', playlistId)
        .single();

      if (!playlist || playlist.creator_id !== userId) {
        throw new Error('Unauthorized to modify this playlist');
      }

      // Get next position
      const { data: lastTrack } = await this.supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const position = request.position || (lastTrack ? lastTrack.position + 1 : 1);

      const { data, error } = await this.supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: request.track_id,
          position
        })
        .select('*')
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      return { data: null, error };
    }
  }

  async removeTrackFromPlaylist(playlistId: string, userId: string, trackId: string): Promise<{ error: any }> {
    try {
      // Check if user owns the playlist
      const { data: playlist } = await this.supabase
        .from('playlists')
        .select('creator_id')
        .eq('id', playlistId)
        .single();

      if (!playlist || playlist.creator_id !== userId) {
        throw new Error('Unauthorized to modify this playlist');
      }

      const { error } = await this.supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      return { error };
    }
  }

  // ===== COLLABORATIONS =====
  async createCollaboration(userId: string, request: CreateCollaborationRequest): Promise<{ data: Collaboration | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('collaborations')
        .insert({
          initiator_id: userId,
          collaborator_id: request.collaborator_id,
          project_title: request.project_title,
          description: request.description,
          project_type: request.project_type,
          deadline: request.deadline,
          compensation_type: request.compensation_type,
          compensation_amount: request.compensation_amount,
          compensation_currency: request.compensation_currency || 'GBP',
          requirements: request.requirements
        })
        .select(`
          *,
          initiator:profiles!collaborations_initiator_id_fkey(id, username, display_name, avatar_url),
          collaborator:profiles!collaborations_collaborator_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Create notification for collaborator
      await this.createNotification({
        user_id: request.collaborator_id,
        type: 'collaboration',
        title: 'New Collaboration Request',
        message: `You have a new collaboration request: ${request.project_title}`,
        related_id: data.id,
        related_type: 'collaboration'
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating collaboration:', error);
      return { data: null, error };
    }
  }

  async getCollaborations(filters: CollaborationFilters): Promise<{ data: Collaboration[] | null; error: any }> {
    try {
      let query = this.supabase
        .from('collaborations')
        .select(`
          *,
          initiator:profiles!collaborations_initiator_id_fkey(id, username, display_name, avatar_url),
          collaborator:profiles!collaborations_collaborator_id_fkey(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.initiator_id) {
        query = query.eq('initiator_id', filters.initiator_id);
      }
      if (filters.collaborator_id) {
        query = query.eq('collaborator_id', filters.collaborator_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.project_type) {
        query = query.eq('project_type', filters.project_type);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting collaborations:', error);
      return { data: null, error };
    }
  }

  async updateCollaboration(collaborationId: string, userId: string, request: UpdateCollaborationRequest): Promise<{ data: Collaboration | null; error: any }> {
    try {
      // Check if user is involved in the collaboration
      const { data: collaboration } = await this.supabase
        .from('collaborations')
        .select('initiator_id, collaborator_id')
        .eq('id', collaborationId)
        .single();

      if (!collaboration || (collaboration.initiator_id !== userId && collaboration.collaborator_id !== userId)) {
        throw new Error('Unauthorized to update this collaboration');
      }

      const { data, error } = await this.supabase
        .from('collaborations')
        .update(request)
        .eq('id', collaborationId)
        .select(`
          *,
          initiator:profiles!collaborations_initiator_id_fkey(id, username, display_name, avatar_url),
          collaborator:profiles!collaborations_collaborator_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating collaboration:', error);
      return { data: null, error };
    }
  }

  // ===== NOTIFICATIONS =====
  async createNotification(notification: {
    user_id: string;
    type: 'follow' | 'like' | 'comment' | 'share' | 'collaboration' | 'event' | 'system';
    title: string;
    message: string;
    related_id?: string;
    related_type?: string;
  }): Promise<{ data: Notification | null; error: any }> {
    try {
      console.log('🔔 Creating notification with data:', notification);
      
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating notification:', error);
        throw error;
      }
      
      console.log('✅ Notification created successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return { data: null, error };
    }
  }

  async getNotifications(userId: string, limit = 20): Promise<{ data: Notification[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { data: null, error };
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { error };
    }
  }

  // ===== SHARES =====
  async shareContent(
    userId: string,
    contentId: string,
    contentType: 'track' | 'event',
    shareType: 'repost' | 'external_share' = 'repost',
    options?: {
      externalPlatform?: string;
      externalUrl?: string;
      caption?: string;
    }
  ): Promise<{ data: any; error: any }> {
    try {
      const shareData = {
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        share_type: shareType,
        external_platform: options?.externalPlatform || null,
        external_url: options?.externalUrl || null,
        caption: options?.caption || null,
      };

      const { data, error } = await this.supabase
        .from('shares')
        .insert(shareData)
        .select()
        .single();

      if (error) throw error;

      // Create notification for content creator
      if (shareType === 'repost') {
        await this.createNotification({
          user_id: userId, // This will be updated to content creator's ID
          type: 'share',
          title: 'Your content was shared',
          message: 'Someone shared your content',
          related_id: contentId,
          related_type: contentType,
        });
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error sharing content:', error);
      return { data: null, error };
    }
  }

  // ===== USER FEED =====
  async getUserFeed(userId: string, filters: FeedFilters = {}): Promise<{ data: FeedItem[] | null; error: any }> {
    try {
      let query = this.supabase
        .from('user_feed')
        .select(`
          *,
          source_user:profiles!user_feed_source_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters.content_types && filters.content_types.length > 0) {
        query = query.in('content_type', filters.content_types);
      }
      if (filters.before_date) {
        query = query.lt('created_at', filters.before_date);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get actual content for each feed item
      const feedItems = await Promise.all(
        data.map(async (item) => {
          let content = null;
          if (item.content_type === 'track') {
            const { data: track } = await this.supabase
              .from('audio_tracks')
              .select(`
                *,
                creator:profiles!audio_tracks_creator_id_fkey(id, username, display_name, avatar_url)
              `)
              .eq('id', item.content_id)
              .single();
            content = track;
          } else if (item.content_type === 'event') {
            const { data: event } = await this.supabase
              .from('events')
              .select(`
                *,
                creator:profiles!events_creator_id_fkey(id, username, display_name, avatar_url)
              `)
              .eq('id', item.content_id)
              .single();
            content = event;
          }

          return {
            id: item.id,
            type: item.content_type,
            content,
            source_user: item.source_user,
            created_at: item.created_at
          };
        })
      );

      return { data: feedItems, error: null };
    } catch (error) {
      console.error('Error getting user feed:', error);
      return { data: null, error };
    }
  }

  // ===== SOCIAL ANALYTICS =====
  async getSocialStats(userId: string): Promise<{ data: SocialStats | null; error: any }> {
    try {
      // Get user's profile stats
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('User not found');

      // Get total likes received
      const { data: likesReceived } = await this.supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .eq('content_id', userId)
        .in('content_type', ['track', 'event']);

      // Get total comments received
      const { data: commentsReceived } = await this.supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('content_id', userId)
        .in('content_type', ['track', 'event']);

      // Get total shares received
      const { data: sharesReceived } = await this.supabase
        .from('shares')
        .select('id', { count: 'exact' })
        .eq('content_id', userId)
        .in('content_type', ['track', 'event']);

      // Get total bookmarks received
      const { data: bookmarksReceived } = await this.supabase
        .from('bookmarks')
        .select('id', { count: 'exact' })
        .eq('content_id', userId)
        .in('content_type', ['track', 'event']);

      // Get total playlists
      const { data: playlistsCount } = await this.supabase
        .from('playlists')
        .select('id', { count: 'exact' })
        .eq('creator_id', userId);

      // Get total collaborations
      const { data: collaborationsCount } = await this.supabase
        .from('collaborations')
        .select('id', { count: 'exact' })
        .or(`initiator_id.eq.${userId},collaborator_id.eq.${userId}`);

      const totalLikes = likesReceived?.length || 0;
      const totalComments = commentsReceived?.length || 0;
      const totalShares = sharesReceived?.length || 0;
      const totalBookmarks = bookmarksReceived?.length || 0;
      const totalPlaylists = playlistsCount?.length || 0;
      const totalCollaborations = collaborationsCount?.length || 0;

      // Calculate engagement rate
      const totalEngagement = totalLikes + totalComments + totalShares + totalBookmarks;
      const engagementRate = profile.followers_count > 0 ? (totalEngagement / profile.followers_count) * 100 : 0;

      const stats: SocialStats = {
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        total_bookmarks: totalBookmarks,
        total_playlists: totalPlaylists,
        total_collaborations: totalCollaborations,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        followers_count: profile.followers_count,
        following_count: profile.following_count
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error getting social stats:', error);
      return { data: null, error };
    }
  }
}

export const socialService = SocialService.getInstance();
