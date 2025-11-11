import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Check if user is banned or inactive
 * Call this on app launch and before critical user actions
 */
export const checkUserStatus = async (userId?: string): Promise<boolean> => {
  try {
    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      currentUserId = user.id;
    }

    // Check user profile status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_active, banned_at, ban_reason, banned')
      .eq('id', currentUserId)
      .single();

    if (error) {
      console.error('Error checking user status:', error);
      return false;
    }

    // Check if user is banned
    if (profile?.banned || profile?.banned_at) {
      Alert.alert(
        'Account Suspended',
        profile.ban_reason || 'Your account has been suspended. Please contact support at contact@soundbridge.live for more information.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await supabase.auth.signOut();
            }
          }
        ]
      );
      return false;
    }

    // Check if user is inactive
    if (profile?.is_active === false) {
      Alert.alert(
        'Account Inactive',
        'Your account is currently inactive. Please contact support at contact@soundbridge.live to reactivate your account.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await supabase.auth.signOut();
            }
          }
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in checkUserStatus:', error);
    return false;
  }
};

/**
 * Update user's last login time
 * Call this on successful login
 */
export const updateLastLogin = async (userId: string) => {
  try {
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    console.log(`Ô£à Updated last login for user: ${userId}`);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

/**
 * Check if app is in maintenance mode
 * Call this on app launch
 */
export const checkMaintenanceMode = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('maintenance_mode')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error checking maintenance mode:', error);
      return false;
    }

    return data?.maintenance_mode || false;
  } catch (error) {
    console.error('Error in checkMaintenanceMode:', error);
    return false;
  }
};

/**
 * Check if user has admin or moderator role
 * Returns role if user has elevated permissions, null otherwise
 */
export const checkUserRole = async (userId: string): Promise<'admin' | 'super_admin' | 'moderator' | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as 'admin' | 'super_admin' | 'moderator';
  } catch (error) {
    return null;
  }
};

