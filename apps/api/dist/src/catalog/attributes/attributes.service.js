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
exports.AttributesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const slugify_1 = require("../../common/utils/slugify");
const attributes_repository_1 = require("./attributes.repository");
let AttributesService = class AttributesService {
    constructor(attributesRepository) {
        this.attributesRepository = attributesRepository;
    }
    findAll() {
        return this.attributesRepository.findAll();
    }
    createDefinition(dto) {
        return this.attributesRepository.createDefinition({
            name: dto.name,
            slug: dto.slug ?? (0, slugify_1.slugify)(dto.name),
            type: dto.type ?? client_1.AttributeType.SELECT,
        });
    }
    createValue(attributeId, dto) {
        return this.attributesRepository.createValue(attributeId, {
            value: dto.value,
            slug: dto.slug ?? (0, slugify_1.slugify)(dto.value),
        });
    }
};
exports.AttributesService = AttributesService;
exports.AttributesService = AttributesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attributes_repository_1.AttributesRepository])
], AttributesService);
//# sourceMappingURL=attributes.service.js.map