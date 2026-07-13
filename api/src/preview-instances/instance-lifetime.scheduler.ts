import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PreviewInstancesService } from './preview-instances.service';

@Injectable()
export class InstanceLifetimeScheduler {
  private readonly log = new Logger(InstanceLifetimeScheduler.name);

  constructor(private readonly previewInstances: PreviewInstancesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enforceLifetimes() {
    try {
      const result = await this.previewInstances.enforceLifetimeLimits();
      if (result.paused > 0 || result.destroyed > 0) {
        this.log.log(
          `Lifetime enforcement: ${result.paused} paused, ${result.destroyed} destroyed`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Lifetime enforcement failed: ${msg}`);
    }
  }
}
