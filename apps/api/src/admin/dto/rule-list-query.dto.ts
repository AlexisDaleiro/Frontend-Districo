import { IsIn, IsOptional } from 'class-validator';
import { SearchListQueryDto } from './admin-list-query.dto';

export class RuleListQueryDto extends SearchListQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'SCHEDULED', 'EXPIRED', 'INACTIVE'])
  status?: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';
}
