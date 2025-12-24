# Fixzit Design System - Animation Reference

> Complete animation system with 80+ animations for Next.js 14 + Tailwind CSS

---

## 📦 Files

| File | Purpose |
|------|---------|
| `animations.css` | Ready-to-use CSS animation classes |
| `animations.config.ts` | Tailwind keyframes & animation config |
| `useAnimation.ts` | React hooks for programmatic control |

---

## 🚀 Quick Start

### 1. Import CSS (in globals.css or layout)
```css
@import './animations.css';
```

### 2. Use Classes Directly
```tsx
<div className="animate-fade-in-up">
  Content fades in from below
</div>
```

### 3. Or Use React Hooks
```tsx
import { useAnimateOnMount } from '@/lib/useAnimation';

function Component() {
  const { ref, style } = useAnimateOnMount('fadeInUp', { duration: 400 });
  return <div ref={ref} style={style}>Animated!</div>;
}
```

---

## 🎬 Animation Classes

### Fade Animations
| Class | Description |
|-------|-------------|
| `animate-fade-in` | Fade in |
| `animate-fade-out` | Fade out |
| `animate-fade-in-up` | Fade in + slide up |
| `animate-fade-in-down` | Fade in + slide down |
| `animate-fade-in-left` | Fade in + slide left |
| `animate-fade-in-right` | Fade in + slide right |
| `animate-fade-out-up` | Fade out + slide up |
| `animate-fade-out-down` | Fade out + slide down |
| `animate-fade-in-scale` | Fade in + scale |

### Slide Animations
| Class | Description |
|-------|-------------|
| `animate-slide-in-up` | Slide in from bottom |
| `animate-slide-in-down` | Slide in from top |
| `animate-slide-in-left` | Slide in from left |
| `animate-slide-in-right` | Slide in from right |
| `animate-slide-out-up` | Slide out to top |
| `animate-slide-out-down` | Slide out to bottom |
| `animate-slide-out-left` | Slide out to left |
| `animate-slide-out-right` | Slide out to right |

### Scale Animations
| Class | Description |
|-------|-------------|
| `animate-scale-in` | Scale up + fade in |
| `animate-scale-out` | Scale down + fade out |
| `animate-scale-in-center` | Scale from center |
| `animate-zoom-in` | Zoom in effect |
| `animate-zoom-out` | Zoom out effect |
| `animate-pop-in` | Pop in with overshoot |
| `animate-pop-out` | Pop out effect |

### Bounce Animations
| Class | Description |
|-------|-------------|
| `animate-bounce` | Continuous bounce |
| `animate-bounce-in` | Bounce entrance |
| `animate-bounce-out` | Bounce exit |
| `animate-bounce-in-up` | Bounce in from bottom |
| `animate-bounce-in-down` | Bounce in from top |
| `animate-bounce-in-left` | Bounce in from left |
| `animate-bounce-in-right` | Bounce in from right |

### Pulse & Heartbeat
| Class | Description |
|-------|-------------|
| `animate-pulse` | Opacity pulse |
| `animate-pulse-soft` | Gentle scale pulse |
| `animate-pulse-ring` | Expanding ring pulse |
| `animate-heartbeat` | Heartbeat effect |
| `animate-ping` | Ping/radar effect |

### Shake & Wiggle
| Class | Description |
|-------|-------------|
| `animate-shake` | Side-to-side shake |
| `animate-shake-x` | Horizontal shake |
| `animate-shake-y` | Vertical shake |
| `animate-wiggle` | Rotation wiggle |
| `animate-wobble` | Wobble effect |
| `animate-jello` | Jelly wobble |

### Rotation & Spin
| Class | Description |
|-------|-------------|
| `animate-spin` | Continuous spin (1s) |
| `animate-spin-slow` | Slow spin (3s) |
| `animate-spin-fast` | Fast spin (500ms) |
| `animate-spin-reverse` | Reverse spin |
| `animate-rotate-in` | Rotate entrance |
| `animate-rotate-out` | Rotate exit |
| `animate-flip` | 3D flip |
| `animate-flip-x` | 3D flip horizontal |
| `animate-flip-y` | 3D flip vertical |

### Loading Animations
| Class | Description |
|-------|-------------|
| `animate-shimmer` | Shimmer/skeleton loading |
| `animate-skeleton` | Skeleton pulse |
| `animate-progress` | Progress bar fill |
| `animate-progress-indeterminate` | Indeterminate progress |
| `animate-dot-pulse` | Pulsing dot |
| `animate-spinner-grow` | Growing spinner |
| `animate-loading-bar` | Loading bar |

### Attention Seekers
| Class | Description |
|-------|-------------|
| `animate-flash` | Flash/blink effect |
| `animate-rubber-band` | Rubber band stretch |
| `animate-tada` | Tada celebration |
| `animate-swing` | Swing motion |
| `animate-head-shake` | Head shake "no" |

### Modal & Overlay
| Class | Description |
|-------|-------------|
| `animate-modal-in` | Modal entrance |
| `animate-modal-out` | Modal exit |
| `animate-overlay-in` | Overlay fade in |
| `animate-overlay-out` | Overlay fade out |
| `animate-drawer-in-right` | Drawer from right |
| `animate-drawer-out-right` | Drawer exit right |
| `animate-drawer-in-left` | Drawer from left |
| `animate-drawer-out-left` | Drawer exit left |
| `animate-dropdown-in` | Dropdown open |
| `animate-dropdown-out` | Dropdown close |

### Toast & Notifications
| Class | Description |
|-------|-------------|
| `animate-toast-in` | Toast slide in (LTR) |
| `animate-toast-out` | Toast slide out (LTR) |
| `animate-toast-in-rtl` | Toast slide in (RTL) |
| `animate-toast-out-rtl` | Toast slide out (RTL) |
| `animate-notification-bounce` | Notification bounce |

### Float & Levitate
| Class | Description |
|-------|-------------|
| `animate-float` | Floating up/down |
| `animate-float-shadow` | Float with shadow |
| `animate-levitate` | Levitate with rotation |

### Scroll Reveal
| Class | Description |
|-------|-------------|
| `animate-reveal-up` | Reveal from bottom |
| `animate-reveal-down` | Reveal from top |
| `animate-reveal-left` | Reveal from left |
| `animate-reveal-right` | Reveal from right |
| `animate-reveal-scale` | Reveal with scale |

### Special Effects
| Class | Description |
|-------|-------------|
| `animate-typing` | Typewriter effect |
| `animate-blink` | Cursor blink |
| `animate-cursor` | Smooth cursor blink |
| `animate-ripple` | Ripple effect |
| `animate-glow` | Glowing effect |
| `animate-glow-pulse` | Pulsing glow |
| `animate-gradient-shift` | Moving gradient |

---

## ⏱️ Animation Modifiers

### Delays
```html
<div className="animate-fade-in delay-200">Delayed by 200ms</div>
```

| Class | Delay |
|-------|-------|
| `delay-0` | 0ms |
| `delay-75` | 75ms |
| `delay-100` | 100ms |
| `delay-150` | 150ms |
| `delay-200` | 200ms |
| `delay-300` | 300ms |
| `delay-500` | 500ms |
| `delay-700` | 700ms |
| `delay-1000` | 1000ms |

### Durations
```html
<div className="animate-fade-in duration-500">Takes 500ms</div>
```

| Class | Duration |
|-------|----------|
| `duration-75` | 75ms |
| `duration-150` | 150ms |
| `duration-200` | 200ms |
| `duration-300` | 300ms |
| `duration-500` | 500ms |
| `duration-700` | 700ms |
| `duration-1000` | 1000ms |

### Fill Modes
| Class | Effect |
|-------|--------|
| `fill-none` | Return to initial state |
| `fill-forwards` | Keep final state |
| `fill-backwards` | Apply initial keyframe during delay |
| `fill-both` | Both forwards and backwards |

### Iteration Count
| Class | Iterations |
|-------|------------|
| `iterate-1` | Once |
| `iterate-2` | Twice |
| `iterate-3` | Three times |
| `iterate-infinite` | Forever |

### Play State
| Class | Effect |
|-------|--------|
| `paused` | Pause animation |
| `running` | Resume animation |

---

## 🎯 Hover Animations

```html
<button className="hover-lift">Lifts on hover</button>
<button className="hover-scale">Scales on hover</button>
<button className="hover-glow">Glows on hover</button>
<button className="hover-bounce">Bounces on hover</button>
<button className="hover-wiggle">Wiggles on hover</button>
<button className="active-scale">Scales down on click</button>
```

---

## ⚛️ React Hooks Usage

### useAnimation - Full Control
```tsx
import { useAnimation } from '@/lib/useAnimation';

function Component() {
  const { ref, style, isAnimating, play, pause, reset } = useAnimation('bounceIn', {
    duration: 500,
    easing: 'spring',
    onEnd: () => console.log('Done!')
  });

  return (
    <div ref={ref} style={style}>
      <button onClick={() => play()}>Play</button>
      <button onClick={() => pause()}>Pause</button>
      <button onClick={() => reset()}>Reset</button>
    </div>
  );
}
```

### useAnimateOnMount - Auto-play on Mount
```tsx
import { useAnimateOnMount } from '@/lib/useAnimation';

function Card() {
  const { ref, style } = useAnimateOnMount('fadeInUp', { 
    duration: 400,
    delay: 100 
  });

  return <div ref={ref} style={style}>Animated on mount!</div>;
}
```

### useAnimateOnScroll - Intersection Observer
```tsx
import { useAnimateOnScroll } from '@/lib/useAnimation';

function Section() {
  const { ref, className } = useAnimateOnScroll('revealUp', {
    threshold: 0.2,
    triggerOnce: true
  });

  return <section ref={ref} className={className}>Reveals on scroll!</section>;
}
```

### useStaggerAnimation - Staggered List Items
```tsx
import { useStaggerAnimation } from '@/lib/useAnimation';

function List({ items }) {
  const { getItemClassName, getItemStyle } = useStaggerAnimation(
    items.length,
    'fadeInUp',
    { staggerDelay: 100, startDelay: 200 }
  );

  return (
    <ul>
      {items.map((item, i) => (
        <li 
          key={i} 
          className={getItemClassName(i)}
          style={getItemStyle(i)}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

### useHoverAnimation - Hover Effects
```tsx
import { useHoverAnimation } from '@/lib/useAnimation';

function Card() {
  const { ref, handlers } = useHoverAnimation('pulse');

  return (
    <div ref={ref} {...handlers}>
      Pulses on hover!
    </div>
  );
}
```

### useReducedMotion - Accessibility
```tsx
import { useReducedMotion } from '@/lib/useAnimation';

function AnimatedComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={reducedMotion ? '' : 'animate-fade-in'}>
      Respects user preferences
    </div>
  );
}
```

---

## 🎨 Animation Presets

```tsx
import { animationPresets } from '@/lib/useAnimation';

// Available presets:
animationPresets.pageEnter      // { animation: 'fadeInUp', duration: 400, easing: 'smooth' }
animationPresets.pageExit       // { animation: 'fadeOut', duration: 200, easing: 'ease-in' }
animationPresets.modalOpen      // { animation: 'modalIn', duration: 300, easing: 'spring' }
animationPresets.modalClose     // { animation: 'modalOut', duration: 200, easing: 'ease-in' }
animationPresets.dropdownOpen   // { animation: 'dropdownIn', duration: 200, easing: 'ease-out' }
animationPresets.dropdownClose  // { animation: 'dropdownOut', duration: 150, easing: 'ease-in' }
animationPresets.toastEnter     // { animation: 'toastIn', duration: 300, easing: 'bounce' }
animationPresets.toastExit      // { animation: 'toastOut', duration: 200, easing: 'ease-in' }
animationPresets.cardHover      // { animation: 'scaleIn', duration: 200, easing: 'ease-out' }
animationPresets.cardReveal     // { animation: 'fadeInUp', duration: 500, easing: 'smooth' }
animationPresets.buttonClick    // { animation: 'scaleIn', duration: 150, easing: 'bounce' }
animationPresets.buttonSuccess  // { animation: 'bounceIn', duration: 400, easing: 'spring' }
animationPresets.buttonError    // { animation: 'shake', duration: 500, easing: 'ease-in-out' }
animationPresets.attention      // { animation: 'tada', duration: 1000, easing: 'ease-in-out' }
animationPresets.error          // { animation: 'shake', duration: 500, easing: 'ease-in-out' }
animationPresets.success        // { animation: 'bounceIn', duration: 600, easing: 'spring' }
```

---

## 🌐 RTL Support

All directional animations automatically flip in RTL:

| LTR Class | RTL Behavior |
|-----------|--------------|
| `animate-slide-in-left` | Slides from right |
| `animate-slide-in-right` | Slides from left |
| `animate-toast-in` | Slides from left |
| `animate-drawer-in-right` | Opens from left |

---

## ♿ Accessibility

The CSS includes `prefers-reduced-motion` support:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Use the hook for programmatic control:

```tsx
const reducedMotion = useReducedMotion();
const className = reducedMotion ? '' : 'animate-fade-in';
```

---

## 📋 CSS Variables

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* Easing */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-overshoot: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

---

## 💡 Best Practices

1. **Use `fill-forwards`** for entrance animations to keep final state
2. **Use short durations** (150-300ms) for micro-interactions
3. **Use longer durations** (400-600ms) for page transitions
4. **Stagger list items** for better visual flow
5. **Respect reduced motion** preferences
6. **Test RTL** for directional animations
7. **Combine with Tailwind transitions** for hover states

---

**Created for Fixzit Platform**  
**Sultan Al Hassni © 2025**
