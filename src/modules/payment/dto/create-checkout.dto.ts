import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    example: '7f8c9b2a-1234-4567-8901-abcdef123456',
    description: 'Subscription package ID',
  })
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;
}
