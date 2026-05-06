import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
