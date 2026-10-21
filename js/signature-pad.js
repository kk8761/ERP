/**
 * NexaERP — Mobile Signature Capture Component
 * Touch-optimized signature pad for approvals and document signing
 * Validates: Requirements 22.8 - Mobile signature capture for approvals
 * Task 40.6
 */

class SignaturePad {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.isEmpty = true;
    
    // Configuration options
    this.options = {
      penColor: options.penColor || '#000000',
      lineWidth: options.lineWidth || 2,
      minWidth: options.minWidth || 1,
      maxWidth: options.maxWidth || 4,
      backgroundColor: options.backgroundColor || '#ffffff',
      velocityFilterWeight: options.velocityFilterWeight || 0.7,
      ...options
    };
    
    // Set canvas size to match display size (high DPI support)
    this.resizeCanvas();
    
    // Initialize event listeners
    this.initializeEventListeners();
    
    // Clear canvas with background color
    this.clear();
  }
  
  /**
   * Resize canvas to match display size with proper DPI scaling
   */
  resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    
    this.ctx.scale(ratio, ratio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Reapply drawing settings
    this.ctx.strokeStyle = this.options.penColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }
  
  /**
   * Initialize touch and mouse event listeners
   */
  initializeEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Touch events (mobile)
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle resize events
   */
  handleResize() {
    // Save the current signature
    const data = this.toDataURL();
    this.resizeCanvas();
    // Restore the signature
    if (!this.isEmpty) {
      this.fromDataURL(data);
    } else {
      this.clear();
    }
  }
  
  /**
   * Get coordinates from mouse event
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  /**
   * Get coordinates from touch event
   */
  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }
  
  /**
   * Mouse down handler
   */
  handleMouseDown(e) {
    e.preventDefault();
    const pos = this.getMousePos(e);
    this.startDrawing(pos.x, pos.y);
  }
  
  /**
   * Mouse move handler
   */
  handleMouseMove(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    const pos = this.getMousePos(e);
    this.draw(pos.x, pos.y);
  }
  
  /**
   * Mouse up handler
   */
  handleMouseUp(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.stopDrawing();
  }
  
  /**
   * Touch start handler
   */
  handleTouchStart(e) {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    this.startDrawing(pos.x, pos.y);
    
    // Haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  }
  
  /**
   * Touch move handler
   */
  handleTouchMove(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    const pos = this.getTouchPos(e);
    this.draw(pos.x, pos.y);
  }
  
  /**
   * Touch end handler
   */
  handleTouchEnd(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    this.stopDrawing();
  }
  
  /**
   * Start drawing
   */
  startDrawing(x, y) {
    this.isDrawing = true;
    this.isEmpty = false;
    this.lastX = x;
    this.lastY = y;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }
  
  /**
   * Draw line
   */
  draw(x, y) {
    if (!this.isDrawing) return;
    
    this.ctx.strokeStyle = this.options.penColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    this.lastX = x;
    this.lastY = y;
  }
  
  /**
   * Stop drawing
   */
  stopDrawing() {
    this.isDrawing = false;
    this.ctx.closePath();
  }
  
  /**
   * Clear the signature pad
   */
  clear() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.isEmpty = true;
  }
  
  /**
   * Check if the pad is empty
   */
  getIsEmpty() {
    return this.isEmpty;
  }
  
  /**
   * Convert signature to data URL (base64 PNG)
   */
  toDataURL(type = 'image/png', quality = 1.0) {
    return this.canvas.toDataURL(type, quality);
  }
  
  /**
   * Convert signature to blob
   */
  toBlob(callback, type = 'image/png', quality = 1.0) {
    this.canvas.toBlob(callback, type, quality);
  }
  
  /**
   * Load signature from data URL
   */
  fromDataURL(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.clear();
        this.ctx.drawImage(img, 0, 0);
        this.isEmpty = false;
        resolve();
      };
      img.onerror = reject;
      img.src = dataURL;
    });
  }
  
  /**
   * Destroy the signature pad
   */
  destroy() {
    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('resize', this.handleResize);
  }
}

/**
 * Signature Capture Modal Component
 * Creates a full-screen signature capture interface
 */
class SignatureCaptureModal {
  constructor(options = {}) {
    this.options = {
      title: options.title || 'Sign Document',
      message: options.message || 'Please sign below',
      onSave: options.onSave || (() => {}),
      onCancel: options.onCancel || (() => {}),
      ...options
    };
    
    this.signaturePad = null;
    this.modal = null;
  }
  
  /**
   * Show the signature capture modal
   */
  show() {
    // Create modal HTML
    this.modal = document.createElement('div');
    this.modal.className = 'signature-modal-backdrop';
    this.modal.innerHTML = `
      <div class="signature-modal">
        <div class="signature-modal-header">
          <h3 class="signature-modal-title">${this.options.title}</h3>
          <button class="btn btn-icon btn-ghost signature-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="signature-modal-body">
          <p class="signature-modal-message">${this.options.message}</p>
          <div class="signature-canvas-container">
            <canvas id="signature-canvas" class="signature-canvas"></canvas>
          </div>
          <div class="signature-modal-hint">
            Sign with your finger or mouse
          </div>
        </div>
        <div class="signature-modal-footer">
          <button class="btn btn-secondary signature-clear-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear
          </button>
          <div style="flex: 1;"></div>
          <button class="btn btn-ghost signature-cancel-btn">Cancel</button>
          <button class="btn btn-primary signature-save-btn">Save Signature</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Initialize signature pad
    const canvas = document.getElementById('signature-canvas');
    this.signaturePad = new SignaturePad(canvas, {
      penColor: '#000000',
      lineWidth: 2,
      backgroundColor: '#ffffff'
    });
    
    // Bind event listeners
    this.bindEvents();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    // Close button
    const closeBtn = this.modal.querySelector('.signature-modal-close');
    closeBtn.addEventListener('click', () => this.cancel());
    
    // Cancel button
    const cancelBtn = this.modal.querySelector('.signature-cancel-btn');
    cancelBtn.addEventListener('click', () => this.cancel());
    
    // Clear button
    const clearBtn = this.modal.querySelector('.signature-clear-btn');
    clearBtn.addEventListener('click', () => this.clear());
    
    // Save button
    const saveBtn = this.modal.querySelector('.signature-save-btn');
    saveBtn.addEventListener('click', () => this.save());
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.cancel();
      }
    });
  }
  
  /**
   * Clear the signature
   */
  clear() {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }
  
  /**
   * Save the signature
   */
  async save() {
    if (this.signaturePad.getIsEmpty()) {
      if (window.showToast) {
        showToast('Please provide a signature', 'warning');
      } else {
        alert('Please provide a signature');
      }
      return;
    }
    
    const signatureData = this.signaturePad.toDataURL();
    
    // Call the onSave callback
    try {
      await this.options.onSave(signatureData);
      this.close();
    } catch (error) {
      console.error('Error saving signature:', error);
      if (window.showToast) {
        showToast('Error saving signature', 'error');
      } else {
        alert('Error saving signature');
      }
    }
  }
  
  /**
   * Cancel and close the modal
   */
  cancel() {
    this.options.onCancel();
    this.close();
  }
  
  /**
   * Close the modal
   */
  close() {
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Destroy signature pad
    if (this.signaturePad) {
      this.signaturePad.destroy();
    }
    
    // Remove modal from DOM
    if (this.modal) {
      this.modal.remove();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SignaturePad, SignatureCaptureModal };
}
