"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const brands_module_1 = require("./catalog/brands/brands.module");
const laboratories_module_1 = require("./catalog/laboratories/laboratories.module");
const categories_module_1 = require("./catalog/categories/categories.module");
const attributes_module_1 = require("./catalog/attributes/attributes.module");
const products_module_1 = require("./catalog/products/products.module");
const pricing_module_1 = require("./pricing/pricing.module");
const inventory_module_1 = require("./inventory/inventory.module");
const cart_module_1 = require("./cart/cart.module");
const orders_module_1 = require("./orders/orders.module");
const promotions_module_1 = require("./promotions/promotions.module");
const recommendations_module_1 = require("./recommendations/recommendations.module");
const audit_module_1 = require("./audit/audit.module");
const notifications_module_1 = require("./notifications/notifications.module");
const applications_module_1 = require("./applications/applications.module");
const admin_module_1 = require("./admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            brands_module_1.BrandsModule,
            laboratories_module_1.LaboratoriesModule,
            categories_module_1.CategoriesModule,
            attributes_module_1.AttributesModule,
            products_module_1.ProductsModule,
            pricing_module_1.PricingModule,
            inventory_module_1.InventoryModule,
            cart_module_1.CartModule,
            orders_module_1.OrdersModule,
            promotions_module_1.PromotionsModule,
            recommendations_module_1.RecommendationsModule,
            audit_module_1.AuditModule,
            notifications_module_1.NotificationsModule,
            applications_module_1.ApplicationsModule,
            admin_module_1.AdminModule,
        ],
        providers: [{ provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map