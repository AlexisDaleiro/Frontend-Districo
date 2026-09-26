import { Module } from '@nestjs/common';
import { AttributesController } from './attributes.controller';
import { AttributesRepository } from './attributes.repository';
import { AttributesService } from './attributes.service';

@Module({
  controllers: [AttributesController],
  providers: [AttributesRepository, AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}
