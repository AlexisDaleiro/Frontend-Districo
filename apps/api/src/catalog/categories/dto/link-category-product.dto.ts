import { IsNotEmpty, IsString } from 'class-validator';

export class LinkCategoryProductDto {
  @IsString()
  @IsNotEmpty()
  productId: string;
}
