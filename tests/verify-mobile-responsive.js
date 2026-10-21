/**
 * Manual Verification Script for Mobile Responsive Implementation
 * Validates: Requirements 22.1
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Mobile Responsive Implementation...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, assertion) {
  try {
    if (assertion) {
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${name} - ${error.message}`);
    testsFailed++;
  }
}

// Load files
const cssPath = path.join(__dirname, '../css/mobile-responsive.css');
const jsPath = path.join(__dirname, '../js/mobile-gestures.js');
const demoPath = path.join(__dirname, '../mobile-demo.html');
const dashboardPath = path.join(__dirname, '../dashboard.html');
const indexPath = path.join(__dirname, '../index.html');

const mobileCSS = fs.readFileSync(cssPath, 'utf8');
const mobileJS = fs.readFileSync(jsPath, 'utf8');
const demoHTML = fs.readFileSync(demoPath, 'utf8');
const dashboardHTML = fs.readFileSync(dashboardPath, 'utf8');
const indexHTML = fs.readFileSync(indexPath, 'utf8');

console.log('📋 Testing Requirements 22.1: Responsive Web Interface\n');

// Test 1: CSS Breakpoints
console.log('1️⃣  CSS Breakpoints');
test('Defines mobile breakpoints (320px, 640px, 768px, 1024px)', 
  mobileCSS.includes('--breakpoint-xs: 320px') &&
  mobileCSS.includes('--breakpoint-sm: 640px') &&
  mobileCSS.includes('--breakpoint-md: 768px') &&
  mobileCSS.includes('--breakpoint-lg: 1024px')
);

test('Defines mobile-specific spacing variables',
  mobileCSS.includes('--mobile-padding') &&
  mobileCSS.includes('--mobile-gap') &&
  mobileCSS.includes('--mobile-header-height') &&
  mobileCSS.includes('--mobile-nav-height')
);

test('Defines minimum touch target size (44px)',
  mobileCSS.includes('--mobile-touch-target: 44px')
);

// Test 2: Touch-Friendly Controls
console.log('\n2️⃣  Touch-Friendly Controls (44px minimum)');
test('Sets button min-height to touch target size on mobile',
  mobileCSS.includes('min-height: var(--mobile-touch-target)')
);

test('Sets form inputs to 16px font-size to prevent iOS zoom',
  mobileCSS.includes('font-size: 16px') &&
  mobileCSS.includes('Prevents zoom on iOS')
);

test('Increases button padding on mobile (12px 20px)',
  mobileCSS.match(/@media \(max-width: 1024px\)[\s\S]*?padding:\s*12px 20px/)
);

test('Makes form inputs larger on mobile',
  mobileCSS.includes('padding: 12px 16px')
);

// Test 3: Mobile Navigation
console.log('\n3️⃣  Mobile Navigation Patterns');
test('Converts sidebar to bottom navigation on mobile',
  mobileCSS.includes('bottom: 0') &&
  mobileCSS.includes('top: auto')
);

test('Hides desktop sidebar elements on mobile',
  mobileCSS.includes('.sidebar-logo,') &&
  mobileCSS.includes('display: none !important')
);

test('Makes navigation horizontal on mobile',
  mobileCSS.match(/\.sidebar-nav[\s\S]*?flex-direction: row/)
);

test('Positions nav at bottom with proper height',
  mobileCSS.includes('height: var(--mobile-nav-height)')
);

// Test 4: Responsive Layouts
console.log('\n4️⃣  Responsive Layouts');
test('Forces single column grid on mobile',
  mobileCSS.match(/grid-template-columns:\s*1fr\s*!important/)
);

test('Provides 2-column layout for tablets',
  mobileCSS.match(/@media \(min-width: 640px\) and \(max-width: 1024px\)/)
);

test('Reduces card padding on mobile',
  mobileCSS.match(/\.card[\s\S]*?padding:\s*var\(--mobile-padding\)/)
);

test('Adjusts content layout for mobile',
  mobileCSS.includes('.main-content') &&
  mobileCSS.includes('padding-bottom: calc(var(--mobile-nav-height)')
);

// Test 5: Mobile Tables
console.log('\n5️⃣  Mobile Table Responsiveness');
test('Hides table headers on mobile',
  mobileCSS.includes('.data-table-mobile-cards thead') &&
  mobileCSS.includes('display: none')
);

test('Converts table rows to cards',
  mobileCSS.match(/\.data-table-mobile-cards tr[\s\S]*?display:\s*block/)
);

test('Adds data-label pseudo-element',
  mobileCSS.match(/\.data-table-mobile-cards td::before[\s\S]*?content:\s*attr\(data-label\)/)
);

test('Supports horizontal scroll for tables',
  mobileCSS.includes('.table-responsive') &&
  mobileCSS.includes('overflow-x: auto')
);

// Test 6: Touch Gestures
console.log('\n6️⃣  Touch Gesture Support');
test('Prevents tap highlight on mobile',
  mobileCSS.includes('-webkit-tap-highlight-color')
);

test('Enables touch scrolling',
  mobileCSS.includes('-webkit-overflow-scrolling: touch')
);

test('Optimizes text rendering',
  mobileCSS.includes('-webkit-text-size-adjust: 100%')
);

test('Prevents horizontal scroll',
  mobileCSS.includes('overflow-x: hidden')
);

// Test 7: JavaScript Gesture Classes
console.log('\n7️⃣  JavaScript Gesture Classes');
test('Defines TouchGestureDetector class',
  mobileJS.includes('class TouchGestureDetector')
);

test('Defines PullToRefresh class',
  mobileJS.includes('class PullToRefresh')
);

test('Defines TapHoldDetector class',
  mobileJS.includes('class TapHoldDetector')
);

test('Defines MobileNavigation class',
  mobileJS.includes('class MobileNavigation')
);

test('Implements swipe gesture detection',
  mobileJS.includes('onSwipeLeft') &&
  mobileJS.includes('onSwipeRight') &&
  mobileJS.includes('onSwipeUp') &&
  mobileJS.includes('onSwipeDown')
);

test('Adds ripple effect function',
  mobileJS.includes('function addRippleEffect') &&
  mobileJS.includes('.touch-ripple')
);

test('Supports haptic feedback',
  mobileJS.includes('navigator.vibrate')
);

test('Handles orientation changes',
  mobileJS.includes('orientationchange')
);

// Test 8: Mobile-Specific UI
console.log('\n8️⃣  Mobile-Specific UI Elements');
test('Defines FAB (Floating Action Button)',
  mobileCSS.includes('.fab') &&
  mobileCSS.includes('border-radius: 50%')
);

test('Supports swipeable list items',
  mobileCSS.includes('.swipeable-item') &&
  mobileCSS.includes('.swipeable-actions')
);

test('Supports pull-to-refresh',
  mobileCSS.includes('.pull-to-refresh')
);

test('Positions toasts above mobile nav',
  mobileCSS.match(/\.toast-container[\s\S]*?bottom:\s*calc\(var\(--mobile-nav-height\)/)
);

// Test 9: PWA Support
console.log('\n9️⃣  PWA & Safe Area Support');
test('Handles safe area insets',
  mobileCSS.includes('@media (display-mode: standalone)') &&
  mobileCSS.includes('env(safe-area-inset-top)')
);

test('Adjusts header for notched devices',
  mobileCSS.match(/padding-top:\s*calc\(var\(--mobile-padding\) \+ env\(safe-area-inset-top\)\)/)
);

test('Adjusts bottom nav for home indicator',
  mobileCSS.includes('env(safe-area-inset-bottom)')
);

// Test 10: Accessibility
console.log('\n🔟 Mobile Accessibility');
test('Has prominent focus indicators (3px outline)',
  mobileCSS.match(/focus-visible[\s\S]*?outline:\s*3px solid/)
);

test('Supports skip-to-content link',
  mobileCSS.includes('.skip-to-content')
);

test('Respects reduced motion preference',
  mobileCSS.includes('@media (prefers-reduced-motion: reduce)')
);

// Test 11: Demo Page
console.log('\n1️⃣1️⃣  Mobile Demo Page');
test('Includes mobile-responsive CSS',
  demoHTML.includes('mobile-responsive.css')
);

test('Includes mobile gestures JS',
  demoHTML.includes('mobile-gestures.js')
);

test('Has viewport meta tag',
  demoHTML.includes('width=device-width, initial-scale=1.0')
);

test('Demonstrates touch-friendly buttons',
  demoHTML.includes('Touch-Friendly Buttons')
);

test('Demonstrates responsive grid',
  demoHTML.includes('Responsive Grid')
);

test('References requirements',
  demoHTML.includes('Validates: Requirements 22.1')
);

// Test 12: Dashboard Integration
console.log('\n1️⃣2️⃣  Dashboard Integration');
test('Dashboard includes mobile-responsive CSS',
  dashboardHTML.includes('mobile-responsive.css')
);

test('Dashboard includes mobile-gestures JS',
  dashboardHTML.includes('mobile-gestures.js')
);

test('Dashboard has proper viewport meta',
  dashboardHTML.includes('width=device-width, initial-scale=1.0')
);

test('Dashboard has PWA meta tags',
  dashboardHTML.includes('mobile-web-app-capable') &&
  dashboardHTML.includes('apple-mobile-web-app-capable')
);

// Test 13: Index Page Integration
console.log('\n1️⃣3️⃣  Index Page Integration');
test('Index includes mobile-responsive CSS',
  indexHTML.includes('mobile-responsive.css')
);

test('Index has viewport meta tag',
  indexHTML.includes('width=device-width, initial-scale=1.0')
);

// Test 14: Landscape Mode
console.log('\n1️⃣4️⃣  Landscape Orientation');
test('Reduces heights in landscape mode',
  mobileCSS.match(/@media \(max-width: 1024px\) and \(orientation: landscape\)/)
);

test('Increases columns in landscape',
  mobileCSS.match(/orientation: landscape\)[\s\S]*?grid-template-columns:\s*repeat\(3/)
);

// Test 15: Utility Classes
console.log('\n1️⃣5️⃣  Utility Classes');
test('Provides mobile visibility classes',
  mobileCSS.includes('.mobile-only') &&
  mobileCSS.includes('.desktop-only') &&
  mobileCSS.includes('.mobile-hidden')
);

test('Provides mobile spacing utilities',
  mobileCSS.includes('.mobile-p-0') &&
  mobileCSS.includes('.mobile-mt-4') &&
  mobileCSS.includes('.mobile-mb-2')
);

test('Provides mobile text utilities',
  mobileCSS.includes('.mobile-text-sm') &&
  mobileCSS.includes('.mobile-text-center')
);

// Test 16: Performance
console.log('\n1️⃣6️⃣  Performance Optimizations');
test('Uses GPU acceleration',
  mobileCSS.includes('transform: translateZ(0)') &&
  mobileCSS.includes('-webkit-transform: translateZ(0)')
);

test('Uses will-change for animations',
  mobileCSS.includes('will-change: transform')
);

test('Reduces animations on low-end devices',
  mobileCSS.includes('animation-duration: 0.01ms !important')
);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Mobile responsive implementation is complete.');
  console.log('\n✅ Requirements 22.1 validated:');
  console.log('   • Responsive web interface for mobile browsers');
  console.log('   • Touch-friendly controls (44px minimum)');
  console.log('   • Optimized layouts for small screens');
  console.log('   • Mobile navigation patterns');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
