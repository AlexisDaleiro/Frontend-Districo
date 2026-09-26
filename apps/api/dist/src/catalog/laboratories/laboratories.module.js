"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaboratoriesModule = void 0;
const common_1 = require("@nestjs/common");
const laboratories_controller_1 = require("./laboratories.controller");
const laboratories_repository_1 = require("./laboratories.repository");
const laboratories_service_1 = require("./laboratories.service");
let LaboratoriesModule = class LaboratoriesModule {
};
exports.LaboratoriesModule = LaboratoriesModule;
exports.LaboratoriesModule = LaboratoriesModule = __decorate([
    (0, common_1.Module)({
        controllers: [laboratories_controller_1.LaboratoriesController],
        providers: [laboratories_repository_1.LaboratoriesRepository, laboratories_service_1.LaboratoriesService],
        exports: [laboratories_service_1.LaboratoriesService],
    })
], LaboratoriesModule);
//# sourceMappingURL=laboratories.module.js.map