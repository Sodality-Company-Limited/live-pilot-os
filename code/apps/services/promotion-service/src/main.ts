import 'reflect-metadata';

import { Controller, Get, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { connect, type NatsConnection } from 'nats';
import { Pool } from 'pg';

interface RuntimeConfiguration {
  readonly serviceName: string;
  readonly releaseId: string;
  readonly environment: string;
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly natsUrl: string;
  readonly natsToken?: string;
}

interface ProbeResponse {
  readonly status: 'ok' | 'unavailable';
  readonly service: string;
  readonly release: string;
  readonly timestamp: string;
  readonly reasons?: readonly string[];
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required runtime configuration: ${name}`);
  }
  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PROMOTION_HTTP_PORT must be an integer between 1 and 65535');
  }
  return port;
}

function loadRuntimeConfiguration(): RuntimeConfiguration {
  return {
    serviceName: requiredEnvironment('PROMOTION_SERVICE_NAME'),
    releaseId: requiredEnvironment('PROMOTION_RELEASE_ID'),
    environment: requiredEnvironment('PROMOTION_ENVIRONMENT'),
    host: requiredEnvironment('PROMOTION_HTTP_HOST'),
    port: parsePort(requiredEnvironment('PROMOTION_HTTP_PORT')),
    databaseUrl: requiredEnvironment('PROMOTION_DATABASE_URL'),
    natsUrl: requiredEnvironment('PROMOTION_NATS_URL'),
    natsToken: process.env.PROMOTION_NATS_TOKEN?.trim() || undefined,
  };
}

@Injectable()
class RuntimeHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly configuration: RuntimeConfiguration;
  private readonly database: Pool;
  private natsConnection: NatsConnection | undefined;

  public constructor() {
    this.configuration = loadRuntimeConfiguration();
    this.database = new Pool({ connectionString: this.configuration.databaseUrl, max: 10 });
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.refreshNatsConnection();
    } catch {
      this.natsConnection = undefined;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.natsConnection?.drain();
    await this.natsConnection?.close();
    await this.database.end();
  }

  public startup(): ProbeResponse {
    return this.response('ok');
  }

  public live(): ProbeResponse {
    return this.response('ok');
  }

  public async ready(): Promise<ProbeResponse> {
    const reasons: string[] = [];

    try {
      await this.database.query('SELECT 1');
    } catch {
      reasons.push('postgres_unavailable');
    }

    try {
      await this.refreshNatsConnection();
    } catch {
      reasons.push('nats_unavailable');
    }

    return reasons.length === 0 ? this.response('ok') : this.response('unavailable', reasons);
  }

  private async refreshNatsConnection(): Promise<void> {
    if (this.natsConnection && !this.natsConnection.isClosed()) {
      return;
    }
    this.natsConnection = await connect({
      servers: this.configuration.natsUrl,
      token: this.configuration.natsToken,
      timeout: 5_000,
      name: `${this.configuration.serviceName}:${this.configuration.releaseId}`,
    });
  }

  private response(status: ProbeResponse['status'], reasons?: readonly string[]): ProbeResponse {
    return {
      status,
      service: this.configuration.serviceName,
      release: this.configuration.releaseId,
      timestamp: new Date().toISOString(),
      ...(reasons && reasons.length > 0 ? { reasons } : {}),
    };
  }
}

@Controller('internal/health')
class HealthController {
  public constructor(private readonly health: RuntimeHealthService) {}

  @Get('startup')
  public startup(): ProbeResponse {
    return this.health.startup();
  }

  @Get('live')
  public live(): ProbeResponse {
    return this.health.live();
  }

  @Get('ready')
  public async ready(): Promise<ProbeResponse> {
    return this.health.ready();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
  ],
  controllers: [HealthController],
  providers: [RuntimeHealthService],
})
class PromotionRuntimeModule {}

async function bootstrap(): Promise<void> {
  const configuration = loadRuntimeConfiguration();
  const app = await NestFactory.create(PromotionRuntimeModule, { abortOnError: true });

  app.enableShutdownHooks();
  app.setGlobalPrefix('');
  await app.listen(configuration.port, configuration.host);
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Promotion service failed to start';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
