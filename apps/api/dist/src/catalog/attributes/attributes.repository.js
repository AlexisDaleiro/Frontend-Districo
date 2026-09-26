"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributesRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AttributesRepository = class AttributesRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.attributeDefinition.findMany({
            where: { active: true },
            include: { values: { orderBy: { value: 'asc' } } },
            orderBy: { name: 'asc' },
        });
    }
    createDefinition(data) {
        return this.prisma.attributeDefinition.create({ data });
    }
    createValue(attributeId, data) {
        return this.prisma.attributeValue.create({ data: { attributeId, ...data } });
    }
};
exports.AttributesRepository = AttributesRepository;
exports.AttributesRepository = AttributesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttributesRepository);
//# sourceMappingURL=attributes.repository.js.map