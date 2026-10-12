import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { SearchListQueryDto } from "../../admin/dto/admin-list-query.dto";

export class OperationsQueryDto extends SearchListQueryDto {
  @IsOptional()
  @IsIn([
    "ALL",
    "UNMATCHED",
    "MATCHED",
    "CONFLICT",
    "OPEN",
    "DELIVERED",
    "INACTIVE",
    "DELAYED",
    "OVERDUE",
    "REPLENISH",
  ])
  filter?: string;
  @IsOptional() @IsDateString({ strict: true }) dateFrom?: string;
  @IsOptional() @IsDateString({ strict: true }) dateTo?: string;
}
export class MovementDto {
  @IsString() @MinLength(1) @MaxLength(120) reference!: string;
  @IsDateString({ strict: true }) occurredAt!: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999)
  amount!: number;
  @IsIn(["UYU", "USD"]) currency!: string;
  @IsString() @MinLength(1) @MaxLength(300) description!: string;
}
export class MovementImportDto {
  @IsUUID() requestId!: string;
  @IsString() @MinLength(1) @MaxLength(250000) csv!: string;
}
export class ReconcileDto {
  @IsUUID() requestId!: string;
  @IsString() @MaxLength(100) movementId!: string;
  @IsString() @MaxLength(100) paymentId!: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999)
  amount!: number;
}
export class VoidMatchDto {
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
export class FollowupDto {
  @IsUUID() requestId!: string;
  @IsString() @MinLength(1) @MaxLength(2000) note!: string;
  @IsOptional() @IsDateString() nextContactAt?: string;
}
export class FulfillmentLineDto {
  @IsString() @MaxLength(100) orderItemId!: string;
  @IsInt() @Min(1) @Max(1000000) quantity!: number;
}
export class FulfillmentDto {
  @IsUUID() requestId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => FulfillmentLineDto)
  items!: FulfillmentLineDto[];
}
export class DeliveryDto {
  @IsString() @MinLength(2) @MaxLength(120) receivedBy!: string;
  @IsString() @MinLength(3) @MaxLength(1000) proof!: string;
}
export class InquiryAssignmentDto {
  @IsOptional() @IsString() @MaxLength(100) customerId?: string;
  @IsOptional() @IsString() @MaxLength(100) orderId?: string;
  @IsOptional() @IsString() @MaxLength(100) assignedToId?: string;
  @IsOptional() @IsDateString() responseDueAt?: string;
}
export class InquiryEntryDto {
  @IsUUID() requestId!: string;
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsIn(["INTERNAL", "CUSTOMER"]) visibility!: string;
  @IsOptional() @IsBoolean() sendEmail?: boolean;
}
export class CustomerInquiryDto {
  @IsUUID() requestId!: string;
  @IsString() @MinLength(10) @MaxLength(4000) message!: string;
  @IsOptional() @IsString() @MaxLength(100) orderId?: string;
}
export class CandidateActivityDto {
  @IsUUID() requestId!: string;
  @IsIn(["NOTE", "INTERVIEW", "EMAIL"]) kind!: string;
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsBoolean() sendEmail?: boolean;
}
export class CvRetentionDto {
  @IsIn([0, 6, 12]) months!: number;
}
export class UsageEventDto {
  @IsUUID() sessionId!: string;
  @IsIn(["SEARCH", "NO_RESULTS", "CHECKOUT_STARTED", "CHECKOUT_COMPLETED"])
  kind!: string;
  @IsIn([true]) consent!: boolean;
}
