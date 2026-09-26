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
exports.LaboratoriesService = void 0;
const common_1 = require("@nestjs/common");
const slugify_1 = require("../../common/utils/slugify");
const laboratories_repository_1 = require("./laboratories.repository");
let LaboratoriesService = class LaboratoriesService {
    constructor(laboratoriesRepository) {
        this.laboratoriesRepository = laboratoriesRepository;
    }
    findAll() {
        return this.laboratoriesRepository.findAll();
    }
    create(dto) {
        return this.laboratoriesRepository.create({
            name: dto.name,
            slug: dto.slug ?? (0, slugify_1.slugify)(dto.name),
            active: dto.active ?? true,
        });
    }
    update(id, dto) {
        return this.laboratoriesRepository.update(id, {
            ...dto,
            slug: dto.slug ?? (dto.name ? (0, slugify_1.slugify)(dto.name) : undefined),
        });
    }
};
exports.LaboratoriesService = LaboratoriesService;
exports.LaboratoriesService = LaboratoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [laboratories_repository_1.LaboratoriesRepository])
], LaboratoriesService);
//# sourceMappingURL=laboratories.service.js.map