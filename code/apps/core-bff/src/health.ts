/**
 * Core BFF Health Probes and Graceful Shutdown Lifecycle
 * Exposes /health (startup/liveness), /ready (readiness checking NATS & Redis),
 * and coordinates graceful shutdown with drained in-flight requests.
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessCheckResult {
  ready: boolean;
  checks: {
    nats: boolean;
    redis: boolean;
  };
  details?: Record<string, string>;
}

export interface DependencyChecker {
  checkNats(): Promise<boolean>;
  checkRedis(): Promise<boolean>;
}

export class CoreBffHealthManager {
  private isShuttingDown = false;
  private inFlightRequests = 0;
  private dependencyChecker?: DependencyChecker;

  constructor(dependencyChecker?: DependencyChecker) {
    this.dependencyChecker = dependencyChecker;
  }

  public trackRequestStart(): void {
    if (this.isShuttingDown) {
      throw new Error('SERVER_SHUTTING_DOWN');
    }
    this.inFlightRequests++;
  }

  public trackRequestEnd(): void {
    this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);
  }

  public getInFlightCount(): number {
    return this.inFlightRequests;
  }

  public getLiveness(): HealthStatus {
    return {
      status: this.isShuttingDown ? 'unhealthy' : 'healthy',
      service: 'core-bff',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<ReadinessCheckResult> {
    if (this.isShuttingDown) {
      return {
        ready: false,
        checks: { nats: false, redis: false },
        details: { state: 'SHUTTING_DOWN' },
      };
    }

    if (!this.dependencyChecker) {
      return {
        ready: true,
        checks: { nats: true, redis: true },
      };
    }

    try {
      const [nats, redis] = await Promise.all([
        this.dependencyChecker.checkNats(),
        this.dependencyChecker.checkRedis(),
      ]);

      return {
        ready: nats && redis,
        checks: { nats, redis },
      };
    } catch (err) {
      return {
        ready: false,
        checks: { nats: false, redis: false },
        details: { error: (err as Error).message },
      };
    }
  }

  public async initiateGracefulShutdown(timeoutMs = 5000): Promise<void> {
    this.isShuttingDown = true;
    const start = Date.now();

    while (this.inFlightRequests > 0) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Shutdown timeout exceeded with ${this.inFlightRequests} in-flight requests`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
