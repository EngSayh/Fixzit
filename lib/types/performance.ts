/**
 * Performance Optimization Types
 * Types for debounced search, virtualization, caching, and optimistic updates
 */

// Optimistic Updates
export interface OptimisticUpdateConfig<T> {
  entity: T;
  updateFn: (entity: T) => T;
  revertFn: (entity: T) => T;
  serverUpdateFn: (entity: T) => Promise<T>;
  onSuccess?: (entity: T) => void;
  onError?: (error: Error, originalEntity: T) => void;
  timeout?: number;
}

export interface OptimisticUpdateState<T> {
  data: T;
  isOptimistic: boolean;
  isPending: boolean;
  error: Error | null;
  retryCount: number;
  lastUpdate: string;
}

// Caching System
export interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
  maxSize?: number;
  strategy: 'lru' | 'fifo' | 'ttl';
  persistent?: boolean;
  compress?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheState {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  entries: number;
}

// Debounced Operations
export interface DebounceConfig {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
}

// Virtual Scrolling
export interface VirtualScrollConfig {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollToIndex?: number;
  scrollToAlignment?: 'auto' | 'start' | 'center' | 'end';
  estimatedItemSize?: number;
  getItemSize?: (index: number) => number;
}

export interface VirtualScrollState {
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalHeight: number;
  scrollTop: number;
  isScrolling: boolean;
  scrollDirection: 'up' | 'down';
}

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

// Image Optimization
export interface ImageOptimizationConfig {
  lazy?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  priority?: boolean;
  preload?: boolean;
}

export interface ImageState {
  loading: boolean;
  loaded: boolean;
  error: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
}

// Code Splitting and Lazy Loading
export interface LazyComponentConfig {
  fallback?: React.ComponentType;
  delay?: number;
  timeout?: number;
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export interface LazyComponentState {
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  retryCount: number;
}

// Bundle Optimization
export interface BundleAnalysis {
  size: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  chunks: string[];
  dependencies: string[];
  reasons: string[];
}

export interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  modules: string[];
  parents: string[];
  children: string[];
  entry: boolean;
  initial: boolean;
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  gzippedSize: number;
  treeshaken: boolean;
}

// Performance Monitoring
export interface PerformanceMetrics {
  renderTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface ComponentPerformance {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  lastRenderTime: number;
  propChanges: number;
  stateChanges: number;
}

// Optimization Strategies
export interface OptimizationStrategy {
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, any>;
  priority: number;
  conditions?: OptimizationCondition[];
}

export interface OptimizationCondition {
  type: 'device' | 'network' | 'viewport' | 'performance';
  operator: 'equals' | 'greater' | 'less' | 'contains';
  value: any;
}

// Progressive Loading
export interface ProgressiveLoadConfig {
  stages: LoadingStage[];
  fallback?: React.ComponentType;
  skeleton?: React.ComponentType;
  errorBoundary?: React.ComponentType;
}

export interface LoadingStage {
  name: string;
  component: React.ComponentType;
  condition: () => boolean;
  priority: number;
  timeout?: number;
}

// Memory Management
export interface MemoryConfig {
  maxCacheSize: number;
  maxListeners: number;
  cleanupInterval: number;
  gcThreshold: number;
  weakReferences: boolean;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

// Network Optimization
export interface NetworkConfig {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  concurrent: number;
  priority: 'high' | 'normal' | 'low';
  cache: boolean;
  compress: boolean;
}

export interface RequestPriority {
  critical: string[];
  high: string[];
  normal: string[];
  low: string[];
  idle: string[];
}

// Preloading and Prefetching
export interface PreloadConfig {
  routes: string[];
  data: string[];
  assets: string[];
  priority: 'high' | 'low';
  conditions?: PreloadCondition[];
}

export interface PreloadCondition {
  type: 'hover' | 'visible' | 'idle' | 'network' | 'time';
  threshold?: number;
  delay?: number;
}

// Resource Hints
export interface ResourceHint {
  type: 'dns-prefetch' | 'preconnect' | 'modulepreload' | 'preload' | 'prefetch';
  href: string;
  as?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  media?: string;
}

// Service Worker Configuration
export interface ServiceWorkerConfig {
  enabled: boolean;
  scope: string;
  updateOnReload: boolean;
  cacheFirst: string[];
  networkFirst: string[];
  staleWhileRevalidate: string[];
  cacheOnly: string[];
  networkOnly: string[];
}

// Performance Budget
export interface PerformanceBudget {
  maxBundleSize: number;
  maxRenderTime: number;
  maxLCP: number;
  maxFID: number;
  maxCLS: number;
  maxMemoryUsage: number;
  maxNetworkRequests: number;
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning' | 'error';
  impact: string;
  recommendations: string[];
}