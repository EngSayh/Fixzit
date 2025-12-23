/**
 * Fixzit Design System - Animations Configuration
 * Based on Ejar.sa (Saudi Government Platforms Code)
 * 
 * Add these to your tailwind.config.ts under theme.extend
 * 
 * @author Sultan Al Hassni
 * @version 1.0.0
 */

// ============================================
// KEYFRAMES DEFINITIONS
// ============================================

export const keyframes = {
  // ----------------------------------------
  // FADE ANIMATIONS
  // ----------------------------------------
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  fadeInUp: {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInDown: {
    '0%': { opacity: '0', transform: 'translateY(-20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInLeft: {
    '0%': { opacity: '0', transform: 'translateX(-20px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  fadeInRight: {
    '0%': { opacity: '0', transform: 'translateX(20px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  fadeOutUp: {
    '0%': { opacity: '1', transform: 'translateY(0)' },
    '100%': { opacity: '0', transform: 'translateY(-20px)' },
  },
  fadeOutDown: {
    '0%': { opacity: '1', transform: 'translateY(0)' },
    '100%': { opacity: '0', transform: 'translateY(20px)' },
  },

  // ----------------------------------------
  // SLIDE ANIMATIONS
  // ----------------------------------------
  slideInUp: {
    '0%': { transform: 'translateY(100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideInDown: {
    '0%': { transform: 'translateY(-100%)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideInLeft: {
    '0%': { transform: 'translateX(-100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  slideInRight: {
    '0%': { transform: 'translateX(100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  slideOutUp: {
    '0%': { transform: 'translateY(0)', opacity: '1' },
    '100%': { transform: 'translateY(-100%)', opacity: '0' },
  },
  slideOutDown: {
    '0%': { transform: 'translateY(0)', opacity: '1' },
    '100%': { transform: 'translateY(100%)', opacity: '0' },
  },
  slideOutLeft: {
    '0%': { transform: 'translateX(0)', opacity: '1' },
    '100%': { transform: 'translateX(-100%)', opacity: '0' },
  },
  slideOutRight: {
    '0%': { transform: 'translateX(0)', opacity: '1' },
    '100%': { transform: 'translateX(100%)', opacity: '0' },
  },

  // ----------------------------------------
  // SCALE ANIMATIONS
  // ----------------------------------------
  scaleIn: {
    '0%': { transform: 'scale(0.9)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  scaleOut: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '100%': { transform: 'scale(0.9)', opacity: '0' },
  },
  scaleInCenter: {
    '0%': { transform: 'scale(0)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  scaleOutCenter: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '100%': { transform: 'scale(0)', opacity: '0' },
  },
  zoomIn: {
    '0%': { transform: 'scale(0.5)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  zoomOut: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '100%': { transform: 'scale(0.5)', opacity: '0' },
  },

  // ----------------------------------------
  // BOUNCE ANIMATIONS
  // ----------------------------------------
  bounce: {
    '0%, 100%': { transform: 'translateY(-5%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
    '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
  },
  bounceIn: {
    '0%': { transform: 'scale(0.3)', opacity: '0' },
    '50%': { transform: 'scale(1.05)' },
    '70%': { transform: 'scale(0.9)' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  bounceOut: {
    '0%': { transform: 'scale(1)', opacity: '1' },
    '25%': { transform: 'scale(0.95)' },
    '50%': { transform: 'scale(1.1)', opacity: '0.7' },
    '100%': { transform: 'scale(0.3)', opacity: '0' },
  },
  bounceInUp: {
    '0%': { transform: 'translateY(100%) scale(0.9)', opacity: '0' },
    '60%': { transform: 'translateY(-10%) scale(1.02)', opacity: '1' },
    '80%': { transform: 'translateY(5%)' },
    '100%': { transform: 'translateY(0) scale(1)' },
  },
  bounceInDown: {
    '0%': { transform: 'translateY(-100%) scale(0.9)', opacity: '0' },
    '60%': { transform: 'translateY(10%) scale(1.02)', opacity: '1' },
    '80%': { transform: 'translateY(-5%)' },
    '100%': { transform: 'translateY(0) scale(1)' },
  },

  // ----------------------------------------
  // PULSE & HEARTBEAT
  // ----------------------------------------
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  pulseSoft: {
    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
    '50%': { opacity: '0.8', transform: 'scale(0.98)' },
  },
  heartbeat: {
    '0%': { transform: 'scale(1)' },
    '14%': { transform: 'scale(1.1)' },
    '28%': { transform: 'scale(1)' },
    '42%': { transform: 'scale(1.1)' },
    '70%': { transform: 'scale(1)' },
  },
  ping: {
    '75%, 100%': { transform: 'scale(2)', opacity: '0' },
  },

  // ----------------------------------------
  // SHAKE & WIGGLE
  // ----------------------------------------
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
  },
  shakeX: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-5px)' },
    '50%': { transform: 'translateX(5px)' },
    '75%': { transform: 'translateX(-5px)' },
  },
  shakeY: {
    '0%, 100%': { transform: 'translateY(0)' },
    '25%': { transform: 'translateY(-5px)' },
    '50%': { transform: 'translateY(5px)' },
    '75%': { transform: 'translateY(-5px)' },
  },
  wiggle: {
    '0%, 100%': { transform: 'rotate(-3deg)' },
    '50%': { transform: 'rotate(3deg)' },
  },
  jello: {
    '0%, 100%': { transform: 'skewX(0deg) skewY(0deg)' },
    '11.1%': { transform: 'skewX(-12.5deg) skewY(-12.5deg)' },
    '22.2%': { transform: 'skewX(6.25deg) skewY(6.25deg)' },
    '33.3%': { transform: 'skewX(-3.125deg) skewY(-3.125deg)' },
    '44.4%': { transform: 'skewX(1.5625deg) skewY(1.5625deg)' },
    '55.5%': { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' },
    '66.6%': { transform: 'skewX(0.390625deg) skewY(0.390625deg)' },
    '77.7%': { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' },
  },

  // ----------------------------------------
  // ROTATE ANIMATIONS
  // ----------------------------------------
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  spinReverse: {
    '0%': { transform: 'rotate(360deg)' },
    '100%': { transform: 'rotate(0deg)' },
  },
  rotateIn: {
    '0%': { transform: 'rotate(-200deg)', opacity: '0' },
    '100%': { transform: 'rotate(0deg)', opacity: '1' },
  },
  rotateOut: {
    '0%': { transform: 'rotate(0deg)', opacity: '1' },
    '100%': { transform: 'rotate(200deg)', opacity: '0' },
  },
  flip: {
    '0%': { transform: 'perspective(400px) rotateY(0)' },
    '100%': { transform: 'perspective(400px) rotateY(360deg)' },
  },
  flipX: {
    '0%': { transform: 'perspective(400px) rotateX(90deg)', opacity: '0' },
    '40%': { transform: 'perspective(400px) rotateX(-10deg)' },
    '70%': { transform: 'perspective(400px) rotateX(10deg)' },
    '100%': { transform: 'perspective(400px) rotateX(0deg)', opacity: '1' },
  },
  flipY: {
    '0%': { transform: 'perspective(400px) rotateY(90deg)', opacity: '0' },
    '40%': { transform: 'perspective(400px) rotateY(-10deg)' },
    '70%': { transform: 'perspective(400px) rotateY(10deg)' },
    '100%': { transform: 'perspective(400px) rotateY(0deg)', opacity: '1' },
  },

  // ----------------------------------------
  // LOADING ANIMATIONS
  // ----------------------------------------
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  skeleton: {
    '0%': { backgroundColor: 'hsl(220, 17%, 93%)' },
    '100%': { backgroundColor: 'hsl(220, 17%, 88%)' },
  },
  progress: {
    '0%': { width: '0%' },
    '100%': { width: '100%' },
  },
  progressIndeterminate: {
    '0%': { left: '-35%', right: '100%' },
    '60%': { left: '100%', right: '-90%' },
    '100%': { left: '100%', right: '-90%' },
  },
  dotPulse: {
    '0%, 80%, 100%': { transform: 'scale(0)' },
    '40%': { transform: 'scale(1)' },
  },
  spinnerGrow: {
    '0%': { transform: 'scale(0)', opacity: '0' },
    '50%': { opacity: '1' },
    '100%': { transform: 'scale(1)', opacity: '0' },
  },

  // ----------------------------------------
  // ATTENTION SEEKERS
  // ----------------------------------------
  flash: {
    '0%, 50%, 100%': { opacity: '1' },
    '25%, 75%': { opacity: '0' },
  },
  rubberBand: {
    '0%': { transform: 'scaleX(1)' },
    '30%': { transform: 'scaleX(1.25) scaleY(0.75)' },
    '40%': { transform: 'scaleX(0.75) scaleY(1.25)' },
    '50%': { transform: 'scaleX(1.15) scaleY(0.85)' },
    '65%': { transform: 'scaleX(0.95) scaleY(1.05)' },
    '75%': { transform: 'scaleX(1.05) scaleY(0.95)' },
    '100%': { transform: 'scaleX(1)' },
  },
  tada: {
    '0%': { transform: 'scale(1) rotate(0deg)' },
    '10%, 20%': { transform: 'scale(0.9) rotate(-3deg)' },
    '30%, 50%, 70%, 90%': { transform: 'scale(1.1) rotate(3deg)' },
    '40%, 60%, 80%': { transform: 'scale(1.1) rotate(-3deg)' },
    '100%': { transform: 'scale(1) rotate(0deg)' },
  },
  swing: {
    '20%': { transform: 'rotate(15deg)' },
    '40%': { transform: 'rotate(-10deg)' },
    '60%': { transform: 'rotate(5deg)' },
    '80%': { transform: 'rotate(-5deg)' },
    '100%': { transform: 'rotate(0deg)' },
  },
  headShake: {
    '0%': { transform: 'translateX(0)' },
    '6.5%': { transform: 'translateX(-6px) rotateY(-9deg)' },
    '18.5%': { transform: 'translateX(5px) rotateY(7deg)' },
    '31.5%': { transform: 'translateX(-3px) rotateY(-5deg)' },
    '43.5%': { transform: 'translateX(2px) rotateY(3deg)' },
    '50%': { transform: 'translateX(0)' },
  },

  // ----------------------------------------
  // MODAL & OVERLAY ANIMATIONS
  // ----------------------------------------
  modalIn: {
    '0%': { transform: 'scale(0.95) translateY(10px)', opacity: '0' },
    '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
  },
  modalOut: {
    '0%': { transform: 'scale(1) translateY(0)', opacity: '1' },
    '100%': { transform: 'scale(0.95) translateY(10px)', opacity: '0' },
  },
  overlayIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  overlayOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  drawerInRight: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  drawerOutRight: {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(100%)' },
  },
  drawerInLeft: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  drawerOutLeft: {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-100%)' },
  },
  dropdownIn: {
    '0%': { transform: 'scaleY(0.8) translateY(-5px)', opacity: '0', transformOrigin: 'top' },
    '100%': { transform: 'scaleY(1) translateY(0)', opacity: '1', transformOrigin: 'top' },
  },
  dropdownOut: {
    '0%': { transform: 'scaleY(1) translateY(0)', opacity: '1', transformOrigin: 'top' },
    '100%': { transform: 'scaleY(0.8) translateY(-5px)', opacity: '0', transformOrigin: 'top' },
  },

  // ----------------------------------------
  // TOAST & NOTIFICATION ANIMATIONS
  // ----------------------------------------
  toastSlideIn: {
    '0%': { transform: 'translateX(100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  toastSlideOut: {
    '0%': { transform: 'translateX(0)', opacity: '1' },
    '100%': { transform: 'translateX(100%)', opacity: '0' },
  },
  toastSlideInRTL: {
    '0%': { transform: 'translateX(-100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  toastSlideOutRTL: {
    '0%': { transform: 'translateX(0)', opacity: '1' },
    '100%': { transform: 'translateX(-100%)', opacity: '0' },
  },
  notificationBounce: {
    '0%': { transform: 'translateY(-100%) scale(0.9)', opacity: '0' },
    '50%': { transform: 'translateY(10%) scale(1.02)' },
    '70%': { transform: 'translateY(-5%)' },
    '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
  },

  // ----------------------------------------
  // ACCORDION & COLLAPSE
  // ----------------------------------------
  accordionOpen: {
    '0%': { height: '0', opacity: '0' },
    '100%': { height: 'var(--accordion-height)', opacity: '1' },
  },
  accordionClose: {
    '0%': { height: 'var(--accordion-height)', opacity: '1' },
    '100%': { height: '0', opacity: '0' },
  },
  collapseIn: {
    '0%': { height: '0', overflow: 'hidden' },
    '100%': { height: 'var(--collapse-height)' },
  },
  collapseOut: {
    '0%': { height: 'var(--collapse-height)' },
    '100%': { height: '0', overflow: 'hidden' },
  },

  // ----------------------------------------
  // COUNTER & NUMBER ANIMATIONS
  // ----------------------------------------
  countUp: {
    '0%': { '--num': '0' },
    '100%': { '--num': 'var(--target)' },
  },

  // ----------------------------------------
  // FLOAT & LEVITATE
  // ----------------------------------------
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  floatShadow: {
    '0%, 100%': { transform: 'translateY(0)', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)' },
    '50%': { transform: 'translateY(-10px)', boxShadow: '0 15px 25px rgba(0, 0, 0, 0.15)' },
  },
  levitate: {
    '0%': { transform: 'translateY(0) rotate(0deg)' },
    '25%': { transform: 'translateY(-5px) rotate(1deg)' },
    '50%': { transform: 'translateY(-10px) rotate(0deg)' },
    '75%': { transform: 'translateY(-5px) rotate(-1deg)' },
    '100%': { transform: 'translateY(0) rotate(0deg)' },
  },

  // ----------------------------------------
  // BACKGROUND ANIMATIONS
  // ----------------------------------------
  gradientShift: {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  bgPulse: {
    '0%, 100%': { backgroundColor: 'var(--color-bg-start)' },
    '50%': { backgroundColor: 'var(--color-bg-end)' },
  },

  // ----------------------------------------
  // SCROLL REVEAL
  // ----------------------------------------
  scrollRevealUp: {
    '0%': { transform: 'translateY(60px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  scrollRevealDown: {
    '0%': { transform: 'translateY(-60px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  scrollRevealLeft: {
    '0%': { transform: 'translateX(-60px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  scrollRevealRight: {
    '0%': { transform: 'translateX(60px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  scrollRevealScale: {
    '0%': { transform: 'scale(0.8)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },

  // ----------------------------------------
  // TYPING ANIMATION
  // ----------------------------------------
  typing: {
    '0%': { width: '0' },
    '100%': { width: '100%' },
  },
  blink: {
    '0%, 100%': { borderColor: 'transparent' },
    '50%': { borderColor: 'currentColor' },
  },
  cursor: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0' },
  },
} as const;

// ============================================
// ANIMATION DEFINITIONS
// ============================================

export const animation = {
  // Fade
  'fade-in': 'fadeIn 300ms ease-out forwards',
  'fade-out': 'fadeOut 200ms ease-in forwards',
  'fade-in-up': 'fadeInUp 400ms ease-out forwards',
  'fade-in-down': 'fadeInDown 400ms ease-out forwards',
  'fade-in-left': 'fadeInLeft 400ms ease-out forwards',
  'fade-in-right': 'fadeInRight 400ms ease-out forwards',
  'fade-out-up': 'fadeOutUp 300ms ease-in forwards',
  'fade-out-down': 'fadeOutDown 300ms ease-in forwards',

  // Slide
  'slide-in-up': 'slideInUp 300ms ease-out forwards',
  'slide-in-down': 'slideInDown 300ms ease-out forwards',
  'slide-in-left': 'slideInLeft 300ms ease-out forwards',
  'slide-in-right': 'slideInRight 300ms ease-out forwards',
  'slide-out-up': 'slideOutUp 200ms ease-in forwards',
  'slide-out-down': 'slideOutDown 200ms ease-in forwards',
  'slide-out-left': 'slideOutLeft 200ms ease-in forwards',
  'slide-out-right': 'slideOutRight 200ms ease-in forwards',

  // Scale
  'scale-in': 'scaleIn 200ms ease-out forwards',
  'scale-out': 'scaleOut 150ms ease-in forwards',
  'scale-in-center': 'scaleInCenter 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  'scale-out-center': 'scaleOutCenter 200ms ease-in forwards',
  'zoom-in': 'zoomIn 300ms ease-out forwards',
  'zoom-out': 'zoomOut 200ms ease-in forwards',

  // Bounce
  'bounce': 'bounce 1s infinite',
  'bounce-in': 'bounceIn 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
  'bounce-out': 'bounceOut 400ms ease-in forwards',
  'bounce-in-up': 'bounceInUp 600ms ease-out forwards',
  'bounce-in-down': 'bounceInDown 600ms ease-out forwards',

  // Pulse & Heartbeat
  'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
  'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
  'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',

  // Shake & Wiggle
  'shake': 'shake 500ms ease-in-out',
  'shake-x': 'shakeX 400ms ease-in-out',
  'shake-y': 'shakeY 400ms ease-in-out',
  'wiggle': 'wiggle 200ms ease-in-out infinite',
  'jello': 'jello 1s ease-in-out',

  // Rotate
  'spin': 'spin 1s linear infinite',
  'spin-slow': 'spin 3s linear infinite',
  'spin-fast': 'spin 500ms linear infinite',
  'spin-reverse': 'spinReverse 1s linear infinite',
  'rotate-in': 'rotateIn 400ms ease-out forwards',
  'rotate-out': 'rotateOut 300ms ease-in forwards',
  'flip': 'flip 1s ease-in-out',
  'flip-x': 'flipX 600ms ease-out forwards',
  'flip-y': 'flipY 600ms ease-out forwards',

  // Loading
  'shimmer': 'shimmer 2s linear infinite',
  'skeleton': 'skeleton 1.5s ease-in-out infinite alternate',
  'progress': 'progress 2s ease-out forwards',
  'progress-indeterminate': 'progressIndeterminate 1.5s infinite',
  'dot-pulse': 'dotPulse 1.4s infinite ease-in-out both',
  'spinner-grow': 'spinnerGrow 1s linear infinite',

  // Attention
  'flash': 'flash 1s ease-in-out',
  'rubber-band': 'rubberBand 1s ease-in-out',
  'tada': 'tada 1s ease-in-out',
  'swing': 'swing 1s ease-in-out',
  'head-shake': 'headShake 1s ease-in-out',

  // Modal & Overlay
  'modal-in': 'modalIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  'modal-out': 'modalOut 200ms ease-in forwards',
  'overlay-in': 'overlayIn 200ms ease-out forwards',
  'overlay-out': 'overlayOut 150ms ease-in forwards',
  'drawer-in-right': 'drawerInRight 300ms ease-out forwards',
  'drawer-out-right': 'drawerOutRight 200ms ease-in forwards',
  'drawer-in-left': 'drawerInLeft 300ms ease-out forwards',
  'drawer-out-left': 'drawerOutLeft 200ms ease-in forwards',
  'dropdown-in': 'dropdownIn 200ms ease-out forwards',
  'dropdown-out': 'dropdownOut 150ms ease-in forwards',

  // Toast & Notification
  'toast-in': 'toastSlideIn 300ms ease-out forwards',
  'toast-out': 'toastSlideOut 200ms ease-in forwards',
  'toast-in-rtl': 'toastSlideInRTL 300ms ease-out forwards',
  'toast-out-rtl': 'toastSlideOutRTL 200ms ease-in forwards',
  'notification-bounce': 'notificationBounce 500ms ease-out forwards',

  // Accordion
  'accordion-open': 'accordionOpen 300ms ease-out forwards',
  'accordion-close': 'accordionClose 200ms ease-in forwards',
  'collapse-in': 'collapseIn 300ms ease-out forwards',
  'collapse-out': 'collapseOut 200ms ease-in forwards',

  // Float
  'float': 'float 3s ease-in-out infinite',
  'float-shadow': 'floatShadow 3s ease-in-out infinite',
  'levitate': 'levitate 4s ease-in-out infinite',

  // Background
  'gradient-shift': 'gradientShift 4s ease infinite',
  'bg-pulse': 'bgPulse 2s ease-in-out infinite',

  // Scroll Reveal
  'reveal-up': 'scrollRevealUp 600ms ease-out forwards',
  'reveal-down': 'scrollRevealDown 600ms ease-out forwards',
  'reveal-left': 'scrollRevealLeft 600ms ease-out forwards',
  'reveal-right': 'scrollRevealRight 600ms ease-out forwards',
  'reveal-scale': 'scrollRevealScale 600ms ease-out forwards',

  // Typing
  'typing': 'typing 2s steps(20) forwards',
  'blink': 'blink 1s step-end infinite',
  'cursor': 'cursor 1s ease-in-out infinite',

  // None (for disabling)
  'none': 'none',
} as const;

// ============================================
// ANIMATION DELAYS (for stagger effects)
// ============================================

export const animationDelay = {
  '0': '0ms',
  '75': '75ms',
  '100': '100ms',
  '150': '150ms',
  '200': '200ms',
  '300': '300ms',
  '400': '400ms',
  '500': '500ms',
  '600': '600ms',
  '700': '700ms',
  '800': '800ms',
  '900': '900ms',
  '1000': '1000ms',
} as const;

// ============================================
// ANIMATION DURATIONS
// ============================================

export const animationDuration = {
  '75': '75ms',
  '100': '100ms',
  '150': '150ms',
  '200': '200ms',
  '300': '300ms',
  '400': '400ms',
  '500': '500ms',
  '600': '600ms',
  '700': '700ms',
  '800': '800ms',
  '1000': '1000ms',
  '1500': '1500ms',
  '2000': '2000ms',
  '3000': '3000ms',
} as const;

// ============================================
// TRANSITION TIMING FUNCTIONS
// ============================================

export const transitionTimingFunction = {
  'ease': 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'linear': 'linear',
  // Custom curves
  'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'gentle': 'cubic-bezier(0.4, 0, 0.6, 1)',
  'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',
  'overshoot': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  'anticipate': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
} as const;

// ============================================
// EXPORT FOR TAILWIND CONFIG
// ============================================

export const animationsConfig = {
  keyframes,
  animation,
  animationDelay,
  animationDuration,
  transitionTimingFunction,
};

export default animationsConfig;
