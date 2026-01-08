type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

let jobCounter = 0;

export class Job<T = unknown, R = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus = "waiting";
  attemptsMade = 0;
  returnvalue?: R;
  finishedOn?: number;
  processedOn?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BullMQ Job.failedReason is any
  failedReason?: any;

  constructor(name: string, data: T, jobId?: string) {
    this.name = name;
    this.data = data;
    this.id = jobId ?? `${Date.now()}-${++jobCounter}`;
  }

  async remove(): Promise<void> {
    // Removal handled by queue cleanup.
  }

  async updateProgress(progress: number | object): Promise<void> {
    void progress;
  }
}

export type Processor<T = unknown, R = unknown> = (job: Job<T, R>) => Promise<R> | R;

const queues = new Map<string, Queue>();
const workerRegistry = new Map<string, Worker>();

export class Queue<T = unknown> {
  name: string;
  private jobs: Job<T>[] = [];
  private paused = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BullMQ-compatible options signature
  constructor(name: string, _options?: any) {
    this.name = name;
    const existing = queues.get(name);
    if (existing) {
      return existing as Queue<T>;
    }
    queues.set(name, this);
  }

  private async dispatch(job: Job<T>): Promise<void> {
    const worker = workerRegistry.get(this.name);
    if (!worker || this.paused) return;

    job.status = "active";
    job.processedOn = Date.now();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Processor return type is generic
      const result: any = await worker.process(job);
      job.returnvalue = result;
      job.status = "completed";
      job.finishedOn = Date.now();
      worker.emit("completed", job);
    } catch (error) {
      job.status = "failed";
      job.finishedOn = Date.now();
      job.failedReason = error;
      worker.emit("failed", job, error as Error);
    }
  }

  async add(
    name: string,
    data: T,
    options?: {
      delay?: number;
      jobId?: string;
      priority?: number;
      attempts?: number;
      repeat?: unknown;
      backoff?: unknown;
    }
  ): Promise<Job<T>> {
    const job = new Job<T>(name, data, options?.jobId);
    this.jobs.push(job);

    if (options?.delay && options.delay > 0) {
      setTimeout(() => {
        void this.dispatch(job);
      }, options.delay);
    } else {
      void this.dispatch(job);
    }

    return job;
  }

  async getJobs(
    types: Array<JobStatus> = ["waiting", "active", "completed", "failed", "delayed"],
  ): Promise<Array<Job<T>>> {
    return this.jobs.filter((job) => types.includes(job.status));
  }

  private count(status: JobStatus): number {
    return this.jobs.filter((job) => job.status === status).length;
  }

  async getWaitingCount(): Promise<number> {
    return this.count("waiting");
  }

  async getActiveCount(): Promise<number> {
    return this.count("active");
  }

  async getCompletedCount(): Promise<number> {
    return this.count("completed");
  }

  async getFailedCount(): Promise<number> {
    return this.count("failed");
  }

  async getDelayedCount(): Promise<number> {
    return this.count("delayed");
  }

  async getJobCountByTypes(...types: Array<JobStatus>): Promise<number> {
    const target = types.length > 0 ? types : ["waiting", "active", "completed", "failed", "delayed"];
    return this.jobs.filter((job) => target.includes(job.status)).length;
  }

  async pause(): Promise<void> {
    this.paused = true;
    this.jobs.forEach((job) => {
      if (job.status === "waiting") job.status = "paused";
    });
  }

  async resume(): Promise<void> {
    this.paused = false;
    for (const job of this.jobs) {
      if (job.status === "paused") {
        job.status = "waiting";
        void this.dispatch(job);
      }
    }
  }

  async clean(ageMs: number, _limit: number, status: JobStatus): Promise<Array<Job<T>>> {
    const cutoff = Date.now() - ageMs;
    const removed: Array<Job<T>> = [];
    this.jobs = this.jobs.filter((job) => {
      if (job.status === status && (job.finishedOn ?? 0) < cutoff) {
        removed.push(job);
        return false;
      }
      return true;
    });
    return removed;
  }

  async obliterate(): Promise<void> {
    this.jobs = [];
  }

  async close(): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Worker generics are covariant
  setWorker(worker: Worker<any, any>): void {
    workerRegistry.set(this.name, worker as Worker);
  }
}

export class QueueEvents {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter pattern requires any[]
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BullMQ-compatible options signature
  constructor(_name: string, _options?: any) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter pattern requires any[]
  on(_event: string, _handler: (...args: any[]) => void): void {}

  async close(): Promise<void> {
    this.listeners.clear();
  }
}

export class Worker<T = unknown, R = unknown> {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private processor: Processor<T, R>;
  queue: Queue<T>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BullMQ-compatible options signature
  constructor(name: string, processor: Processor<T, R>, _options?: any) {
    this.processor = processor;
    const existing = queues.get(name) as Queue<T> | undefined;
    this.queue = existing ?? new Queue<T>(name);
    this.queue.setWorker(this);
  }

  async process(job: Job<T, R>): Promise<R> {
    return this.processor(job);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter pattern requires any[]
  on(event: string, handler: (...args: any[]) => void): void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    handlers?.forEach((handler) => handler(...args));
  }

  async close(): Promise<void> {
    this.listeners.clear();
  }
}
