import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: 'Perro' })
  @IsString()
  @MinLength(1)
  value: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
