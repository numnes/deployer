import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @OneToMany(() => ApiKey, (k) => k.user)
  apiKeys: ApiKey[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
