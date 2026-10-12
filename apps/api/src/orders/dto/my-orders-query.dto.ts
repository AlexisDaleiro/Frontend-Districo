import { OrderStatus } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, Matches } from "class-validator";
import { SearchListQueryDto } from "../../admin/dto/admin-list-query.dto";

export class MyOrdersQueryDto extends SearchListQueryDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional()
  @IsIn(["PENDING", "PARTIAL", "PAID", "CREDITED"])
  paymentStatus?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
}
