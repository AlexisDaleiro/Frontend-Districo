import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SaveBannerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  actionLabel?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\/tienda(?:$|[/?#])/)
  @MaxLength(500)
  href?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  alt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === '' ? null : value)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === '' ? null : value)
  @IsDateString()
  endsAt?: string | null;
}
