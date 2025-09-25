import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface UploadFormData {
  title: string;
  description: string;
  genre: string;
  tags: string;
  isPublic: boolean;
  coverImage: string | null;
  audioFile: string | null;
}

export default function UploadScreen() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    genre: '',
    tags: '',
    isPublic: true,
    coverImage: null,
    audioFile: null,
  });

  const genres = [
    'Hip-Hop', 'Electronic', 'Rock', 'Pop', 'Jazz', 'Classical', 
    'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Other'
  ];

  const handleInputChange = (field: keyof UploadFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select a cover image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, coverImage: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, audioFile: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const removeFile = (type: 'coverImage' | 'audioFile') => {
    setFormData(prev => ({ ...prev, [type]: null }));
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          Alert.alert(
            'Upload Complete!',
            'Your track has been uploaded successfully.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset form
                  setFormData({
                    title: '',
                    description: '',
                    genre: '',
                    tags: '',
                    isPublic: true,
                    coverImage: null,
                    audioFile: null,
                  });
                  setUploadProgress(0);
                }
              }
            ]
          );
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleUpload = async () => {
    // Validate form
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for your track.');
      return;
    }

    if (!formData.audioFile) {
      Alert.alert('Validation Error', 'Please select an audio file to upload.');
      return;
    }

    if (!formData.genre) {
      Alert.alert('Validation Error', 'Please select a genre for your track.');
      return;
    }

    // Simulate upload process
    simulateUpload();
  };

  const renderGenreSelector = () => (
    <View style={styles.genreContainer}>
      <Text style={styles.label}>Genre *</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.genreScroll}
        contentContainerStyle={styles.genreScrollContent}
      >
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              formData.genre === genre && styles.genreChipSelected
            ]}
            onPress={() => handleInputChange('genre', genre)}
          >
            <Text style={[
              styles.genreChipText,
              formData.genre === genre && styles.genreChipTextSelected
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFileUpload = (type: 'coverImage' | 'audioFile') => {
    const isAudio = type === 'audioFile';
    const fileUri = formData[type];
    const hasFile = !!fileUri;

    return (
      <View style={styles.fileUploadContainer}>
        <Text style={styles.label}>
          {isAudio ? 'Audio File *' : 'Cover Image (Optional)'}
        </Text>
        
        <TouchableOpacity
          style={[styles.fileUploadButton, hasFile && styles.fileUploadButtonSuccess]}
          onPress={isAudio ? pickAudioFile : pickCoverImage}
          disabled={isUploading}
        >
          {hasFile ? (
            <View style={styles.fileSelected}>
              <Ionicons 
                name={isAudio ? "musical-notes" : "image"} 
                size={24} 
                color="#4CAF50" 
              />
              <Text style={styles.fileSelectedText}>
                {isAudio ? 'Audio file selected' : 'Cover image selected'}
              </Text>
              <TouchableOpacity
                onPress={() => removeFile(type)}
                style={styles.removeFileButton}
              >
                <Ionicons name="close-circle" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fileUploadPlaceholder}>
              <Ionicons 
                name={isAudio ? "cloud-upload-outline" : "image-outline"} 
                size={32} 
                color="#666" 
              />
              <Text style={styles.fileUploadText}>
                {isAudio ? 'Tap to select audio file' : 'Tap to select cover image'}
              </Text>
              <Text style={styles.fileUploadSubtext}>
                {isAudio ? 'MP3, WAV, M4A supported' : 'JPG, PNG supported'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {hasFile && !isAudio && (
          <Image source={{ uri: fileUri }} style={styles.coverImagePreview} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#000000', '#0D0D0D', '#1A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Track</Text>
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          <LinearGradient
            colors={isUploading ? ['#666', '#666'] : ['#DC2626', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.uploadButtonGradient}
          >
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Track Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter track title"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your track..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {renderGenreSelector()}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter tags separated by commas"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.tags}
              onChangeText={(text) => handleInputChange('tags', text)}
            />
            <Text style={styles.helperText}>
              Example: chill, beats, instrumental
            </Text>
          </View>
        </View>

        {/* File Uploads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media Files</Text>
          
          {renderFileUpload('audioFile')}
          {renderFileUpload('coverImage')}
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <TouchableOpacity
            style={styles.privacyOption}
            onPress={() => handleInputChange('isPublic', !formData.isPublic)}
          >
            <View style={styles.privacyOptionContent}>
              <View style={styles.privacyOptionText}>
                <Text style={styles.privacyOptionTitle}>Public Track</Text>
                <Text style={styles.privacyOptionDescription}>
                  Anyone can discover and listen to your track
                </Text>
              </View>
              <View style={[styles.toggle, formData.isPublic && styles.toggleActive]}>
                {formData.isPublic && (
                  <View style={styles.toggleThumb} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>Uploading... {uploadProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        )}
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  uploadButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  genreContainer: {
    marginBottom: 16,
  },
  genreScroll: {
    maxHeight: 50,
  },
  genreScrollContent: {
    paddingRight: 16,
  },
  genreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genreChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  genreChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  genreChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  fileUploadContainer: {
    marginBottom: 16,
  },
  fileUploadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileUploadButtonSuccess: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
  },
  fileUploadPlaceholder: {
    alignItems: 'center',
  },
  fileUploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  fileUploadSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileSelectedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 8,
  },
  removeFileButton: {
    marginLeft: 8,
  },
  coverImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  privacyOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
  },
  privacyOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#DC2626',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
});