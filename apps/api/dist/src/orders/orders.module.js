"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const inventory_module_1 = require("../inventory/inventory.module");
const notifications_module_1 = require("../notifications/notifications.module");
const prisma_module_1 = require("../prisma/prisma.module");
const promotions_module_1 = require("../promotions/promotions.module");
const checkout_controller_1 = require("./checkout.controller");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, inventory_module_1.InventoryModule, promotions_module_1.PromotionsModule, audit_module_1.AuditModule, notifications_module_1.NotificationsModule],
        controllers: [orders_controller_1.OrdersController, checkout_controller_1.CheckoutController],
        providers: [orders_service_1.OrdersService],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map