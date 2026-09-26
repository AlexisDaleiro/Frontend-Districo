"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const notifications_module_1 = require("../notifications/notifications.module");
const prisma_module_1 = require("../prisma/prisma.module");
const applications_controller_1 = require("./applications.controller");
const applications_service_1 = require("./applications.service");
let ApplicationsModule = class ApplicationsModule {
};
exports.ApplicationsModule = ApplicationsModule;
exports.ApplicationsModule = ApplicationsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule, notifications_module_1.NotificationsModule],
        controllers: [applications_controller_1.ApplicationsController],
        providers: [applications_service_1.ApplicationsService],
        exports: [applications_service_1.ApplicationsService],
    })
], ApplicationsModule);
//# sourceMappingURL=applications.module.js.map