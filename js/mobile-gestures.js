/**
 * Mobile Gestures & Touch Interactions
 * Validates: Requirements 22.1
 * 
 * Provides mobile-specific gestures including:
 * - Pull-to-refresh
 * - Swipe gestures for navigation
 * - Touch feedback
 * - Haptic feedback (where supported)
 */

class MobileGestures {
  constructor() {
    this.startY = 0;
    this.startX = 0;
    this.currentY = 0;
    this.currentX = 0;
    this.isPulling = false;
    this.isSwiping = false;
    this.swipeThreshold = 50; // pixels
    this.pullThreshold = 80; // pixels for refresh
    
    this.init();
  }

  init() {
    if (this.isMobileDevice()) {
      this.initPullToRefresh();
      this.initSwipeNavigation();
      this.initTouchFeedback();
      console.log('📱 Mobile gestures initialized');
    }
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024);
  }

  /**
   * Pull-to-Refresh Implementation
   */
  initPullToRefresh() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let pullIndicator = document.querySelector('.pull-to-refresh');
    if (!pullIndicator) {
      pullIndicator = document.createElement('div');
      pullIndicator.className = 'pull-to-refresh';
      pullIndicator.innerHTML = `
        <div class="pull-to-refresh-spinner">
          <svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" 
                    stroke-dasharray="32" stroke-dashoffset="32" opacity="0.3"/>
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="var(--color-brand-500)" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <span class="pull-to-refresh-text">Pull to refresh</span>
        </div>
      `;
      mainContent.insertBefore(pullIndicator, mainContent.firstChild);
    }

    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      if (mainContent.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0 && mainContent.scrollTop === 0) {
        e.preventDefault();
        
        const maxPull = 120;
        const normalizedPull = Math.min(pullDistance, maxPull);
        const pullProgress = normalizedPull / maxPull;

        pullIndicator.style.transform = `translateY(${normalizedPull}px)`;
        pullIndicator.style.opacity = pullProgress;

        const spinner = pullIndicator.querySelector('.animate-spin circle');
        if (spinner) {
          spinner.style.strokeDashoffset = 32 - (32 * pullProgress);
        }

        if (normalizedPull >= this.pullThreshold) {
          pullIndicator.classList.add('pulling');
          pullIndicator.querySelector('.pull-to-refresh-text').textContent = 'Release to refresh';
          this.triggerHaptic('light');
        } else {
          pullIndicator.classList.remove('pulling');
          pullIndicator.querySelector('.pull-to-refresh-text').textContent = 'Pull to refresh';
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (!isPulling) return;

      const currentY = e.changedTouches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance >= this.pullThreshold) {
        this.performRefresh(pullIndicator);
      } else {
        this.resetPullIndicator(pullIndicator);
      }

      isPulling = false;
    };

    mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainContent.addEventListener('touchmove', handleTouchMove, { passive: false });
    mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  async performRefresh(indicator) {
    indicator.classList.add('refreshing');
    indicator.querySelector('.pull-to-refresh-text').textContent = 'Refreshing...';
    
    this.triggerHaptic('medium');

    // Dispatch custom refresh event
    const refreshEvent = new CustomEvent('app:refresh', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(refreshEvent);

    // Simulate refresh (in real app, this would reload data)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show success briefly
    indicator.querySelector('.pull-to-refresh-text').textContent = '✓ Updated';
    await new Promise(resolve => setTimeout(resolve, 500));

    this.resetPullIndicator(indicator);
  }

  resetPullIndicator(indicator) {
    indicator.style.transform = 'translateY(-100%)';
    indicator.style.opacity = '0';
    indicator.classList.remove('pulling', 'refreshing');
    indicator.querySelector('.pull-to-refresh-text').textContent = 'Pull to refresh';
    
    const spinner = indicator.querySelector('.animate-spin circle');
    if (spinner) {
      spinner.style.strokeDashoffset = '32';
    }
  }

  /**
   * Swipe Navigation
   */
  initSwipeNavigation() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleSwipeStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
    };

    const handleSwipeMove = (e) => {
      if (!isSwiping) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Detect if it's a horizontal swipe (not vertical scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
        // Horizontal swipe detected
        if (deltaX > 0) {
          // Swipe right - go back
          this.handleSwipeRight();
        } else {
          // Swipe left - go forward (if applicable)
          this.handleSwipeLeft();
        }
        isSwiping = false;
      }
    };

    const handleSwipeEnd = () => {
      isSwiping = false;
    };

    mainContent.addEventListener('touchstart', handleSwipeStart, { passive: true });
    mainContent.addEventListener('touchmove', handleSwipeMove, { passive: true });
    mainContent.addEventListener('touchend', handleSwipeEnd, { passive: true });
  }

  handleSwipeRight() {
    // Go back in navigation history
    const backButton = document.querySelector('[data-action="back"]');
    if (backButton) {
      this.triggerHaptic('light');
      backButton.click();
    }
  }

  handleSwipeLeft() {
    // Can be used for forward navigation or showing menu
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
      this.triggerHaptic('light');
      // Optional: show sidebar or additional menu
    }
  }

  /**
   * Touch Feedback - Visual and Haptic
   */
  initTouchFeedback() {
    // Add ripple effect to buttons on touch
    document.addEventListener('touchstart', (e) => {
      const button = e.target.closest('button, .btn, .nav-item');
      if (button && !button.classList.contains('no-ripple')) {
        this.createRipple(button, e);
        this.triggerHaptic('light');
      }
    }, { passive: true });

    // Add active state feedback
    document.addEventListener('touchstart', (e) => {
      const interactive = e.target.closest('button, .btn, a, .nav-item, .card[data-clickable]');
      if (interactive) {
        interactive.classList.add('touch-active');
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const interactive = e.target.closest('button, .btn, a, .nav-item, .card[data-clickable]');
      if (interactive) {
        setTimeout(() => interactive.classList.remove('touch-active'), 150);
      }
    }, { passive: true });
  }

  createRipple(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.touches[0].clientX - rect.left - size / 2;
    const y = event.touches[0].clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');

    const oldRipple = element.querySelector('.ripple');
    if (oldRipple) {
      oldRipple.remove();
    }

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  /**
   * Haptic Feedback (iOS Safari & Android Chrome support)
   */
  triggerHaptic(style = 'light') {
    // Vibration API
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        error: [10, 50, 10, 50, 10]
      };
      navigator.vibrate(patterns[style] || patterns.light);
    }

    // iOS Haptic Feedback (if available via webkit)
    if (window.webkit?.messageHandlers?.haptic) {
      window.webkit.messageHandlers.haptic.postMessage(style);
    }
  }

  /**
   * Detect and handle orientation changes
   */
  initOrientationHandler() {
    window.addEventListener('orientationchange', () => {
      const orientation = window.orientation === 0 || window.orientation === 180 ? 'portrait' : 'landscape';
      document.body.classList.remove('portrait', 'landscape');
      document.body.classList.add(orientation);

      // Dispatch orientation change event
      window.dispatchEvent(new CustomEvent('app:orientation-change', {
        detail: { orientation }
      }));

      console.log(`📱 Orientation changed to: ${orientation}`);
    });
  }

  /**
   * Prevent zoom on double-tap (iOS)
   */
  preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  /**
   * Install PWA prompt for mobile
   */
  initPWAInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom install button
      const installBtn = document.querySelector('.pwa-install-btn');
      if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`📱 PWA install outcome: ${outcome}`);
            deferredPrompt = null;
            installBtn.style.display = 'none';
          }
        });
      }
    });
  }
}

// Initialize mobile gestures when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileGestures = new MobileGestures();
  });
} else {
  window.mobileGestures = new MobileGestures();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileGestures;
}
