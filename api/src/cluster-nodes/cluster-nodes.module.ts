import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClusterModule } from '../cluster/cluster.module';
import { ClusterNode } from '../entities/cluster-node.entity';
import { ClusterNodesController } from './cluster-nodes.controller';
import { ClusterNodeSecretService } from './cluster-node-secret.service';
import { ClusterNodesService } from './cluster-nodes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClusterNode]),
    AuthModule,
    forwardRef(() => ClusterModule),
  ],
  controllers: [ClusterNodesController],
  providers: [ClusterNodesService, ClusterNodeSecretService],
  exports: [ClusterNodesService, ClusterNodeSecretService],
})
export class ClusterNodesModule {}
