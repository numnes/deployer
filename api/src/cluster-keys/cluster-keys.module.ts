import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClusterKey } from '../entities/cluster-key.entity';
import { ClusterKeysController } from './cluster-keys.controller';
import { ClusterKeysService } from './cluster-keys.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClusterKey]), AuthModule],
  controllers: [ClusterKeysController],
  providers: [ClusterKeysService],
  exports: [ClusterKeysService],
})
export class ClusterKeysModule {}
