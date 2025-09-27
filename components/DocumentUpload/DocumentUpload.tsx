import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Button } from '@/components/Button/Button';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  AlertCircle,
  Camera,
  FileText
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useVerificationDocuments, VerificationDocument } from '@/hooks/useVerification';
import { verificationService } from '@/lib/verificationService';

interface DocumentUploadProps {
  verificationId: string;
  documentType: VerificationDocument['document_type'];
  title: string;
  description?: string;
  required?: boolean;
  acceptedTypes?: ('image' | 'pdf' | 'document')[];
  maxSizeMB?: number;
  onUploadComplete?: (document: VerificationDocument) => void;
  onRemove?: (documentId: string) => void;
  existingDocuments?: VerificationDocument[];
  disabled?: boolean;
  style?: any;
}

export function DocumentUpload({
  verificationId,
  documentType,
  title,
  description,
  required = false,
  acceptedTypes = ['image', 'pdf'],
  maxSizeMB = 10,
  onUploadComplete,
  onRemove,
  existingDocuments = [],
  disabled = false,
  style,
}: DocumentUploadProps) {
  const { theme } = useTheme();
  const { uploadDocument, removeDocument, loading } = useVerificationDocuments();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const currentDocument = existingDocuments.find(doc => doc.document_type === documentType);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload documents.',
          [{ text: 'OK' }]
        );
        return false;
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'Camera permission is needed to take photos of documents.',
          [{ text: 'OK' }]
        );
      }
    }
    return true;
  };

  const validateFile = (file: { size: number; type?: string; name?: string }) => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      Alert.alert(
        'File Too Large',
        `File size must be less than ${maxSizeMB}MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        [{ text: 'OK' }]
      );
      return false;
    }

    // Check file type
    if (file.type) {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isDocument = file.type.includes('document') || file.type.includes('text');

      const typeAllowed = 
        (acceptedTypes.includes('image') && isImage) ||
        (acceptedTypes.includes('pdf') && isPDF) ||
        (acceptedTypes.includes('document') && isDocument);

      if (!typeAllowed) {
        Alert.alert(
          'Invalid File Type',
          `Please select a valid file type. Accepted types: ${acceptedTypes.join(', ')}`,
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    return true;
  };

  const handleImagePicker = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image',
      'Choose how you want to select your document image',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImageLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Image library error:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes.includes('pdf') ? 'application/pdf' : '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to open document picker');
    }
  };

  const handleFileUpload = async (asset: any) => {
    try {
      // Validate file
      if (!validateFile({ size: asset.size || 0, type: asset.mimeType, name: asset.name })) {
        return;
      }

      // Create File object for web or use asset for mobile
      let file: File;
      if (Platform.OS === 'web') {
        // For web, we need to create a File object
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        file = new (File as any)([blob], asset.name || `document.${asset.type?.split('/')[1] || 'jpg'}`);
      } else {
        // For mobile, create a File-like object
        file = {
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`,
          type: asset.mimeType || asset.type,
          size: asset.size || 0,
        } as any;
      }

      // Process document with verification service
      const processResult = await verificationService.processDocument(file, documentType);
      if (processResult.error) {
        Alert.alert('Processing Error', processResult.error);
        return;
      }

      // Upload document
      setUploadProgress(0);
      const document = await uploadDocument(verificationId, processResult.processedFile || file, documentType);
      
      setUploadProgress(null);
      onUploadComplete?.(document);
      
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(null);
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload document');
    }
  };

  const handleRemoveDocument = async () => {
    if (!currentDocument) return;

    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeDocument(currentDocument.id);
              onRemove?.(currentDocument.id);
              Alert.alert('Success', 'Document removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove document');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon size={20} color={theme.colors.primary} />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText size={20} color={theme.colors.error} />;
    }
    return <File size={20} color={theme.colors.text.secondary} />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color={theme.colors.success} />;
      case 'rejected':
        return <AlertCircle size={16} color={theme.colors.error} />;
      default:
        return <AlertCircle size={16} color={theme.colors.warning} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || uploadProgress !== null) {
    return (
      <View style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Text variant="h4">{title}</Text>
          {required && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>
              *
            </Text>
          )}
        </View>
        
        <LoadingSkeleton height={60} />
        
        {uploadProgress !== null && (
          <View style={{ marginTop: theme.spacing.md }}>
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[
      {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      style,
    ]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Text variant="h4">{title}</Text>
        {required && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>
            *
          </Text>
        )}
      </View>

      {description && (
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.md }}>
          {description}
        </Text>
      )}

      {/* Current Document */}
      {currentDocument ? (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {getFileIcon(currentDocument.mime_type)}
              <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                <Text variant="bodySmall" numberOfLines={1}>
                  {currentDocument.file_name}
                </Text>
                <Text variant="caption" color="muted">
                  {currentDocument.file_size ? formatFileSize(currentDocument.file_size) : 'Unknown size'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {getStatusIcon(currentDocument.status)}
              <TouchableOpacity
                onPress={handleRemoveDocument}
                style={{
                  marginLeft: theme.spacing.sm,
                  padding: theme.spacing.xs,
                }}
                disabled={disabled}
              >
                <X size={16} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text variant="caption" color="muted">
            Status: {currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)}
          </Text>

          {currentDocument.review_notes && (
            <Text variant="caption" style={{ 
              color: currentDocument.status === 'rejected' ? theme.colors.error : theme.colors.text.secondary,
              marginTop: theme.spacing.xs,
            }}>
              Note: {currentDocument.review_notes}
            </Text>
          )}
        </View>
      ) : (
        /* Upload Area */
        <View>
          {acceptedTypes.includes('image') && (
            <Button
              variant="tertiary"
              size="md"
              onPress={handleImagePicker}
              disabled={disabled}
              style={{ marginBottom: theme.spacing.sm }}
              icon={<Camera size={20} color={theme.colors.primary} />}
            >
              Take Photo or Select Image
            </Button>
          )}

          {(acceptedTypes.includes('pdf') || acceptedTypes.includes('document')) && (
            <Button
              variant="tertiary"
              size="md"
              onPress={handleDocumentPicker}
              disabled={disabled}
              icon={<Upload size={20} color={theme.colors.primary} />}
            >
              Upload Document
            </Button>
          )}
        </View>
      )}

      {/* File Requirements */}
      <View
        style={{
          backgroundColor: theme.colors.primary + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginTop: theme.spacing.md,
        }}
      >
        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: theme.spacing.xs }}>
          Requirements:
        </Text>
        <Text variant="caption" color="muted">
          • File types: {acceptedTypes.join(', ').toUpperCase()}
        </Text>
        <Text variant="caption" color="muted">
          • Maximum size: {maxSizeMB}MB
        </Text>
        <Text variant="caption" color="muted">
          • Clear, readable image or document
        </Text>
        <Text variant="caption" color="muted">
          • All information must be visible
        </Text>
      </View>
    </View>
  );
}

// Multi-document upload component
export function MultiDocumentUpload({
  verificationId,
  documentTypes,
  onUploadComplete,
  onRemove,
  existingDocuments = [],
  disabled = false,
  style,
}: {
  verificationId: string;
  documentTypes: Array<{
    type: VerificationDocument['document_type'];
    title: string;
    description?: string;
    required?: boolean;
    acceptedTypes?: ('image' | 'pdf' | 'document')[];
  }>;
  onUploadComplete?: (document: VerificationDocument) => void;
  onRemove?: (documentId: string) => void;
  existingDocuments?: VerificationDocument[];
  disabled?: boolean;
  style?: any;
}) {
  return (
    <View style={[{ gap: 16 }, style]}>
      {documentTypes.map((docType) => (
        <DocumentUpload
          key={docType.type}
          verificationId={verificationId}
          documentType={docType.type}
          title={docType.title}
          description={docType.description}
          required={docType.required}
          acceptedTypes={docType.acceptedTypes}
          onUploadComplete={onUploadComplete}
          onRemove={onRemove}
          existingDocuments={existingDocuments}
          disabled={disabled}
        />
      ))}
    </View>
  );
}
