import { Transform } from 'class-transformer';
import { Equals, IsEnum, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { JobApplicationStatus } from '@prisma/client';
import { JobListQueryDto } from './save-job.dto';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class ApplyJobDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() @MaxLength(254) email: string;
  @Transform(trim) @Matches(/^[+\d ()-]{6,30}$/) phone: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) message?: string;
  @IsUUID() submissionId: string;
  @Equals('true') consent: string;
}
export class CandidateQueryDto extends JobListQueryDto {
  @IsOptional() @IsEnum(JobApplicationStatus) candidateStatus?: JobApplicationStatus;
}
export class UpdateCandidateDto {
  @IsEnum(JobApplicationStatus) status: JobApplicationStatus;
}
