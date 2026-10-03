import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveSalespersonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(/^(?=(?:\D*\d){6})\+?[\d\s().-]{6,30}$/, { message: 'Ingresá un número de contacto válido.' })
  phone!: string;
}
