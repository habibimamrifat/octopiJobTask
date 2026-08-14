import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'nilmolat21@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

    @ApiProperty({
    example: 'admin123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
