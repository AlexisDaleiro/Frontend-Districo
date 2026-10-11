import { IsString, MaxLength, MinLength } from 'class-validator';
export class SecurityPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
export class MfaCodeDto {
  @IsString() @MinLength(6) @MaxLength(64) code: string;
}
export class MfaVerifyDto extends MfaCodeDto {
  @IsString() @MaxLength(2000) challengeToken: string;
}
export class MfaChangeDto extends SecurityPasswordDto {
  @IsString() @MinLength(6) @MaxLength(64) code: string;
}
