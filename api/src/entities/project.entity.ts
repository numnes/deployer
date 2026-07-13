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

  /**
   * Tempo máximo em que instâncias podem ficar ativas (status active).
   * null em ambos = sem limite.
   */
  @Column({ name: 'max_active_lifetime_days', type: 'int', nullable: true })
  maxActiveLifetimeDays: number | null;

  @Column({ name: 'max_active_lifetime_hours', type: 'int', nullable: true })
  maxActiveLifetimeHours: number | null;

  /**
   * Tempo máximo de existência da instância (desde createdAt).
   * Após expirar, a instância é removida e o checkout em disco é apagado.
   * null em ambos = sem limite.
   */
  @Column({ name: 'max_existence_lifetime_days', type: 'int', nullable: true })
  maxExistenceLifetimeDays: number | null;

  @Column({ name: 'max_existence_lifetime_hours', type: 'int', nullable: true })
  maxExistenceLifetimeHours: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
