import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClusterModule } from '../cluster/cluster.module';
import { Project } from '../entities/project.entity';
import { PreviewInstancesModule } from '../preview-instances/preview-instances.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    AuthModule,
    forwardRef(() => PreviewInstancesModule),
    forwardRef(() => ClusterModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
