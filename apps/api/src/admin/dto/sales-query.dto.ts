import { IsIn, IsOptional } from 'class-validator';

export class SalesQueryDto {
  @IsOptional()
  @IsIn(['today', '7d', '30d', '90d'])
  period: 'today' | '7d' | '30d' | '90d' = '7d';
}
