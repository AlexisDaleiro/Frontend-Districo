export type Permission =
  "CAN_VIEW_PRICES" | "CAN_PLACE_ORDERS" | "CAN_BUY_MEDICATIONS";
export type Entity = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  aliasIds?: string[];
};
export type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  city?: string | null;
  department?: string | null;
};
export type Customer = {
  id: string;
  businessName: string;
  legalName: string;
  rut: string;
  accountStatus: string;
  creditStatus: string;
  medicationPermission: boolean;
  phone?: string;
  address?: string;
  city?: string;
  department?: string;
  addresses?: CustomerAddress[];
  creditLimit?: number;
  internalCreditNote?: string;
  users?: { id: string; email: string }[];
};
export type User = {
  id: string;
  email: string;
  role: "ADMIN" | "SALES" | "CATALOG" | "FINANCE" | "CLIENT";
  permissions: Permission[];
  customerAccount?: Customer;
  active?: boolean;
  emailVerified?: boolean;
  demoPasswordHash?: string;
};
export type Variant = {
  id: string;
  name: string;
  sku: string;
  ean?: string;
  presentation?: string;
  availableStock: number;
  physicalStock?: number;
  reservedStock?: number;
  saleMultiple: number;
  minimumOrderQuantity: number;
  active?: boolean;
  price?: { amount: number; currency: string };
};
export type Media = {
  id: string;
  url: string;
  alt?: string;
  type: "IMAGE" | "VIDEO";
  isPrimary?: boolean;
  variantId?: string;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  description?: string;
  productType: string;
  brand?: Entity | null;
  laboratory?: Entity | null;
  categories: { categoryId: string; category?: Entity }[];
  attributes?: {
    attributeValue: { id: string; value: string; attribute: Entity };
  }[];
  variants: Variant[];
  media: Media[];
  requiresMedicationPermission: boolean;
  medicationRestricted?: boolean;
  featured?: boolean;
  newProduct?: boolean;
  active?: boolean;
  source?: string;
  sourceUrl?: string;
};
export type ProductList = {
  items: Product[];
  meta: { total: number; page: number; limit: number };
};
export type ProductCardData = Pick<
  Product,
  "id" | "slug" | "name" | "featured" | "requiresMedicationPermission" | "brand" | "laboratory"
> & {
  media: Pick<Media, "id" | "url" | "alt" | "type">[];
  variants: Pick<Variant, "id" | "active" | "price">[];
};
export type ProductCardList = {
  items: ProductCardData[];
  meta: ProductList["meta"];
};
export type Attribute = Entity & { values: { id: string; value: string }[] };
export type CartItem = {
  id: string;
  quantity: number;
  product: Pick<
    Product,
    "id" | "name" | "slug" | "requiresMedicationPermission"
  >;
  variant: Variant;
  unitPrice: number;
  currency: string;
  subtotal: number;
};
export type Cart = { id: string; items: CartItem[]; total: number };
export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  createdAt: string;
  total: number;
  paidTotal?: number | string;
  creditedTotal?: number | string;
  refundedTotal?: number | string;
  subtotal: number;
  discountTotal: number;
  currency: string;
  requiresManualReview?: boolean;
  acceptedManualReview?: boolean;
  reviewReason?: string | null;
  deliveryAddressId?: string | null;
  deliveryLabel?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryDepartment?: string | null;
  customerAccount?: Customer;
  user?: { email: string };
  payments?: { id: string; amount: number | string; createdAt: string; recordedByEmail?: string | null; voidedAt?: string | null; voidedByEmail?: string | null; voidReason?: string | null }[];
  invoices?: { id: string; invoiceNumber?: string | null; originalName?: string | null; mimeType?: string | null; size?: number | null; createdAt: string; uploadedByEmail?: string | null; voidedAt?: string | null; voidedByEmail?: string | null; voidReason?: string | null; replacesInvoiceId?: string | null; replacementReason?: string | null }[];
  creditNotes?: { id: string; amount: number | string; noteNumber?: string | null; reason: string; originalName?: string | null; createdAt: string; recordedByEmail?: string | null }[];
  refunds?: { id: string; amount: number | string; reason: string; reference?: string | null; createdAt: string; recordedByEmail?: string | null }[];
  items: {
    id?: string;
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    sku: string;
  }[];
};
export type Application = {
  id: string;
  businessName: string;
  legalName: string;
  rut: string;
  email: string;
  contactName?: string;
  phone?: string;
  address?: string;
  department?: string;
  city?: string;
  businessType?: string;
  requestedMedicationPermission: boolean;
  status: string;
  rejectionReason?: string;
  documents?: { type: string; fileUrl: string; originalName: string }[];
};
export type ContactInquiryStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";
export type CreateContactInquiryInput = {
  name: string;
  businessName?: string;
  email: string;
  phone?: string;
  locality?: string;
  message: string;
  website?: string;
};
export type UpdateContactInquiryInput = {
  status?: ContactInquiryStatus;
  internalNote?: string;
};
export type ContactInquiry = CreateContactInquiryInput & {
  id: string;
  status: ContactInquiryStatus;
  internalNote?: string | null;
  handledById?: string | null;
  handledBy?: { id: string; email: string } | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type Rule = {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  triggerType?: string;
  triggerId?: string;
  minimumQuantity?: number;
  products?: { productId: string; variantId?: string }[];
  conditions?: {
    targetType: string;
    targetId?: string;
    metric: string;
    minQuantity?: number;
    minAmount?: number;
  }[];
  rewards?: {
    targetType: string;
    targetId?: string;
    rewardType: string;
    percentage?: number;
    amount?: number;
  }[];
};
export type Expiration = {
  id: string;
  productId?: string;
  variantId?: string;
  batch?: string;
  expirationDate: string;
  startsAt: string;
  endsAt?: string;
  discountPercentage?: number;
  promotionalPrice?: number;
  quantityLimit?: number;
  active?: boolean;
};
