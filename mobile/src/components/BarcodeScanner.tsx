/**
 * Barcode Scanner Component
 * 
 * Camera-based barcode and QR code scanner for inventory operations
 * Supports multiple formats: EAN-13, UPC-A, Code-128, QR codes
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BarcodeMask from 'react-native-barcode-mask';

const {width, height} = Dimensions.get('window');

export interface ScanResult {
  value: string;
  type: string;
  timestamp: Date;
}

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (result: ScanResult) => void;
  mode?: 'single' | 'batch'; // single scan or batch scanning
  title?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onScan,
  mode = 'single',
  title = 'Scan Barcode',
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedCodes, setScannedCodes] = useState<ScanResult[]>([]);
  const [lastScannedValue, setLastScannedValue] = useState<string>('');

  const device = useCameraDevice('back');

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in settings to use the barcode scanner.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Camera.requestCameraPermission()},
          ],
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const handleBarcodeScanned = useCallback(
    (codes: Code[]) => {
      if (!isScanning || codes.length === 0) return;

      const code = codes[0];
      const scannedValue = code.value || '';

      // Prevent duplicate scans
      if (scannedValue === lastScannedValue) return;

      setLastScannedValue(scannedValue);

      const result: ScanResult = {
        value: scannedValue,
        type: code.type || 'unknown',
        timestamp: new Date(),
      };

      if (mode === 'single') {
        // Single scan mode - immediate callback and close
        setIsScanning(false);
        onScan(result);
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        // Batch mode - add to list
        setScannedCodes(prev => [...prev, result]);
        setIsScanning(false);
        // Re-enable scanning after 1 second to prevent duplicates
        setTimeout(() => {
          setIsScanning(true);
          setLastScannedValue('');
        }, 1000);
      }
    },
    [isScanning, lastScannedValue, mode, onScan, onClose],
  );

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'upc-a',
      'upc-e',
      'code-128',
      'code-39',
      'code-93',
      'codabar',
      'itf',
      'pdf-417',
      'aztec',
      'data-matrix',
    ],
    onCodeScanned: handleBarcodeScanned,
  });

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    const result: ScanResult = {
      value: manualCode.trim(),
      type: 'manual',
      timestamp: new Date(),
    };

    if (mode === 'single') {
      onScan(result);
      onClose();
    } else {
      setScannedCodes(prev => [...prev, result]);
      setManualCode('');
      setManualEntry(false);
    }
  };

  const handleFinishBatch = () => {
    if (scannedCodes.length === 0) {
      Alert.alert('No Scans', 'Please scan at least one barcode');
      return;
    }

    // Send all scanned codes
    scannedCodes.forEach(result => onScan(result));
    onClose();
  };

  const removeScanFromBatch = (index: number) => {
    setScannedCodes(prev => prev.filter((_, i) => i !== index));
  };

  if (!visible) return null;

  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.permissionContainer}>
            <Icon name="camera-off" size={64} color="#ef4444" />
            <Text style={styles.permissionText}>
              Camera permission is required
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestCameraPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible && !manualEntry}
            codeScanner={codeScanner}
            torch={flashEnabled ? 'on' : 'off'}
          />
          
          {/* Barcode Mask Overlay */}
          <BarcodeMask
            width={280}
            height={180}
            showAnimatedLine={isScanning}
            edgeColor="#3b82f6"
            animatedLineColor="#3b82f6"
          />

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              {isScanning
                ? 'Position barcode within the frame'
                : 'Processing...'}
            </Text>
          </View>

          {/* Batch Mode Counter */}
          {mode === 'batch' && scannedCodes.length > 0 && (
            <View style={styles.counterBadge}>
              <Icon name="barcode" size={20} color="#fff" />
              <Text style={styles.counterText}>{scannedCodes.length}</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFlashEnabled(!flashEnabled)}>
            <Icon
              name={flashEnabled ? 'flash' : 'flash-off'}
              size={32}
              color="#fff"
            />
            <Text style={styles.controlButtonText}>Flash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setManualEntry(true)}>
            <Icon name="keyboard" size={32} color="#fff" />
            <Text style={styles.controlButtonText}>Manual</Text>
          </TouchableOpacity>

          {mode === 'batch' && (
            <TouchableOpacity
              style={[styles.controlButton, styles.finishButton]}
              onPress={handleFinishBatch}>
              <Icon name="check-circle" size={32} color="#fff" />
              <Text style={styles.controlButtonText}>Finish</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Batch Mode List */}
        {mode === 'batch' && scannedCodes.length > 0 && (
          <View style={styles.batchList}>
            <ScrollView>
              {scannedCodes.map((item, index) => (
                <View key={index} style={styles.batchItem}>
                  <View style={styles.batchItemLeft}>
                    <Icon name="barcode-scan" size={20} color="#3b82f6" />
                    <View style={styles.batchItemText}>
                      <Text style={styles.batchItemValue}>{item.value}</Text>
                      <Text style={styles.batchItemType}>{item.type}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeScanFromBatch(index)}
                    style={styles.batchItemRemove}>
                    <Icon name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Manual Entry Modal */}
        <Modal
          visible={manualEntry}
          transparent
          animationType="fade"
          onRequestClose={() => setManualEntry(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Manual Entry</Text>
              <Text style={styles.modalSubtitle}>
                Enter barcode manually for damaged or unreadable codes
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter barcode number"
                value={manualCode}
                onChangeText={setManualCode}
                autoFocus
                keyboardType="default"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setManualEntry(false);
                    setManualCode('');
                  }}>
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleManualSubmit}>
                  <Text style={styles.modalButtonSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  instructionsContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterBadge: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  finishButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  batchList: {
    maxHeight: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 16,
  },
  batchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  batchItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  batchItemText: {
    marginLeft: 12,
    flex: 1,
  },
  batchItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  batchItemType: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  batchItemRemove: {
    padding: 4,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  modalButtonSubmit: {
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  modalButtonCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarcodeScanner;
