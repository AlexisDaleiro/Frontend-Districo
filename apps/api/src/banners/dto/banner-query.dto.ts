import { IsIn, IsOptional } from 'class-validator';

export const bannerPlacements = ['ECOMMERCE', 'INSTITUTIONAL'] as const;
export type BannerPlacement = typeof bannerPlacements[number];

export class BannerQueryDto {
  @IsOptional()
  @IsIn(bannerPlacements)
  placement?: BannerPlacement;
}
