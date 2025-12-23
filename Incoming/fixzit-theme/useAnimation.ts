/**
 * Fixzit Design System - React Animation Hooks & Utilities
 * Based on Ejar.sa (Saudi Government Platforms Code)
 * 
 * @author Sultan Al Hassni
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AnimationName =
  | 'fadeIn' | 'fadeOut' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'slideInUp' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
  | 'scaleIn' | 'scaleOut' | 'zoomIn' | 'zoomOut' | 'popIn' | 'popOut'
  | 'bounceIn' | 'bounceOut' | 'bounceInUp' | 'bounceInDown'
  | 'pulse' | 'heartbeat' | 'ping'
  | 'shake' | 'wiggle' | 'wobble' | 'jello' | 'rubberBand' | 'tada'
  | 'spin' | 'rotateIn' | 'flip' | 'flipX' | 'flipY'
  | 'modalIn' | 'modalOut' | 'dropdownIn' | 'dropdownOut'
  | 'toastIn' | 'toastOut'
  | 'float' | 'levitate'
  | 'revealUp' | 'revealDown' | 'revealLeft' | 'revealRight';

export type EasingFunction =
  | 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'bounce' | 'spring' | 'smooth' | 'snappy' | 'overshoot' | 'anticipate';

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  onStart?: () => void;
  onEnd?: () => void;
}

export interface UseAnimationReturn {
  ref: React.RefObject<HTMLElement>;
  style: CSSProperties;
  isAnimating: boolean;
  play: (animation?: AnimationName, options?: AnimationOptions) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

// ============================================
// EASING FUNCTIONS MAP
// ============================================

const EASING_MAP: Record<EasingFunction, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
  overshoot: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  anticipate: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
};

// ============================================
// ANIMATION CLASS MAP
// ============================================

const ANIMATION_CLASS_MAP: Record<AnimationName, string> = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  fadeInLeft: 'animate-fade-in-left',
  fadeInRight: 'animate-fade-in-right',
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  zoomIn: 'animate-zoom-in',
  zoomOut: 'animate-zoom-out',
  popIn: 'animate-pop-in',
  popOut: 'animate-pop-out',
  bounceIn: 'animate-bounce-in',
  bounceOut: 'animate-bounce-out',
  bounceInUp: 'animate-bounce-in-up',
  bounceInDown: 'animate-bounce-in-down',
  pulse: 'animate-pulse',
  heartbeat: 'animate-heartbeat',
  ping: 'animate-ping',
  shake: 'animate-shake',
  wiggle: 'animate-wiggle',
  wobble: 'animate-wobble',
  jello: 'animate-jello',
  rubberBand: 'animate-rubber-band',
  tada: 'animate-tada',
  spin: 'animate-spin',
  rotateIn: 'animate-rotate-in',
  flip: 'animate-flip',
  flipX: 'animate-flip-x',
  flipY: 'animate-flip-y',
  modalIn: 'animate-modal-in',
  modalOut: 'animate-modal-out',
  dropdownIn: 'animate-dropdown-in',
  dropdownOut: 'animate-dropdown-out',
  toastIn: 'animate-toast-in',
  toastOut: 'animate-toast-out',
  float: 'animate-float',
  levitate: 'animate-levitate',
  revealUp: 'animate-reveal-up',
  revealDown: 'animate-reveal-down',
  revealLeft: 'animate-reveal-left',
  revealRight: 'animate-reveal-right',
};

// ============================================
// HOOK: useAnimation
// ============================================

export function useAnimation(
  initialAnimation?: AnimationName,
  options?: AnimationOptions
): UseAnimationReturn {
  const ref = useRef<HTMLElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationName | undefined>(initialAnimation);
  const [animationStyle, setAnimationStyle] = useState<CSSProperties>({});

  const getAnimationStyle = useCallback((
    animation: AnimationName,
    opts: AnimationOptions = {}
  ): CSSProperties => {
    const {
      duration = 300,
      delay = 0,
      easing = 'ease-out',
      fillMode = 'forwards',
      iterationCount = 1,
      direction = 'normal',
    } = { ...options, ...opts };

    return {
      animationDuration: `${duration}ms`,
      animationDelay: `${delay}ms`,
      animationTimingFunction: EASING_MAP[easing],
      animationFillMode: fillMode,
      animationIterationCount: iterationCount,
      animationDirection: direction,
    };
  }, [options]);

  const play = useCallback((
    animation: AnimationName = currentAnimation!,
    opts?: AnimationOptions
  ) => {
    if (!animation) return;

    const mergedOpts = { ...options, ...opts };
    
    setCurrentAnimation(animation);
    setAnimationStyle(getAnimationStyle(animation, mergedOpts));
    setIsAnimating(true);
    
    mergedOpts.onStart?.();

    // Add animation class
    if (ref.current) {
      ref.current.classList.add(ANIMATION_CLASS_MAP[animation]);
    }
  }, [currentAnimation, options, getAnimationStyle]);

  const pause = useCallback(() => {
    if (ref.current) {
      ref.current.style.animationPlayState = 'paused';
    }
  }, []);

  const resume = useCallback(() => {
    if (ref.current) {
      ref.current.style.animationPlayState = 'running';
    }
  }, []);

  const reset = useCallback(() => {
    if (ref.current && currentAnimation) {
      ref.current.classList.remove(ANIMATION_CLASS_MAP[currentAnimation]);
    }
    setIsAnimating(false);
    setAnimationStyle({});
  }, [currentAnimation]);

  // Handle animation end
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleAnimationEnd = () => {
      setIsAnimating(false);
      options?.onEnd?.();
    };

    element.addEventListener('animationend', handleAnimationEnd);
    return () => element.removeEventListener('animationend', handleAnimationEnd);
  }, [options]);

  return {
    ref: ref as React.RefObject<HTMLElement>,
    style: animationStyle,
    isAnimating,
    play,
    pause,
    resume,
    reset,
  };
}

// ============================================
// HOOK: useAnimateOnMount
// ============================================

export function useAnimateOnMount(
  animation: AnimationName,
  options?: AnimationOptions
) {
  const { ref, style, isAnimating, play } = useAnimation(animation, options);

  useEffect(() => {
    play();
  }, []);

  return { ref, style, isAnimating };
}

// ============================================
// HOOK: useAnimateOnScroll (Intersection Observer)
// ============================================

export interface UseAnimateOnScrollOptions extends AnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useAnimateOnScroll(
  animation: AnimationName,
  options?: UseAnimateOnScrollOptions
) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    ...animationOptions
  } = options || {};

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (triggerOnce && hasAnimated) return;
          setIsVisible(true);
          setHasAnimated(true);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasAnimated]);

  const className = isVisible ? ANIMATION_CLASS_MAP[animation] : 'opacity-0';

  return { ref, isVisible, className };
}

// ============================================
// HOOK: useStaggerAnimation
// ============================================

export interface UseStaggerAnimationOptions extends AnimationOptions {
  staggerDelay?: number;
  startDelay?: number;
}

export function useStaggerAnimation(
  itemCount: number,
  animation: AnimationName,
  options?: UseStaggerAnimationOptions
) {
  const {
    staggerDelay = 100,
    startDelay = 0,
    ...animationOptions
  } = options || {};

  const getItemDelay = (index: number) => startDelay + (index * staggerDelay);
  
  const getItemClassName = (index: number) => ANIMATION_CLASS_MAP[animation];
  
  const getItemStyle = (index: number): CSSProperties => ({
    animationDelay: `${getItemDelay(index)}ms`,
    ...animationOptions,
  });

  return {
    getItemDelay,
    getItemClassName,
    getItemStyle,
  };
}

// ============================================
// HOOK: useHoverAnimation
// ============================================

export function useHoverAnimation(
  animation: AnimationName,
  options?: AnimationOptions
) {
  const [isHovered, setIsHovered] = useState(false);
  const { ref, style, isAnimating, play, reset } = useAnimation(animation, options);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    play();
  }, [play]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    reset();
  }, [reset]);

  return {
    ref,
    style,
    isHovered,
    isAnimating,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

// ============================================
// HOOK: useReducedMotion
// ============================================

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

// ============================================
// HOOK: useTransition
// ============================================

export interface UseTransitionOptions {
  duration?: number;
  easing?: EasingFunction;
  property?: string;
}

export function useTransition(options?: UseTransitionOptions) {
  const {
    duration = 200,
    easing = 'ease-out',
    property = 'all',
  } = options || {};

  const style: CSSProperties = {
    transitionProperty: property,
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: EASING_MAP[easing],
  };

  return { style };
}

// ============================================
// UTILITY: cn (className merge helper)
// ============================================

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// ANIMATION PRESETS
// ============================================

export const animationPresets = {
  // Page transitions
  pageEnter: { animation: 'fadeInUp' as AnimationName, duration: 400, easing: 'smooth' as EasingFunction },
  pageExit: { animation: 'fadeOut' as AnimationName, duration: 200, easing: 'ease-in' as EasingFunction },

  // Modal
  modalOpen: { animation: 'modalIn' as AnimationName, duration: 300, easing: 'spring' as EasingFunction },
  modalClose: { animation: 'modalOut' as AnimationName, duration: 200, easing: 'ease-in' as EasingFunction },

  // Dropdown
  dropdownOpen: { animation: 'dropdownIn' as AnimationName, duration: 200, easing: 'ease-out' as EasingFunction },
  dropdownClose: { animation: 'dropdownOut' as AnimationName, duration: 150, easing: 'ease-in' as EasingFunction },

  // Toast
  toastEnter: { animation: 'toastIn' as AnimationName, duration: 300, easing: 'bounce' as EasingFunction },
  toastExit: { animation: 'toastOut' as AnimationName, duration: 200, easing: 'ease-in' as EasingFunction },

  // Cards
  cardHover: { animation: 'scaleIn' as AnimationName, duration: 200, easing: 'ease-out' as EasingFunction },
  cardReveal: { animation: 'fadeInUp' as AnimationName, duration: 500, easing: 'smooth' as EasingFunction },

  // Buttons
  buttonClick: { animation: 'scaleIn' as AnimationName, duration: 150, easing: 'bounce' as EasingFunction },
  buttonSuccess: { animation: 'bounceIn' as AnimationName, duration: 400, easing: 'spring' as EasingFunction },
  buttonError: { animation: 'shake' as AnimationName, duration: 500, easing: 'ease-in-out' as EasingFunction },

  // List items
  listItemEnter: { animation: 'slideInLeft' as AnimationName, duration: 300, easing: 'smooth' as EasingFunction },
  listItemExit: { animation: 'slideInRight' as AnimationName, duration: 200, easing: 'ease-in' as EasingFunction },

  // Attention
  attention: { animation: 'tada' as AnimationName, duration: 1000, easing: 'ease-in-out' as EasingFunction },
  error: { animation: 'shake' as AnimationName, duration: 500, easing: 'ease-in-out' as EasingFunction },
  success: { animation: 'bounceIn' as AnimationName, duration: 600, easing: 'spring' as EasingFunction },
} as const;

// ============================================
// EXPORT ALL
// ============================================

export default {
  useAnimation,
  useAnimateOnMount,
  useAnimateOnScroll,
  useStaggerAnimation,
  useHoverAnimation,
  useReducedMotion,
  useTransition,
  cn,
  animationPresets,
  ANIMATION_CLASS_MAP,
  EASING_MAP,
};
