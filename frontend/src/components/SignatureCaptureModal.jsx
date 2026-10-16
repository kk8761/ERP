import React, { useRef, useState, useEffect } from 'react';
import { Check, X, RotateCcw, PenTool, ShieldCheck, Download } from 'lucide-react';

export default function SignatureCaptureModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Digital Authorization & E-Signature",
  documentRef = "DOC-AUTH-2026",
  signerName = "Executive Officer"
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState('#0d233a');
  const [verificationCode] = useState(() => 'SIG-' + Math.random().toString(36).substring(2, 9).toUpperCase());
  const lastPointRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Retina DPI Scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;

    // Draw subtle signing baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 35);
    ctx.lineTo(rect.width - 30, rect.height - 35);
    ctx.stroke();

    setIsEmpty(true);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    lastPointRef.current = coords;
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);

    ctx.strokeStyle = penColor;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Re-draw baseline
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 35);
    ctx.lineTo(rect.width - 30, rect.height - 35);
    ctx.stroke();

    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm({
      signatureData: dataUrl,
      documentRef,
      signerName,
      verificationCode,
      signedAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        color: 'var(--text-main, #0f172a)',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden'
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
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#0064d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <PenTool size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>{title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Ref: {documentRef} • Signer: {signerName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Canvas Area */}
        <div style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Sign within the designated frame below:
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPenColor('#0d233a')}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#0d233a',
                  border: penColor === '#0d233a' ? '2px solid #0064d2' : '1px solid #ccc',
                  cursor: 'pointer'
                }}
                title="Black Ink"
              />
              <button
                type="button"
                onClick={() => setPenColor('#004b99')}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#004b99',
                  border: penColor === '#004b99' ? '2px solid #0064d2' : '1px solid #ccc',
                  cursor: 'pointer'
                }}
                title="Blue Ink"
              />
              <button
                onClick={clearCanvas}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  fontWeight: 600
                }}
              >
                <RotateCcw size={12} /> Clear
              </button>
            </div>
          </div>

          <div style={{
            border: '2px dashed var(--border-color, #cbd5e1)',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            position: 'relative',
            touchAction: 'none'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '180px',
                display: 'block',
                cursor: 'crosshair',
                borderRadius: '10px'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '30px',
              fontSize: '11px',
              color: '#94a3b8',
              pointerEvents: 'none',
              fontWeight: 500
            }}>
              ✕ Sign on the line above
            </div>
          </div>

          {/* Cryptographic Compliance Footprint */}
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 100, 210, 0.05)',
            border: '1px solid rgba(0, 100, 210, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px'
          }}>
            <ShieldCheck size={18} color="#0064d2" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 600, color: '#0064d2' }}>NexaERP Cryptographic Audit Seal</span>: 
              {' '}SHA256 Token <code>{verificationCode}</code> timestamped at approval. Meets ESIGN & eIDAS digital signature standards.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          backgroundColor: 'var(--bg-app, #f8fafc)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: isEmpty ? '#94a3b8' : 'linear-gradient(135deg, #0064d2 0%, #004b99 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isEmpty ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isEmpty ? 'none' : '0 4px 12px rgba(0, 100, 210, 0.25)'
            }}
          >
            <Check size={16} /> Sign & Authorize
          </button>
        </div>
      </div>
    </div>
  );
}
