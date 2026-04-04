import { IsNumber, IsString, IsIn } from 'class-validator';

export class CompleteEmergencyDto {
  @IsNumber()
  totalAmount: number;

  @IsString()
  @IsIn(['cash', 'card', 'subscription'])
  paymentMethod: string;
}
