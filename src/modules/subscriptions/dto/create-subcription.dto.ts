import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'Professional',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Professional plan for growing organizations',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 49.99,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    enum: BillingInterval,
    example: BillingInterval.MONTHLY,
  })
  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;

  @ApiProperty({
    example: ['Up to 10 members', 'Unlimited projects', 'Priority support'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  features!: string[];
}
