"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateLaboratoryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_laboratory_dto_1 = require("./create-laboratory.dto");
class UpdateLaboratoryDto extends (0, swagger_1.PartialType)(create_laboratory_dto_1.CreateLaboratoryDto) {
}
exports.UpdateLaboratoryDto = UpdateLaboratoryDto;
//# sourceMappingURL=update-laboratory.dto.js.map