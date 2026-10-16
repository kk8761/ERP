import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine, X, Search, CheckCircle2, AlertCircle, Camera,
  Sparkles, Volume2, VolumeX, Eye, QrCode, RefreshCw, Upload,
  Plus, ShoppingCart, Layers, ArrowRight, Zap
} from 'lucide-react';
import { apiRequest } from '../services/api';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onBarcodeDetected,
  onNavigateToRegister,
  title = "AI Computer Vision & QR Scanner"
}) {
  // Detection mode: 'auto' (QR first, then visual ML), 'visual_only' (no QR needed), 'qr_only'
  const [detectionMode, setDetectionMode] = useState('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoScan, setAutoScan] = useState(true);

  // Vision detection results
  const [visionResult, setVisionResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const autoScanTimerRef = useRef(null);

  // POS Scanner Beep audio
  const playBeep = (freq = 1850, type = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Text-to-Speech Vocalizer
  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media devices not supported in this browser environment');
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
        };
      }
    } catch (err) {
      console.warn('Webcam stream unavailable:', err);
      setCameraError(err.message || 'Laptop webcam not accessible. You can upload an image or test samples.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setVisionResult(null);
      setManualCode('');
      setStatusMessage('');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Draw real-time detection bounding box on overlay canvas
  const drawOverlay = (bbox, label, type, confidence) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!bbox || bbox.length < 4) return;

    const [x, y, w, h] = bbox;
    const isQR = type === 'QR_CODE';
    const primaryColor = isQR ? '#00e5ff' : '#10b981';

    // Bounding Box glow
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x, y, w, h);

    // Corner brackets
    const bracketLen = Math.min(20, w / 4, h / 4);
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + bracketLen); ctx.lineTo(x, y); ctx.lineTo(x + bracketLen, y);
    // Top-right
    ctx.moveTo(x + w - bracketLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bracketLen);
    // Bottom-left
    ctx.moveTo(x, y + h - bracketLen); ctx.lineTo(x, y + h); ctx.lineTo(x + bracketLen, y + h);
    // Bottom-right
    ctx.moveTo(x + w - bracketLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bracketLen);
    ctx.stroke();

    // Text Tag banner
    const tagText = `${isQR ? '[QR Code]' : '[Visual AI]'} ${label} (${Math.round(confidence * 100)}%)`;
    ctx.font = 'bold 12px Inter, sans-serif';
    const textWidth = ctx.measureText(tagText).width;

    ctx.fillStyle = primaryColor;
    ctx.fillRect(x, Math.max(0, y - 24), textWidth + 12, 22);

    ctx.fillStyle = '#0a0f1d';
    ctx.shadowBlur = 0;
    ctx.fillText(tagText, x + 6, Math.max(16, y - 8));
  };

  // Analyze single base64 frame
  const processFrame = async (base64Data) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await apiRequest('/api/vision/analyze-frame', {
        method: 'POST',
        body: JSON.stringify({
          image_base64: base64Data,
          detection_mode: detectionMode
        })
      });

      setVisionResult(res);
      playBeep(res.detection_type === 'QR_CODE' ? 2100 : 1600);

      if (res.bounding_box) {
        drawOverlay(res.bounding_box, res.detected_label, res.detection_type, res.confidence);
      }

      if (res.speech_text) {
        speakText(res.speech_text);
      }
    } catch (err) {
      console.warn('Vision analyze error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Capture frame from active video
  const captureCurrentFrame = () => {
    if (!videoRef.current || !cameraActive) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Sync overlay canvas dimensions
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = video.videoWidth;
      overlayCanvasRef.current.height = video.videoHeight;
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Trigger manual snapshot & analyze
  const handleSnapAndAnalyze = () => {
    const frame = captureCurrentFrame();
    if (frame) {
      processFrame(frame);
    } else {
      setStatusMessage('Camera feed not ready yet. Please wait for webcam stream.');
    }
  };

  // Auto-scan polling loop (every 1.5 seconds)
  useEffect(() => {
    if (isOpen && cameraActive && autoScan) {
      autoScanTimerRef.current = setInterval(() => {
        if (!isAnalyzing) {
          const frame = captureCurrentFrame();
          if (frame) {
            processFrame(frame);
          }
        }
      }, 1500);
    } else {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    }

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [isOpen, cameraActive, autoScan, detectionMode]);

  // File Upload Handlers (for photo or testing)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        processFrame(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Test item simulation generator (for quick testing without physical items)
  const handleTestPreset = (presetType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 400);

    if (presetType === 'apple') {
      // Draw red apple circle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(200, 210, 100, 0, 2 * Math.PI);
      ctx.fill();
      // Stem & leaf
      ctx.fillStyle = '#15803d';
      ctx.fillRect(195, 90, 10, 30);
    } else if (presetType === 'orange') {
      // Draw orange
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(200, 200, 105, 0, 2 * Math.PI);
      ctx.fill();
    } else if (presetType === 'banana') {
      // Draw yellow banana curve
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 50;
      ctx.beginPath();
      ctx.arc(160, 200, 140, 0.2 * Math.PI, 0.7 * Math.PI);
      ctx.stroke();
    } else if (presetType === 'bottle') {
      // Draw beverage bottle cylinder
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(150, 100, 100, 240);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(175, 50, 50, 50);
    } else if (presetType === 'mouse') {
      // Draw computer mouse oval
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(200, 200, 75, 115, 0, 0, 2 * Math.PI);
      ctx.fill();
    } else if (presetType === 'phone') {
      // Draw smartphone
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(140, 60, 120, 260, 16);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(150, 80, 100, 210);
    }

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    processFrame(base64);
  };

  // Direct confirmation of product
  const handleConfirmProduct = () => {
    if (visionResult?.product && onBarcodeDetected) {
      onBarcodeDetected(visionResult.product);
      onClose();
    }
  };

  // Manual fallback lookup
  const handleManualLookup = async (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    try {
      const res = await apiRequest(`/api/inventory/products?search=${encodeURIComponent(manualCode.trim())}`);
      if (res && res.length > 0) {
        const prod = res[0];
        setVisionResult({
          success: true,
          detection_type: 'MANUAL_CODE',
          detected_label: prod.name,
          confidence: 1.0,
          product: prod,
          catalog_matched: true,
          speech_text: `Found ${prod.name}. Price is ₹${prod.selling_price}.`,
          guidance: 'Item located in catalog via direct SKU / Barcode lookup.'
        });
        playBeep(2000);
        speakText(`Found ${prod.name}. Price is ₹${prod.selling_price}.`);
      } else {
        setStatusMessage(`No product found matching code: "${manualCode}". Complete Step 1 to register.`);
      }
    } catch (err) {
      setStatusMessage('Error looking up code: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-main, #0f172a)',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, rgba(0,100,210,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0064d2 0%, #00c8ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(0, 100, 210, 0.25)'
            }}>
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{title}</span>
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  OpenCV 5.0 + ML Active
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Detects QR codes & visually identifies physical goods without barcode
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Audio Toggle */}
            <button
              onClick={() => setVoiceEnabled(prev => !prev)}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              title={voiceEnabled ? "Voice Speech Enabled" : "Voice Speech Muted"}
            >
              {voiceEnabled ? <Volume2 size={16} color="#0064d2" /> : <VolumeX size={16} color="#94a3b8" />}
              <span style={{ fontSize: '11px', color: voiceEnabled ? '#0064d2' : '#94a3b8' }}>
                {voiceEnabled ? "Voice ON" : "Muted"}
              </span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Mode Switcher Ribbon */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle, #f1f5f9)',
            borderRadius: '10px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              onClick={() => setDetectionMode('auto')}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
                backgroundColor: detectionMode === 'auto' ? '#0064d2' : 'transparent',
                color: detectionMode === 'auto' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={14} />
              <span>Dual Mode (QR + Visual AI)</span>
            </button>

            <button
              onClick={() => setDetectionMode('visual_only')}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
                backgroundColor: detectionMode === 'visual_only' ? '#10b981' : 'transparent',
                color: detectionMode === 'visual_only' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={14} />
              <span>Visual AI Only (No QR)</span>
            </button>

            <button
              onClick={() => setDetectionMode('qr_only')}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
                backgroundColor: detectionMode === 'qr_only' ? '#8b5cf6' : 'transparent',
                color: detectionMode === 'qr_only' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <QrCode size={14} />
              <span>QR / Barcode Only</span>
            </button>
          </div>

          {/* Camera Viewfinder Viewport */}
          <div style={{
            position: 'relative',
            height: '270px',
            backgroundColor: '#0a0f1d',
            borderRadius: '14px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(0, 100, 210, 0.2)'
          }}>
            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraActive ? 'block' : 'none'
              }}
            />

            {/* Live Canvas Overlay (for drawing real-time bounding boxes) */}
            <canvas
              ref={overlayCanvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                display: cameraActive ? 'block' : 'none'
              }}
            />

            {/* Scanning Laser Beam Line Animation */}
            {cameraActive && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
                boxShadow: '0 0 14px #00e5ff',
                animation: 'pulse 1.8s infinite',
                pointerEvents: 'none'
              }} />
            )}

            {/* Offline or Permission Denied Placeholder */}
            {!cameraActive && (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                padding: '20px'
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Camera size={28} color="#94a3b8" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    {cameraError ? "Camera Access Required" : "Connecting Laptop Webcam..."}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '360px' }}>
                    {cameraError || "Hold any item or QR code up to your webcam. You can also test with preset samples below."}
                  </div>
                </div>
                <button
                  onClick={startCamera}
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  <RefreshCw size={13} />
                  <span>Retry Camera Permission</span>
                </button>
              </div>
            )}

            {/* HUD Status Chip */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: 'rgba(10, 15, 29, 0.75)',
              backdropFilter: 'blur(4px)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              color: '#38bdf8',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: isAnalyzing ? '#f59e0b' : (cameraActive ? '#10b981' : '#ef4444')
              }} />
              <span>
                {isAnalyzing ? "AI Inferencing..." : (cameraActive ? "Vision Stream Active" : "Camera Standby")}
              </span>
            </div>

            {/* Capture / Snap Button */}
            {cameraActive && (
              <button
                onClick={handleSnapAndAnalyze}
                disabled={isAnalyzing}
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  backgroundColor: 'rgba(0, 100, 210, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '7px 16px',
                  borderRadius: '24px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Camera size={14} />
                <span>Snap & Identify Item</span>
              </button>
            )}
          </div>

          {/* AI Vision Detection Result Banner */}
          {visionResult && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: visionResult.catalog_matched ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 100, 210, 0.08)',
              border: `1.5px solid ${visionResult.catalog_matched ? '#10b981' : '#0064d2'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${visionResult.detection_type === 'QR_CODE' ? 'badge-primary' : 'badge-success'}`}>
                      {visionResult.detection_type === 'QR_CODE' ? 'QR Code Scanned' : 'Visual ML Recognition'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {Math.round(visionResult.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <h4 style={{ margin: '6px 0 2px', fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {visionResult.detected_label}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {visionResult.guidance}
                  </div>
                </div>

                {visionResult.product && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                      ₹ {visionResult.product.selling_price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Stock: <strong>{visionResult.product.current_stock}</strong> {visionResult.product.unit_of_measure}
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Attributes Pill Row (Color, Shape, Texture) */}
              {visionResult.visual_attributes && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    Color: <strong>{visionResult.visual_attributes.dominant_color}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    Aspect: <strong>{visionResult.visual_attributes.aspect_ratio}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    Roundness: <strong>{Math.round(visionResult.visual_attributes.circularity * 100)}%</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    Texture: <strong>{visionResult.visual_attributes.edge_texture}</strong>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                {visionResult.product ? (
                  <button
                    onClick={handleConfirmProduct}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Confirm & Select Item</span>
                  </button>
                ) : (
                  onNavigateToRegister && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToRegister(visionResult.detected_label);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Plus size={15} />
                      <span>Register Item in Step 1</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Quick Demo Test Presets */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Test ML Visual Classifier (Click to simulate camera frame without QR):
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleTestPreset('apple')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                🍎 Apple
              </button>
              <button
                type="button"
                onClick={() => handleTestPreset('orange')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                🍊 Orange
              </button>
              <button
                type="button"
                onClick={() => handleTestPreset('banana')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                🍌 Banana
              </button>
              <button
                type="button"
                onClick={() => handleTestPreset('bottle')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                🍶 Beverage Bottle
              </button>
              <button
                type="button"
                onClick={() => handleTestPreset('mouse')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                🖱️ Mouse
              </button>
              <button
                type="button"
                onClick={() => handleTestPreset('phone')}
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              >
                📱 Smartphone
              </button>
            </div>
          </div>

          {/* Manual Input or Image Upload */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <form onSubmit={handleManualLookup} style={{ display: 'flex', flex: 1, gap: '8px' }}>
              <input
                type="text"
                placeholder="Or manually enter Barcode / SKU / QR string..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="form-input"
                style={{ fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                Lookup
              </button>
            </form>

            <label
              className="btn btn-ghost"
              style={{
                border: '1px solid var(--border-color)',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Upload photo from laptop"
            >
              <Upload size={14} />
              <span>Upload Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {statusMessage && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca'
            }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <div>
            Auto-Scan: <strong>{autoScan ? "Active (1.5s)" : "Paused"}</strong> • Mode: <strong>{detectionMode.toUpperCase()}</strong>
          </div>
          <button
            onClick={() => setAutoScan(prev => !prev)}
            className="btn btn-ghost"
            style={{ fontSize: '11.5px', padding: '4px 8px' }}
          >
            {autoScan ? "Pause Auto-Capture" : "Resume Auto-Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}
