import { IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['protegido', 'familia'], {
    message: 'Plan debe ser protegido o familia',
  })
  plan: string;
}
