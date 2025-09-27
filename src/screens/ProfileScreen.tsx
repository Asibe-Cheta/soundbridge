import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService, UserProfile, Track } from '../lib/api';
import { uploadService, ImageFileInfo } from '../lib/uploadService';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
  });

  // Stats state
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    tracks: 0,
    totalPlays: 0,
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const [profileResponse, tracksResponse] = await Promise.all([
        apiService.getProfile(user.id),
        apiService.getTracksByCreator(user.id)
      ]);

      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
        setEditForm({
          display_name: profileResponse.data.display_name || '',
          bio: profileResponse.data.bio || '',
          location: profileResponse.data.location || '',
          website: profileResponse.data.website || '',
        });
        
        setStats({
          followers: profileResponse.data.followers_count,
          following: profileResponse.data.following_count,
          tracks: 0, // Will get from tracks query
          totalPlays: profileResponse.data.total_plays || 0,
        });
      }

      if (tracksResponse.success && tracksResponse.data) {
        setUserTracks(tracksResponse.data);
        const totalPlays = tracksResponse.data.reduce((sum, track) => sum + track.play_count, 0);
        setStats(prev => ({ ...prev, totalPlays, tracks: tracksResponse.data.length }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const updateData = {
        display_name: editForm.display_name.trim(),
        bio: editForm.bio.trim() || null,
        location: editForm.location.trim() || null,
        website: editForm.website.trim() || null,
      };

      const response = await apiService.updateProfile(user.id, updateData);
      
      if (response.success && response.data) {
        setProfile(response.data);
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAvatar = async () => {
    try {
      Alert.alert(
        'Change Avatar',
        'Choose how you want to update your avatar',
        [
          { text: 'Camera', onPress: () => updateAvatar('camera') },
          { text: 'Gallery', onPress: () => updateAvatar('gallery') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error showing avatar options:', error);
    }
  };

  const updateAvatar = async (source: 'camera' | 'gallery') => {
    if (!user) return;

    try {
      setAvatarUploading(true);
      
      const file = await uploadService.pickImage(source);
      if (!file) return;

      // Validate file
      if (!uploadService.validateImageType(file.type)) {
        Alert.alert('Invalid File', 'Please select a valid image file');
        return;
      }

      if (!uploadService.validateFileSize(file.size, 5)) { // 5MB limit
        Alert.alert('File Too Large', 'Avatar images must be under 5MB');
        return;
      }

      // Upload avatar
      const uploadResult = await uploadService.uploadAvatar(file, user.id);
      
      if (!uploadResult.success) {
        Alert.alert('Upload Failed', 'Failed to upload avatar');
        return;
      }

      // Update profile with new avatar URL
      const updateResponse = await apiService.updateProfile(user.id, {
        avatar_url: uploadResult.url
      });

      if (updateResponse.success && updateResponse.data) {
        setProfile(updateResponse.data);
        Alert.alert('Success', 'Avatar updated successfully');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', error.message || 'Failed to update avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleChangeAvatar} disabled={avatarUploading}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={48} color="#666" />
                </View>
              )}
              
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>
            {profile?.display_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          
          {profile?.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          
          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {profile?.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color="#CCCCCC" />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats.tracks)}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats.followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats.following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats.totalPlays)}</Text>
            <Text style={styles.statLabel}>Total Plays</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Upload Track</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Share Profile</Text>
          </TouchableOpacity>
        </View>

        {/* My Tracks */}
        {userTracks.length > 0 && (
          <View style={styles.tracksSection}>
            <Text style={styles.sectionTitle}>My Tracks</Text>
            {userTracks.slice(0, 5).map((track) => (
              <View key={track.id} style={styles.trackItem}>
                <View style={styles.trackImageContainer}>
                  {track.cover_art_url ? (
                    <Image source={{ uri: track.cover_art_url }} style={styles.trackImage} />
                  ) : (
                    <View style={[styles.trackImage, styles.trackImagePlaceholder]}>
                      <Ionicons name="musical-notes" size={20} color="#666" />
                    </View>
                  )}
                </View>
                
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <View style={styles.trackStats}>
                    <Ionicons name="play" size={12} color="#666" />
                    <Text style={styles.trackStatText}>{formatNumber(track.play_count)}</Text>
                    <Ionicons name="heart" size={12} color="#666" style={{ marginLeft: 8 }} />
                    <Text style={styles.trackStatText}>{formatNumber(track.like_count)}</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.trackMenu}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
            
            {userTracks.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All Tracks</Text>
                <Ionicons name="arrow-forward" size={16} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Account Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-outline" size={24} color="#FFFFFF" />
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingItem, styles.signOutItem]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
            <Text style={[styles.settingText, styles.signOutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.display_name}
                onChangeText={(text) => setEditForm({ ...editForm, display_name: text })}
                placeholder="Your display name"
                placeholderTextColor="#666"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editForm.bio}
                onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                placeholder="Tell people about yourself..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.location}
                onChangeText={(text) => setEditForm({ ...editForm, location: text })}
                placeholder="Your location"
                placeholderTextColor="#666"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Website</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.website}
                onChangeText={(text) => setEditForm({ ...editForm, website: text })}
                placeholder="Your website URL"
                placeholderTextColor="#666"
                maxLength={100}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a2a',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#DC2626',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: '#CCCCCC',
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tracksSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  trackImageContainer: {
    marginRight: 12,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  trackImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  trackMenu: {
    padding: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  viewAllText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#FF6B6B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalCancelText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSaveText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});