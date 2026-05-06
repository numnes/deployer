import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PreviewInstancesModule } from '../preview-instances/preview-instances.module';
import { ProjectsModule } from '../projects/projects.module';
import { DeployController } from './deploy.controller';
import { DeployProcessor } from './deploy.processor';
import { DeployService } from './deploy.service';

@Module({
  imports: [
    ConfigModule,
    ApiKeysModule,
    ProjectsModule,
    PreviewInstancesModule,
    BullModule.registerQueue({ name: 'deploy' }),
  ],
  controllers: [DeployController],
  providers: [DeployService, DeployProcessor],
  exports: [DeployService],
})
export class DeployModule {}
