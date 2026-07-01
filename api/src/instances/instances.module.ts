import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PreviewInstancesModule } from '../preview-instances/preview-instances.module';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';

@Module({
  imports: [ConfigModule, AuthModule, PreviewInstancesModule],
  controllers: [InstancesController],
  providers: [InstancesService],
})
export class InstancesModule {}
