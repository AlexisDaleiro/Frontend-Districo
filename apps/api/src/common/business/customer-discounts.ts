import { CustomerDiscountMode, Prisma } from '@prisma/client';

type DiscountConfig = { discountPercentage?: Prisma.Decimal | number | string; discountMode?: CustomerDiscountMode };
type Line = { unitPrice: number; quantity: number };
type Promotion = { lineIndex: number; amount: number };
const cents = (amount: Prisma.Decimal) => amount.times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

export function calculateCustomerDiscounts(lines: Line[], promotions: Promotion[], config?: DiscountConfig | null) {
  const percentage = new Prisma.Decimal(config?.discountPercentage ?? 0);
  const mode = config?.discountMode ?? CustomerDiscountMode.BEST_PRICE;
  if (!percentage.isFinite() || percentage.lt(0) || percentage.gt(100) || percentage.decimalPlaces() > 2) {
    throw new Error('Porcentaje de descuento inválido.');
  }
  if (!Object.values(CustomerDiscountMode).includes(mode)) throw new Error('Modalidad de descuento inválida.');
  const applied = lines.map((line, lineIndex) => {
    const gross = cents(new Prisma.Decimal(line.unitPrice).times(line.quantity));
    const promotional = Prisma.Decimal.min(gross, Prisma.Decimal.max(0, cents(promotions
      .filter((discount) => discount.lineIndex === lineIndex)
      .reduce((sum, discount) => sum.plus(discount.amount), new Prisma.Decimal(0)))));
    const customer = (mode === CustomerDiscountMode.STACK ? gross.minus(promotional) : gross)
      .times(percentage).div(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    // On a tie, preserve the existing promotion instead of attributing it twice.
    const customerWins = mode === CustomerDiscountMode.BEST_PRICE && customer.gt(promotional);
    const promotionDiscount = customerWins ? new Prisma.Decimal(0) : promotional;
    const customerDiscount = mode === CustomerDiscountMode.STACK || customerWins ? customer : new Prisma.Decimal(0);
    const discount = promotionDiscount.plus(customerDiscount);
    return { gross: Number(gross.div(100)), promotionDiscount: Number(promotionDiscount.div(100)),
      customerDiscount: Number(customerDiscount.div(100)), discount: Number(discount.div(100)), total: Number(gross.minus(discount).div(100)) };
  });
  const sum = (key: keyof typeof applied[number]) => Number(applied.reduce((total, line) => total.plus(line[key]), new Prisma.Decimal(0)));
  return { subtotal: sum('gross'), promotionDiscountTotal: sum('promotionDiscount'), customerDiscountTotal: sum('customerDiscount'),
    discountTotal: sum('discount'), total: sum('total'), customerDiscountPercentage: Number(percentage), customerDiscountMode: mode, lines: applied };
}
