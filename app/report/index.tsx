import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { BACKEND_URL } from '@/config';
import { useAuth } from '@/contexts/auth-context';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { uploadToSupabase } from '@/services/supabase';
import { Ionicons } from '@expo/vector-icons';

type ReportMethod = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ILLVoice/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    const data: any = await res.json();
    return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

interface SubmittedReport {
  id: string;
  title: string;
  description: string;
  method: ReportMethod;
  latitude: number;
  longitude: number;
  address?: string;
  mediaUrl?: string;
  createdAt: string;
  status: 'PENDING';
}

export default function ReportScreen() {
  const [method, setMethod] = useState<ReportMethod>('TEXT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [media, setMedia] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const preparedRef = useRef(false);

  const { userEmail, idToken, userName } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;

        let position = null;
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 5000,
          });
        } catch {
          position = await Location.getLastKnownPositionAsync({});
        }

        if (position) {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          const resolvedAddress = await reverseGeocode(latitude, longitude);
          setAddress(resolvedAddress);
        }
      } catch {
        console.warn('Location error');
      }
    })();

    return () => {
      if (recordingStatus === 'recording') {
        recorder.stop().catch(() => {});
      }
      preparedRef.current = false;
    };
  }, [recordingStatus, recorder]);

  const pickMedia = async () => {
    let result;
    if (method === 'IMAGE') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission required', 'Please allow camera access');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    } else if (method === 'VIDEO') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission required', 'Please allow camera access');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow media access');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      const asset = result.assets[0];
      setMedia(asset.uri);
    }
  };

  const startRecording = async () => {
    if (recordingStatus === 'recording') return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow microphone access');
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!preparedRef.current) {
        await recorder.prepareToRecordAsync();
        preparedRef.current = true;
      }
      await recorder.record();
      setRecordingStatus('recording');
    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Error', 'Failed to start recording');
      preparedRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (recordingStatus !== 'recording') return;
    try {
      setRecordingStatus('stopped');
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setMedia(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      setRecordingStatus('idle');
    }
  };

  const handleSubmit = async () => {
    if (method === 'TEXT' && !title.trim()) {
      Alert.alert('Error', 'Please fill in title for text reports');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Location is required. Please enable GPS and try again.');
      return;
    }
    if (method !== 'TEXT' && !media) {
      Alert.alert('Error', `Please attach a ${method.toLowerCase()}`);
      return;
    }

    setSubmitting(true);

    try {
      let mediaUrl = 'N/A';
      if (method !== 'TEXT' && media) {
        const uploadedUrl = await uploadToSupabase(media);
        if (!uploadedUrl) {
          Alert.alert('Error', 'Failed to upload media. Please try again.');
          setSubmitting(false);
          return;
        }
        mediaUrl = uploadedUrl;
      }

      const payload = {
        email: userEmail,
        title: method === 'TEXT' ? title : "",
        description: method === 'TEXT' ? description : "",
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || undefined,
        mediaType: method === 'TEXT' ? undefined : method,
        mediaUrl: method === 'TEXT' ? undefined : mediaUrl,
      };

      const response = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to submit report');
        return;
      }

      const data = await response.json();

      setSubmittedReport({
        id: data.id || 'N/A',
        title: data.title || (method === 'TEXT' ? title : "AI will analyze..."),
        description: data.description || (method === 'TEXT' ? description : "AI will generate description..."),
        method,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address || undefined,
        mediaUrl: method !== 'TEXT' ? mediaUrl : undefined,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      });
    } catch {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedReport(null);
    setTitle('');
    setDescription('');
    setMedia(null);
    setMethod('TEXT');
    setRecordingStatus('idle');
    setAddress('');
  };

  const methods: { key: ReportMethod; label: string; description: string; icon: string; color: string }[] = [
    { key: 'TEXT', label: 'Text', description: 'Describe in words', icon: 'document-text-outline', color: '#007AFF' },
    { key: 'IMAGE', label: 'Photo', description: 'Take a photo', icon: 'camera-outline', color: '#34c759' },
    { key: 'VIDEO', label: 'Video', description: 'Record a video', icon: 'videocam-outline', color: '#ff9500' },
    { key: 'AUDIO', label: 'Audio', description: 'Record audio', icon: 'mic-outline', color: '#af52de' },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (submittedReport) {
    return (
      <ScrollView style={styles.recapContainer} contentContainerStyle={styles.recapContent}>
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <View style={styles.successPulse} />
          </View>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successSubtitle}>Your report has been received and is being processed</Text>
        </View>

        <View style={styles.recapCard}>
          <View style={styles.recapSection}>
            <Text style={styles.recapSectionLabel}>Report Information</Text>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Report ID</Text>
              <Text style={styles.recapValue}>{submittedReport.id}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Submitted By</Text>
              <Text style={styles.recapValue}>{userName || 'User'}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Date & Time</Text>
              <Text style={styles.recapValue}>{formatDate(submittedReport.createdAt)}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: '#8e8e9315' }]}>
                <Ionicons name="hourglass" size={12} color="#8e8e93" />
                <Text style={[styles.statusText, { color: '#8e8e93' }]}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={styles.recapDivider} />

          <View style={styles.recapSection}>
            <Text style={styles.recapSectionLabel}>Details</Text>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Title</Text>
              <Text style={[styles.recapValue, styles.recapValueBold]}>{submittedReport.title}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Description</Text>
              <Text style={styles.recapDescription}>{submittedReport.description}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Method</Text>
              <Text style={styles.recapValue}>{submittedReport.method}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Location</Text>
              <Text style={[styles.recapValue, { fontFamily: 'monospace' }]}>
                {submittedReport.address || `${submittedReport.latitude.toFixed(6)}, ${submittedReport.longitude.toFixed(6)}`}
              </Text>
            </View>
            {submittedReport.mediaUrl && submittedReport.mediaUrl !== 'N/A' && (
              <View style={styles.recapRow}>
                <Text style={styles.recapLabel}>Attachment</Text>
                <Text style={[styles.recapValue, { color: '#007AFF' }]}>Included</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.recapActions}>
          <TouchableOpacity style={styles.recapPrimaryButton} onPress={resetForm}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.recapPrimaryButtonText}>Submit Another Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.recapSecondaryButton} onPress={() => router.back()}>
            <Ionicons name="home-outline" size={20} color="#1E3A8A" />
            <Text style={styles.recapSecondaryButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={20} color="#007AFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>New Report</Text>
          <Text style={styles.subtitle}>Report an issue in your community</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Issue Details</Text>
          </View>

          <Text style={styles.label}>Issue Title *</Text>
          <TextInput
            style={styles.input}
            placeholder={method === 'TEXT' ? "E.g., Pothole on Main Street" : "Auto-generated from AI analysis"}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add brief context (AI will analyze your media)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Reporting Method</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodRow}>
            {methods.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.methodChip, { borderColor: m.color }, method === m.key && { backgroundColor: m.color }]}
                onPress={() => setMethod(m.key)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={18}
                  color={method === m.key ? '#fff' : m.color}
                  style={styles.methodChipIcon}
                />
                <Text style={[styles.methodChipText, method === m.key && styles.methodChipTextActive, { color: method === m.key ? '#fff' : m.color }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#1E3A8A" />
              <Text style={styles.locationText} numberOfLines={1}>
                {address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
              </Text>
            </View>
          )}

          {method !== 'TEXT' && (
            <>
              <Text style={styles.label}>Attachment *</Text>
              {media ? (
                <View style={styles.mediaPreview}>
                  {method === 'IMAGE' && <Image source={{ uri: media }} style={styles.mediaImage} />}
                  {method === 'VIDEO' && (
                    <View style={styles.videoPreview}>
                      <Ionicons name="videocam" size={40} color="#1E3A8A" />
                      <Text style={styles.mediaPreviewLabel}>Video attached</Text>
                    </View>
                  )}
                  {method === 'AUDIO' && (
                    <View style={styles.audioPreview}>
                      <Ionicons name="mic" size={40} color="#af52de" />
                      <Text style={styles.audioPreviewText}>Audio recorded</Text>
                      <Text style={styles.audioDuration}>
                        {recordingStatus === 'stopped' ? 'Ready to submit' : 'Recording...'}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setMedia(null)} style={styles.removeMediaButton}>
                    <Text style={styles.removeMediaText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {method === 'AUDIO' && !media && (
                    <View style={styles.audioRecordingContainer}>
                      <Text style={styles.audioInstructionText}>
                        Tap and hold the record button to capture audio
                      </Text>
                      <TouchableOpacity
                        style={[styles.recordButton, recordingStatus === 'recording' && styles.recordingActiveButton]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                      >
                        <Ionicons name="mic" size={22} color="#fff" />
                        <Text style={styles.recordButtonText}>
                          {recordingStatus === 'recording' ? '  Recording...' : '  Press to Record'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {(method === 'IMAGE' || method === 'VIDEO') && (
                    <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
                      <Ionicons name={method === 'IMAGE' ? 'camera' : 'videocam'} size={24} color="#007AFF" />
                      <Text style={styles.mediaButtonText}>
                        {method === 'IMAGE' ? 'Take Photo' : 'Record Video'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  form: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f8f9fb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  severityChipText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  severityChipTextActive: {
    color: '#fff',
  },
  methodRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodChipIcon: {
    marginRight: 2,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  methodChipTextActive: {
    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fb',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  mediaPreview: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f5',
  },
  mediaImage: {
    width: '100%',
    height: 220,
  },
  videoPreview: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    gap: 8,
  },
  mediaPreviewLabel: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  removeMediaButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  removeMediaText: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 13,
  },
  mediaButton: {
    backgroundColor: '#f8f9fb',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  mediaButtonText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  audioPreview: {
    backgroundColor: '#f3e8ff',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  audioPreviewText: {
    fontSize: 16,
    color: '#af52de',
    fontWeight: '700',
  },
  audioDuration: {
    fontSize: 13,
    color: '#666',
  },
  audioRecordingContainer: {
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  audioInstructionText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  recordButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
  },
  recordingActiveButton: {
    backgroundColor: '#ff9500',
  },
  recordButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 40,
  },
  recapContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  recapContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34c759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 2,
  },
  successPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    top: -10,
    left: -10,
    zIndex: 1,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  recapCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recapSection: {
    gap: 12,
  },
  recapSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recapRow: {
    gap: 4,
  },
  recapLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  recapValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '600',
    marginTop: 2,
  },
  recapValueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  recapDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f8f9fb',
    padding: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  recapDivider: {
    height: 1,
    backgroundColor: '#f0f0f5',
    marginVertical: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recapActions: {
    gap: 12,
    marginTop: 20,
  },
  recapPrimaryButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  recapPrimaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  recapSecondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  recapSecondaryButtonText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 16,
  },
});
