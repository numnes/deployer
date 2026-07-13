import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import { LOCAL_NODE_ID } from './cluster.types';

@Injectable()
export class ClusterNodeInfoService {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async getNodeLabel(): Promise<string> {
    return this.settings.getNodeLabel();
  }

  async getLocalBaseUrl(): Promise<string | null> {
    const port = this.config.get<string>('PORT') ?? '3000';
    return `http://127.0.0.1:${port}`;
  }

  async getLocalNodeRef() {
    return {
      nodeId: LOCAL_NODE_ID,
      nodeLabel: await this.getNodeLabel(),
      nodeBaseUrl: await this.getLocalBaseUrl(),
      isLocal: true,
      online: true,
      canWrite: true,
    };
  }
}
