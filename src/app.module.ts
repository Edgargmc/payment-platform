import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'payment_user',
      password: 'payment_pass',
      database: 'payment_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    PaymentsModule,
  ],
})
export class AppModule {}