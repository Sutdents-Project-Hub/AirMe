interface RequestGateOptions {
  maxRequests: number;
  windowMs: number;
  maxConcurrent: number;
  now?: () => number;
}

export class RequestGate {
  private readonly starts: number[] = [];
  private active = 0;

  constructor(private readonly options: RequestGateOptions) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const now = (this.options.now ?? Date.now)();
    while (this.starts.length > 0 && now - this.starts[0] >= this.options.windowMs) {
      this.starts.shift();
    }
    if (
      this.starts.length >= this.options.maxRequests ||
      this.active >= this.options.maxConcurrent
    ) {
      throw new Error('RATE_LIMITED');
    }

    this.starts.push(now);
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
    }
  }
}
