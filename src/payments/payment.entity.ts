import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PROCESSING = 'PROCESSING',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  idempotencyKey: string;

  @Column()
  customerId: string;

  @Column()
  merchantId: string;

  @Column()
  qrData: string;

  @Column('bigint')
  amountInCents: number;

  @Column({ length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PROCESSING,
  })
  status: PaymentStatus;

  @Column({ nullable: true })
  providerTransactionId?: string;

  @Column({ nullable: true })
  errorCode?: string;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
