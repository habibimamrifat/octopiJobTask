import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization name',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'contact@acme.com',
    description: 'Organization contact email',
  })
  @IsEmail()
  @IsNotEmpty()
  contactEmail!: string;

  @ApiPropertyOptional({
    example: 'billing@acme.com',
    description: 'Organization billing email',
  })
  @IsEmail()
  @IsNotEmpty()
  billingEmail!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the initial organization admin',
  })
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiProperty({
    example: 'john@acme.com',
    description: 'Email of the initial organization admin',
  })
  @IsEmail()
  @IsNotEmpty()
  userEmail!: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Password of the initial organization admin',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  userPassword!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the subscription package selected during registration',
  })
  @IsUUID()
  @IsNotEmpty()
  packageId!: string;
}