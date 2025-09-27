import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { uploadService, AudioFileInfo, ImageFileInfo } from '../lib/uploadService';
import { apiService } from '../lib/api';

const { width } = Dimensions.get('window');

interface TrackFormData {
  title: string;
  description: string;
  genre: string;
  tags: string;
  isPublic: boolean;
}

export default function UploadScreen() {
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<TrackFormData>({
    title: '',
    description: '',
    genre: '',
    tags: '',
    isPublic: true,
  });
  
  // File state
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null);
  const [coverImage, setCoverImage] = useState<ImageFileInfo | null>(null);
  
  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState<'select' | 'details' | 'uploading' | 'success'>('select');

  // Genre options
  const genres = [
    'Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical',
    'Country', 'Folk', 'Reggae', 'Blues', 'Soul', 'Funk', 'House',
    'Techno', 'Dubstep', 'Trap', 'Lo-Fi', 'Indie', 'Alternative'
  ];

  const handleSelectAudio = async () => {
    try {
      const file = await uploadService.pickAudioFile();
      if (file) {
        // Validate file
        if (!uploadService.validateAudioType(file.type)) {
          Alert.alert('Invalid File', 'Please select a valid audio file (MP3, WAV, M4A, etc.)');
          return;
        }
        
        if (!uploadService.validateFileSize(file.size, 50)) { // 50MB limit
          Alert.alert('File Too Large', 'Audio files must be under 50MB');
          return;
        }
        
        setAudioFile(file);
        setStep('details');
        console.log('🎵 Audio file selected:', file.name);
      }
    } catch (error) {
      console.error('Error selecting audio:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  const handleSelectCover = async () => {
    try {
      Alert.alert(
        'Select Cover Image',
        'Choose how you want to add a cover image',
        [
          { text: 'Camera', onPress: () => selectCoverImage('camera') },
          { text: 'Gallery', onPress: () => selectCoverImage('gallery') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error showing cover options:', error);
    }
  };

  const selectCoverImage = async (source: 'camera' | 'gallery') => {
    try {
      const file = await uploadService.pickImage(source);
      if (file) {
        // Validate file
        if (!uploadService.validateImageType(file.type)) {
          Alert.alert('Invalid File', 'Please select a valid image file (JPG, PNG, WebP)');
          return;
        }
        
        if (!uploadService.validateFileSize(file.size, 10)) { // 10MB limit
          Alert.alert('File Too Large', 'Images must be under 10MB');
          return;
        }
        
        setCoverImage(file);
        console.log('🎨 Cover image selected:', file.name);
      }
    } catch (error) {
      console.error('Error selecting cover:', error);
      Alert.alert('Error', error.message || 'Failed to select image');
    }
  };

  const handleUpload = async () => {
    if (!audioFile || !user) {
      Alert.alert('Error', 'Please select an audio file and ensure you are logged in');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a track title');
      return;
    }

    setIsUploading(true);
    setStep('uploading');
    setUploadProgress(0);

    try {
      console.log('🚀 Starting upload process...');
      
      // Generate track ID
      const trackId = `track_${Date.now()}`;
      
      // Upload audio file
      setUploadProgress(25);
      const audioUploadResult = await uploadService.uploadAudioTrack(
        audioFile,
        user.id,
        trackId
      );

      if (!audioUploadResult.success) {
        throw new Error('Failed to upload audio file');
      }

      console.log('✅ Audio uploaded successfully');
      setUploadProgress(50);

      // Upload cover image if provided
      let coverUrl = null;
      if (coverImage) {
        const coverUploadResult = await uploadService.uploadTrackCover(
          coverImage,
          user.id,
          trackId
        );

        if (coverUploadResult.success) {
          coverUrl = coverUploadResult.url;
          console.log('✅ Cover image uploaded successfully');
        }
      }

      setUploadProgress(75);

      // Create track record in database
      const trackData = {
        id: trackId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        audio_url: audioUploadResult.url!,
        cover_image_url: coverUrl,
        genre: formData.genre || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        is_public: formData.isPublic,
        creator_id: user.id,
        duration: audioFile.duration || null,
        plays_count: 0,
        likes_count: 0,
      };

      // Save to database (this would be implemented in the API service)
      console.log('💾 Saving track to database:', trackData);
      
      setUploadProgress(100);
      setStep('success');
      
      console.log('🎉 Upload completed successfully!');

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setIsUploading(false);
      setStep('details');
      Alert.alert('Upload Failed', error.message || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      genre: '',
      tags: '',
      isPublic: true,
    });
    setAudioFile(null);
    setCoverImage(null);
    setStep('select');
    setUploadProgress(0);
  };

  const renderSelectStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="cloud-upload" size={64} color="#DC2626" />
        <Text style={styles.stepTitle}>Upload Your Track</Text>
        <Text style={styles.stepSubtitle}>
          Share your music with the SoundBridge community
        </Text>
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={handleSelectAudio}>
        <LinearGradient
          colors={['#DC2626', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
          <Text style={styles.uploadButtonText}>Select Audio File</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.supportedFormats}>
        <Text style={styles.supportedTitle}>Supported Formats:</Text>
        <Text style={styles.supportedText}>MP3, WAV, M4A, AAC, OGG, FLAC</Text>
        <Text style={styles.supportedText}>Maximum file size: 50MB</Text>
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={() => setStep('select')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Track Details</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Audio File Info */}
        <View style={styles.fileInfo}>
          <View style={styles.fileIconContainer}>
            <Ionicons name="musical-notes" size={24} color="#DC2626" />
          </View>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName}>{audioFile?.name}</Text>
            <Text style={styles.fileSize}>
              {audioFile ? uploadService.formatFileSize(audioFile.size) : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setAudioFile(null)}>
            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Cover Image */}
        <View style={styles.coverSection}>
          <Text style={styles.inputLabel}>Cover Image (Optional)</Text>
          {coverImage ? (
            <View style={styles.coverPreview}>
              <Image source={{ uri: coverImage.uri }} style={styles.coverImage} />
              <TouchableOpacity
                style={styles.removeCoverButton}
                onPress={() => setCoverImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.coverUploadArea} onPress={handleSelectCover}>
              <Ionicons name="camera" size={32} color="#666" />
              <Text style={styles.coverUploadText}>Add Cover Image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Track Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Track Title *</Text>
          <TextInput
            style={styles.textInput}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Enter track title"
            placeholderTextColor="#666"
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Tell people about your track..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Genre */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Genre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.genreContainer}>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreTag,
                    formData.genre === genre && styles.selectedGenreTag
                  ]}
                  onPress={() => setFormData({ ...formData, genre })}
                >
                  <Text
                    style={[
                      styles.genreTagText,
                      formData.genre === genre && styles.selectedGenreTagText
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tags (comma separated)</Text>
          <TextInput
            style={styles.textInput}
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
            placeholder="e.g. chill, lo-fi, study music"
            placeholderTextColor="#666"
            maxLength={200}
          />
        </View>

        {/* Privacy */}
        <View style={styles.inputGroup}>
          <View style={styles.privacyHeader}>
            <Text style={styles.inputLabel}>Privacy</Text>
            <TouchableOpacity
              style={styles.privacyToggle}
              onPress={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
            >
              <View style={[styles.toggleTrack, formData.isPublic && styles.activeToggleTrack]}>
                <View style={[styles.toggleThumb, formData.isPublic && styles.activeToggleThumb]} />
              </View>
              <Text style={styles.privacyLabel}>
                {formData.isPublic ? 'Public' : 'Private'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.privacyDescription}>
            {formData.isPublic 
              ? 'Anyone can discover and play your track'
              : 'Only you can see and play your track'
            }
          </Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, { marginTop: 20 }]}
          onPress={handleUpload}
          disabled={!formData.title.trim()}
        >
          <LinearGradient
            colors={formData.title.trim() ? ['#DC2626', '#EC4899'] : ['#666', '#666']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Upload Track</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  const renderUploadingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.uploadingTitle}>Uploading Your Track</Text>
        <Text style={styles.uploadingSubtitle}>
          Please don't close the app while uploading
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>

        <Text style={styles.uploadingStep}>
          {uploadProgress < 25 && 'Preparing upload...'}
          {uploadProgress >= 25 && uploadProgress < 50 && 'Uploading audio file...'}
          {uploadProgress >= 50 && uploadProgress < 75 && 'Uploading cover image...'}
          {uploadProgress >= 75 && uploadProgress < 100 && 'Saving track details...'}
          {uploadProgress >= 100 && 'Upload complete!'}
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
        </View>
        <Text style={styles.successTitle}>Upload Successful!</Text>
        <Text style={styles.successSubtitle}>
          Your track "{formData.title}" has been uploaded successfully
        </Text>

        <View style={styles.successActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
            <Text style={styles.secondaryButtonText}>Upload Another</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton}>
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>View Track</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'select' && renderSelectStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'uploading' && renderUploadingStep()}
      {step === 'success' && renderSuccessStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  uploadButton: {
    marginVertical: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportedFormats: {
    alignItems: 'center',
    marginTop: 40,
  },
  supportedTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  supportedText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  form: {
    flex: 1,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  coverSection: {
    marginBottom: 20,
  },
  coverPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeCoverButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  coverUploadArea: {
    width: 120,
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverUploadText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
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
  genreContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  genreTag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  selectedGenreTag: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  genreTagText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  selectedGenreTagText: {
    color: '#FFFFFF',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    backgroundColor: '#666',
    borderRadius: 14,
    justifyContent: 'center',
    marginRight: 8,
  },
  activeToggleTrack: {
    backgroundColor: '#DC2626',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginLeft: 2,
  },
  activeToggleThumb: {
    marginLeft: 22,
  },
  privacyLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyDescription: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  uploadingSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  progressContainer: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadingStep: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});