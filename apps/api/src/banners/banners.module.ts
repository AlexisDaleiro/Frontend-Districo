import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBannersController, BannersController } from './banners.controller';
import { BannerStorageService } from './banner-storage.service';
import { BannersService } from './banners.service';

@Module({
  imports: [PrismaModule],
  controllers: [BannersController, AdminBannersController],
  providers: [BannersService, BannerStorageService],
})
export class BannersModule {}
