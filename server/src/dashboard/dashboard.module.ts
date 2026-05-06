import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PreviewInstanceStatusEvent } from '../entities/preview-instance-status-event.entity';
import { PreviewInstance } from '../entities/preview-instance.entity';
import { SettingsModule } from '../settings/settings.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PreviewInstance, PreviewInstanceStatusEvent]),
    SettingsModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
