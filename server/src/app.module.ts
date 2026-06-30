import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeployModule } from './deploy/deploy.module';
import { ApiKey } from './entities/api-key.entity';
import { PreviewInstanceStatusEvent } from './entities/preview-instance-status-event.entity';
import { PreviewInstance } from './entities/preview-instance.entity';
import { Project } from './entities/project.entity';
import { Setting } from './entities/setting.entity';
import { User } from './entities/user.entity';
import { InstancesModule } from './instances/instances.module';
import { ProjectsModule } from './projects/projects.module';
import { SettingsModule } from './settings/settings.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          User,
          ApiKey,
          Project,
          PreviewInstance,
          PreviewInstanceStatusEvent,
          Setting,
        ],
        synchronize: config.get<string>('TYPEORM_SYNC') === 'true',
        logging: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: parseInt(config.get<string>('REDIS_PORT') as string),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ApiKeysModule,
    ProjectsModule,
    SettingsModule,
    DeployModule,
    InstancesModule,
    DashboardModule,
    SetupModule,
    UsersModule,
  ],
})
export class AppModule {}
