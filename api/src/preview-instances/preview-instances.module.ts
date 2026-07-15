import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreviewInstanceStatusEvent } from '../entities/preview-instance-status-event.entity';
import { PreviewInstance } from '../entities/preview-instance.entity';
import { ProjectsModule } from '../projects/projects.module';
import { SettingsModule } from '../settings/settings.module';
import { InstanceLifetimeScheduler } from './instance-lifetime.scheduler';
import { PreviewInstancesService } from './preview-instances.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PreviewInstance, PreviewInstanceStatusEvent]),
    forwardRef(() => ProjectsModule),
    SettingsModule,
    BullModule.registerQueue({ name: 'deploy' }),
  ],
  providers: [PreviewInstancesService, InstanceLifetimeScheduler],
  exports: [PreviewInstancesService],
})
export class PreviewInstancesModule {}
