import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    unique: true,
  })
  messageId: string;

  @CreateDateColumn()
  processedAt: Date;
}
