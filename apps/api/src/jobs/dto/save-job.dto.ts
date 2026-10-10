import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const trimmed = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const lines = ({ value }: { value: unknown }) => Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item.trim() : item) : value;

export class SaveJobDto {
  @Transform(trimmed) @IsString() @MinLength(2) @MaxLength(120)
  title: string;

  @IsIn(['Logística y depósito', 'Ventas', 'Administración', 'Marketing'])
  area: string;

  @IsIn(['Montevideo', 'Maldonado'])
  location: string;

  @IsIn(['Jornada completa', 'Medio tiempo'])
  schedule: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  published: string;

  @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(6000)
  description: string;

  @Transform(lines) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(300, { each: true })
  requirements: string[];

  @Transform(lines) @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(300, { each: true })
  benefits: string[];

  @Transform(trimmed) @IsEmail() @MaxLength(254)
  contactEmail: string;

  @IsBoolean()
  active: boolean;

  @IsBoolean()
  isExample: boolean;
}

export class JobListQueryDto {
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(150)
  search?: string;

  @IsOptional() @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;
}
