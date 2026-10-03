import { IsString, MinLength } from 'class-validator';

export class AssignSalespersonDto {
  @IsString()
  @MinLength(1)
  customerId!: string;
}
