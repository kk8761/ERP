/**
 * MOBILE RESPONSIVE INTERFACE TESTS
 * Validates: Requirements 22.1 - Responsive web interface for mobile browsers
 * 
 * Test Coverage:
 * - Responsive breakpoints
 * - Touch-friendly controls (44px minimum)
 * - Mobile navigation patterns
 * - Form input sizing (16px to prevent zoom)
 * - Swipe gestures
 * - Pull-to-refresh
 * - Touch ripple effects
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Load CSS and HTML
const cssPath = path.join(__dirname, '../css/mobile-responsive.css');
const mobileCSS = fs.readFileSync(cssPath, 'utf8');

describe('Mobile Responsive Interface - Requirements 22.1', () => {
  
  describe('CSS Breakpoints', () => {
    test('should define mobile breakpoints', () => {
      expect(mobileCSS).toContain('--breakpoint-xs: 320px');
      expect(mobileCSS).toContain('--breakpoint-sm: 640px');
      expect(mobileCSS).toContain('--breakpoint-md: 768px');
      expect(mobileCSS).toContain('--breakpoint-lg: 1024px');
    });

    test('should define mobile-specific spacing variables', () => {
      expect(mobileCSS).toContain('--mobile-padding: 16px');
      expect(mobileCSS).toContain('--mobile-gap: 12px');
      expect(mobileCSS).toContain('--mobile-header-height: 56px');
      expect(mobileCSS).toContain('--mobile-nav-height: 60px');
    });

    test('should define minimum touch target size', () => {
      expect(mobileCSS).toContain('--mobile-touch-target: 44px');
    });
  });

  describe('Touch-Friendly Controls - 44px Minimum', () => {
    test('should set button min-height to 44px on mobile', () => {
      expect(mobileCSS).toMatch(/min-height:\s*var\(--mobile-touch-target\)/);
    });

    test('should set form inputs min-height to 44px on mobile', () => {
      const hasFormInputHeight = mobileCSS.includes('min-height: var(--mobile-touch-target)') &&
                                 mobileCSS.includes('.form-input');
      expect(hasFormInputHeight).toBe(true);
    });

    test('should set larger padding for buttons on mobile', () => {
      const buttonMobileStyles = mobileCSS.match(/@media \(max-width: 1024px\)[\s\S]*?button[\s\S]*?padding:\s*12px 20px/);
      expect(buttonMobileStyles).toBeTruthy();
    });

    test('should set form input font-size to 16px to prevent iOS zoom', () => {
      const formInputFontSize = mobileCSS.match(/\.form-input[\s\S]*?font-size:\s*16px[\s\S]*?\/\*[^*]*Prevents zoom on iOS[^*]*\*\//);
      expect(formInputFontSize).toBeTruthy();
    });
  });

  describe('Mobile Navigation Pattern', () => {
    test('should convert sidebar to bottom navigation on mobile', () => {
      expect(mobileCSS).toMatch(/.sidebar[\s\S]*?bottom: 0/);
      expect(mobileCSS).toMatch(/.sidebar[\s\S]*?top: auto/);
    });

    test('should set mobile nav height', () => {
      const navHeight = mobileCSS.match(/.sidebar[\s\S]*?height:\s*var\(--mobile-nav-height\)/);
      expect(navHeight).toBeTruthy();
    });

    test('should hide sidebar logo on mobile', () => {
      expect(mobileCSS).toContain('.sidebar-logo,');
      expect(mobileCSS).toContain('display: none !important');
    });

    test('should make navigation horizontal on mobile', () => {
      const horizontalNav = mobileCSS.match(/.sidebar-nav[\s\S]*?flex-direction: row/);
      expect(horizontalNav).toBeTruthy();
    });
  });

  describe('Responsive Grid Layouts', () => {
    test('should force single column on mobile', () => {
      const singleColumn = mobileCSS.match(/\.grid-cols-[234][\s\S]*?grid-template-columns:\s*1fr\s*!important/);
      expect(singleColumn).toBeTruthy();
    });

    test('should have 2-column layout for tablets', () => {
      const tabletLayout = mobileCSS.match(/@media \(min-width: 640px\) and \(max-width: 1024px\)[\s\S]*?grid-template-columns:\s*repeat\(2,\s*1fr\)/);
      expect(tabletLayout).toBeTruthy();
    });

    test('should reduce card padding on mobile', () => {
      const cardPadding = mobileCSS.match(/\.card[\s\S]*?padding:\s*var\(--mobile-padding\)/);
      expect(cardPadding).toBeTruthy();
    });
  });

  describe('Mobile Table Patterns', () => {
    test('should hide table headers on mobile', () => {
      expect(mobileCSS).toContain('.data-table-mobile-cards thead');
      expect(mobileCSS).toContain('display: none');
    });

    test('should convert table rows to blocks on mobile', () => {
      const blockRows = mobileCSS.match(/\.data-table-mobile-cards tr[\s\S]*?display:\s*block/);
      expect(blockRows).toBeTruthy();
    });

    test('should add data-label pseudo-element for mobile table cells', () => {
      const dataLabel = mobileCSS.match(/\.data-table-mobile-cards td::before[\s\S]*?content:\s*attr\(data-label\)/);
      expect(dataLabel).toBeTruthy();
    });

    test('should support horizontal scroll for tables', () => {
      expect(mobileCSS).toContain('.table-responsive');
      expect(mobileCSS).toContain('overflow-x: auto');
    });
  });

  describe('Mobile Modal Patterns', () => {
    test('should make modals full-screen on mobile', () => {
      const fullScreen = mobileCSS.match(/\.modal[\s\S]*?width:\s*100%/);
      expect(fullScreen).toBeTruthy();
    });

    test('should have slide-up animation for mobile modals', () => {
      expect(mobileCSS).toContain('@keyframes modal-slide-up');
      expect(mobileCSS).toContain('translateY(100%)');
      expect(mobileCSS).toContain('translateY(0)');
    });

    test('should support bottom sheet pattern', () => {
      expect(mobileCSS).toContain('.bottom-sheet');
      expect(mobileCSS).toContain('bottom: 0');
      expect(mobileCSS).toContain('@keyframes sheet-slide-up');
    });
  });

  describe('Touch Gesture Support', () => {
    test('should prevent tap highlight on mobile', () => {
      expect(mobileCSS).toContain('-webkit-tap-highlight-color');
      expect(mobileCSS).toContain('rgba(99, 102, 241, 0.1)');
    });

    test('should enable touch scrolling', () => {
      expect(mobileCSS).toContain('-webkit-overflow-scrolling: touch');
    });

    test('should optimize text rendering for mobile', () => {
      expect(mobileCSS).toContain('-webkit-text-size-adjust: 100%');
      expect(mobileCSS).toContain('text-size-adjust: 100%');
    });

    test('should prevent horizontal scroll', () => {
      const preventScroll = mobileCSS.match(/overflow-x:\s*hidden/);
      expect(preventScroll).toBeTruthy();
    });
  });

  describe('Mobile-Specific UI Elements', () => {
    test('should define FAB (Floating Action Button)', () => {
      expect(mobileCSS).toContain('.fab');
      expect(mobileCSS).toContain('position: fixed');
      expect(mobileCSS).toContain('border-radius: 50%');
    });

    test('should support swipeable list items', () => {
      expect(mobileCSS).toContain('.swipeable-item');
      expect(mobileCSS).toContain('.swipeable-actions');
    });

    test('should support pull-to-refresh', () => {
      expect(mobileCSS).toContain('.pull-to-refresh');
      expect(mobileCSS).toContain('transform: translateY(-100%)');
    });

    test('should position toasts above mobile nav', () => {
      const toastPosition = mobileCSS.match(/\.toast-container[\s\S]*?bottom:\s*calc\(var\(--mobile-nav-height\)/);
      expect(toastPosition).toBeTruthy();
    });
  });

  describe('Landscape Orientation', () => {
    test('should reduce heights in landscape mode', () => {
      const landscape = mobileCSS.match(/@media \(max-width: 1024px\) and \(orientation: landscape\)[\s\S]*?--mobile-header-height:\s*48px/);
      expect(landscape).toBeTruthy();
    });

    test('should increase columns in landscape', () => {
      const landscapeColumns = mobileCSS.match(/orientation: landscape\)[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)/);
      expect(landscapeColumns).toBeTruthy();
    });
  });

  describe('PWA Safe Area Support', () => {
    test('should handle safe area insets for PWA', () => {
      expect(mobileCSS).toContain('@media (display-mode: standalone)');
      expect(mobileCSS).toContain('env(safe-area-inset-top)');
      expect(mobileCSS).toContain('env(safe-area-inset-bottom)');
    });

    test('should adjust header for notch devices', () => {
      const notchSupport = mobileCSS.match(/padding-top:\s*calc\(var\(--mobile-padding\) \+ env\(safe-area-inset-top\)\)/);
      expect(notchSupport).toBeTruthy();
    });
  });

  describe('Accessibility on Mobile', () => {
    test('should have prominent focus indicators', () => {
      const focusIndicator = mobileCSS.match(/button:focus-visible[\s\S]*?outline:\s*3px solid/);
      expect(focusIndicator).toBeTruthy();
    });

    test('should support skip-to-content link', () => {
      expect(mobileCSS).toContain('.skip-to-content');
    });

    test('should respect reduced motion preference', () => {
      expect(mobileCSS).toContain('@media (prefers-reduced-motion: reduce)');
      expect(mobileCSS).toContain('animation-duration: 0.01ms !important');
    });
  });

  describe('Utility Classes', () => {
    test('should provide mobile visibility classes', () => {
      expect(mobileCSS).toContain('.mobile-only');
      expect(mobileCSS).toContain('.desktop-only');
      expect(mobileCSS).toContain('.mobile-hidden');
    });

    test('should provide mobile spacing utilities', () => {
      expect(mobileCSS).toContain('.mobile-p-0');
      expect(mobileCSS).toContain('.mobile-mt-4');
      expect(mobileCSS).toContain('.mobile-mb-2');
    });

    test('should provide mobile text utilities', () => {
      expect(mobileCSS).toContain('.mobile-text-sm');
      expect(mobileCSS).toContain('.mobile-text-center');
    });
  });

  describe('Performance Optimizations', () => {
    test('should use GPU acceleration', () => {
      expect(mobileCSS).toContain('transform: translateZ(0)');
      expect(mobileCSS).toContain('-webkit-transform: translateZ(0)');
    });

    test('should use will-change for animations', () => {
      expect(mobileCSS).toContain('will-change: transform');
    });

    test('should reduce animations on low-end devices', () => {
      const reducedMotion = mobileCSS.match(/@media \(prefers-reduced-motion: reduce\)/);
      expect(reducedMotion).toBeTruthy();
    });
  });
});

describe('Mobile Gesture JavaScript Module', () => {
  let jsContent;

  beforeAll(() => {
    const jsPath = path.join(__dirname, '../js/mobile-gestures.js');
    jsContent = fs.readFileSync(jsPath, 'utf8');
  });

  test('should define TouchGestureDetector class', () => {
    expect(jsContent).toContain('class TouchGestureDetector');
  });

  test('should define PullToRefresh class', () => {
    expect(jsContent).toContain('class PullToRefresh');
  });

  test('should define TapHoldDetector class', () => {
    expect(jsContent).toContain('class TapHoldDetector');
  });

  test('should define MobileNavigation class', () => {
    expect(jsContent).toContain('class MobileNavigation');
  });

  test('should add ripple effect function', () => {
    expect(jsContent).toContain('function addRippleEffect');
    expect(jsContent).toContain('.touch-ripple');
  });

  test('should handle swipe gestures', () => {
    expect(jsContent).toContain('onSwipeLeft');
    expect(jsContent).toContain('onSwipeRight');
    expect(jsContent).toContain('onSwipeUp');
    expect(jsContent).toContain('onSwipeDown');
  });

  test('should support haptic feedback', () => {
    expect(jsContent).toContain('navigator.vibrate');
  });

  test('should handle orientation changes', () => {
    expect(jsContent).toContain('orientationchange');
  });

  test('should prevent rubber band scrolling', () => {
    expect(jsContent).toContain('preventOverscroll');
  });

  test('should handle safe area insets', () => {
    expect(jsContent).toContain('handleSafeAreaInsets');
    expect(jsContent).toContain('safe-area-inset');
  });
});

describe('Mobile Demo Page', () => {
  let demoHTML;

  beforeAll(() => {
    const demoPath = path.join(__dirname, '../mobile-demo.html');
    demoHTML = fs.readFileSync(demoPath, 'utf8');
  });

  test('should include mobile-responsive CSS', () => {
    expect(demoHTML).toContain('mobile-responsive.css');
  });

  test('should include mobile gestures JS', () => {
    expect(demoHTML).toContain('mobile-gestures.js');
  });

  test('should have viewport meta tag', () => {
    expect(demoHTML).toContain('<meta name="viewport"');
    expect(demoHTML).toContain('width=device-width, initial-scale=1.0');
  });

  test('should demonstrate touch-friendly buttons', () => {
    expect(demoHTML).toContain('Touch-Friendly Buttons');
    expect(demoHTML).toContain('44px touch targets');
  });

  test('should demonstrate responsive grid', () => {
    expect(demoHTML).toContain('Responsive Grid');
    expect(demoHTML).toContain('grid-cols-4');
  });

  test('should demonstrate mobile table patterns', () => {
    expect(demoHTML).toContain('data-table-mobile-cards');
    expect(demoHTML).toContain('data-label=');
  });

  test('should show device information', () => {
    expect(demoHTML).toContain('Device Information');
    expect(demoHTML).toContain('screen-width');
    expect(demoHTML).toContain('touch-support');
  });

  test('should validate requirements reference', () => {
    expect(demoHTML).toContain('Validates: Requirements 22.1');
  });
});

describe('Integration with Dashboard', () => {
  let dashboardHTML;

  beforeAll(() => {
    const dashboardPath = path.join(__dirname, '../dashboard.html');
    dashboardHTML = fs.readFileSync(dashboardPath, 'utf8');
  });

  test('should include mobile-responsive CSS', () => {
    expect(dashboardHTML).toContain('mobile-responsive.css');
  });

  test('should include mobile-gestures JS', () => {
    expect(dashboardHTML).toContain('mobile-gestures.js');
  });

  test('should have proper viewport meta tag', () => {
    expect(dashboardHTML).toContain('width=device-width, initial-scale=1.0');
  });

  test('should have PWA meta tags', () => {
    expect(dashboardHTML).toContain('mobile-web-app-capable');
    expect(dashboardHTML).toContain('apple-mobile-web-app-capable');
  });

  test('should load mobile gestures before other scripts', () => {
    const mobileGesturesIndex = dashboardHTML.indexOf('mobile-gestures.js');
    const dashboardJsIndex = dashboardHTML.indexOf('dashboard.js');
    expect(mobileGesturesIndex).toBeLessThan(dashboardJsIndex);
  });
});

describe('Requirements Validation', () => {
  test('Requirement 22.1.1: Responsive web interface for mobile browsers', () => {
    // Validated by CSS breakpoints and media queries
    expect(mobileCSS).toMatch(/@media \(max-width: 1024px\)/);
    expect(mobileCSS).toMatch(/@media \(max-width: 768px\)/);
  });

  test('Requirement 22.1.2: Touch-friendly controls (44px minimum)', () => {
    // Validated by touch target sizing
    expect(mobileCSS).toContain('--mobile-touch-target: 44px');
    expect(mobileCSS).toMatch(/min-height:\s*var\(--mobile-touch-target\)/);
  });

  test('Requirement 22.1.3: Optimized layouts for small screens', () => {
    // Validated by responsive grid and mobile navigation
    expect(mobileCSS).toContain('grid-template-columns: 1fr !important');
    expect(mobileCSS).toContain('flex-direction: column');
  });

  test('Requirement 22.1.4: Mobile navigation patterns', () => {
    // Validated by bottom navigation and mobile menu
    expect(mobileCSS).toContain('bottom: 0');
    expect(mobileCSS).toContain('.mobile-menu-toggle');
  });

  test('Overall Requirements 22.1: Complete mobile responsiveness', () => {
    // All sub-requirements validated
    const hasBreakpoints = mobileCSS.includes('--breakpoint-');
    const hasTouchTargets = mobileCSS.includes('--mobile-touch-target');
    const hasResponsiveLayouts = mobileCSS.includes('grid-template-columns: 1fr');
    const hasMobileNav = mobileCSS.includes('bottom: 0');
    const hasGestures = jsContent.includes('TouchGestureDetector');
    
    expect(hasBreakpoints && hasTouchTargets && hasResponsiveLayouts && 
           hasMobileNav && hasGestures).toBe(true);
  });
});
