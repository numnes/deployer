import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('preview_instance_status_events')
export class PreviewInstanceStatusEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  instanceId: string;

  @Column({ name: 'old_status', type: 'varchar', length: 24, nullable: true })
  oldStatus: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 24 })
  newStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
