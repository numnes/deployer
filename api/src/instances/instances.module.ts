import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ClusterModule } from '../cluster/cluster.module';
import { PreviewInstancesModule } from '../preview-instances/preview-instances.module';
import { InstancesController } from './instances.controller';
import { InstancesService } from './instances.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    PreviewInstancesModule,
    forwardRef(() => ClusterModule),
  ],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService],
})
export class InstancesModule {}
