import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'git_url' })
  gitUrl: string;

  /** URL base pública (ex.: https://meuteste.com) para montar links de preview. */
  @Column({ name: 'server_url', type: 'varchar', nullable: true })
  serverUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
