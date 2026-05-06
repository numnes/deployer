import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

/** waiting | deploying | active | paused | error */
@Entity('preview_instances')
@Unique('UQ_preview_instance_project_branch', ['projectId', 'branch'])
export class PreviewInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  /** Nome da branch no Git (ex.: feature/foo). */
  @Column({ type: 'varchar' })
  branch: string;

  /** Slug usado no path nginx / PM2 (sanitizado no core). */
  @Column({ name: 'branch_slug', type: 'varchar' })
  branchSlug: string;

  @Column({ name: 'pm2_name', type: 'varchar' })
  pm2Name: string;

  /** waiting | deploying | active | paused | error — default para linhas legadas. */
  @Column({ type: 'varchar', length: 24, default: 'active' })
  status: string;

  @Column({ type: 'int', nullable: true })
  port: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
