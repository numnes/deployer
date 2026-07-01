import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreviewInstanceStatusEvent } from '../entities/preview-instance-status-event.entity';
import { PreviewInstance } from '../entities/preview-instance.entity';
import { ProjectsModule } from '../projects/projects.module';
import { SettingsModule } from '../settings/settings.module';
import { PreviewInstancesService } from './preview-instances.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PreviewInstance, PreviewInstanceStatusEvent]),
    forwardRef(() => ProjectsModule),
    SettingsModule,
  ],
  providers: [PreviewInstancesService],
  exports: [PreviewInstancesService],
})
export class PreviewInstancesModule {}
