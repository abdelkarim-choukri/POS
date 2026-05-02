import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as net from 'net';
import { Public } from '../../common/decorators';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    const db = await this.pingDb();
    const redis = await this.pingRedis();

    const allUp = db === 'up' && redis === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      db,
      redis,
    };
  }

  private async pingDb(): Promise<string> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private pingRedis(): Promise<string> {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.on('connect', () => {
        socket.write('PING\r\n');
      });

      socket.on('data', (data) => {
        const response = data.toString().trim();
        socket.destroy();
        resolve(response.includes('PONG') ? 'up' : 'down');
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve('down');
      });

      socket.on('error', () => {
        socket.destroy();
        resolve('down');
      });

      socket.connect(port, host);
    });
  }
}
