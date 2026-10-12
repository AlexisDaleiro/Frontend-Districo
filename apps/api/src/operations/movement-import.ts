import { BadRequestException } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { MovementDto } from "./dto/operations.dto";

export function parseMovements(csv: string) {
  if (Buffer.byteLength(csv) > 250000)
    throw new BadRequestException("El CSV supera 250 KB.");
  let rows: Record<string, string>[];
  try {
    rows = parse(csv, {
      columns: true,
      bom: true,
      trim: true,
      skip_empty_lines: true,
      max_record_size: 5000,
    });
  } catch {
    throw new BadRequestException(
      "CSV inválido. Usá la plantilla con separador coma y codificación UTF-8.",
    );
  }
  if (!rows.length || rows.length > 500)
    throw new BadRequestException(
      "El CSV debe tener entre 1 y 500 movimientos.",
    );
  const references = new Set<string>();
  const movements: MovementDto[] = [],
    errors: { line: number; message: string }[] = [];
  for (const [index, row] of rows.entries()) {
    const dto = plainToInstance(MovementDto, {
      reference: row.reference?.trim(),
      occurredAt: row.occurredAt,
      amount: Number(row.amount),
      currency: row.currency,
      description: row.description?.trim(),
    });
    if (
      validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })
        .length ||
      !dto.reference?.trim() ||
      !dto.description?.trim()
    ) {
      errors.push({
        line: index + 2,
        message: "Referencia, fecha, importe, moneda o descripción inválidos.",
      });
      continue;
    }
    if (references.has(dto.reference)) {
      errors.push({
        line: index + 2,
        message: "La referencia se repite dentro del archivo.",
      });
      continue;
    }
    references.add(dto.reference);
    movements.push(dto);
  }
  return { movements, errors };
}
