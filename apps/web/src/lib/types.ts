export type Permission =
  "CAN_VIEW_PRICES" | "CAN_PLACE_ORDERS" | "CAN_BUY_MEDICATIONS";
export type Entity = {
  id: string;
  name: string;
  active?: boolean;
  slug?: string;
  imageUrl?: string | null;
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
  creditStatusAutomatic?: boolean;
  medicationPermission: boolean;
  phone?: string;
  address?: string;
  city?: string;
  department?: string;
  addresses?: CustomerAddress[];
  creditLimit?: number;
  internalCreditNote?: string;
  users?: { id: string; email: string }[];
  salespersonId?: string | null;
  salesperson?: { id: string; name: string; phone: string; userId: string; user: { email: string } } | null;
};
export type SalespersonSummary = {
  id: string;
  email: string;
  active: boolean;
  emailVerified: boolean;
  invitationPending?: boolean;
  profile: { id: string; name: string; phone: string; customerCount: number } | null;
};
export type SalespersonDetail = Omit<SalespersonSummary, "profile"> & {
  profile: { id: string; name: string; phone: string } | null;
  customers: { id: string; businessName: string; legalName: string; rut: string; accountStatus: string; users: { email: string }[] }[];
};
export type CustomerDetail = Customer & {
  debt?: number;
  availableCredit?: number | null;
  updatedAt?: string;
  orderCount: number;
  recentOrders: (Pick<Order, "id" | "orderNumber" | "createdAt" | "status"> & Partial<Pick<Order, "total" | "currency">>)[];
  documents: { id: string; type: string; originalName: string; mimeType: string; status: string; uploadedAt: string }[];
  creditChanges?: { id: string; action: string; createdAt: string; metadata: unknown; user?: { email: string } | null }[];
};
export type User = {
  id: string;
  email: string;
  role: "ADMIN" | "SALES" | "CATALOG" | "FINANCE" | "CUSTOM" | "CLIENT";
  customRoleId?: string | null;
  customRole?: { id: string; name: string } | null;
  staffAccess?: Record<string, { canView: boolean; canEdit: boolean }>;
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
  position?: number;
  variantId?: string;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  description?: string;
  technicalSheet?: ProductSheet | null;
  technicalSheetRevision?: number;
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
  tags?: string[];
};
export type TechnicalBlock = { label: string; html?: string; text?: string };
export type ProductSheet = {
  technical?: TechnicalBlock[];
  benefits?: { icon: string; label: string }[];
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
  > & { imageUrl?: string | null };
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
  paymentMethod?: "CASH" | "INSTALLMENTS" | null;
  paymentTermMonths?: number | null;
  installmentCount?: number | null;
  paymentSchedule?: { number: number; amountCents: number; dueAt: string }[] | null;
  paymentDueAt?: string | null;
  deliveredAt?: string | null;
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
  returns?: { id: string; requestId: string; reason: string; createdAt: string; recordedById?: string; recordedByEmail?: string | null; items: { orderItemId: string; quantity: number; restockedQuantity: number }[] }[];
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
  status: string;
  rejectionReason?: string;
  documents?: { id: string; type: string; originalName: string }[];
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
  priority?: number;
  combinable?: boolean;
  minimumCartAmount?: number;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  triggerType?: string;
  triggerId?: string;
  triggerIds?: string[];
  targetType?: string;
  targetIds?: string[];
  triggerTargets?: { id: string; name: string }[];
  targetTargets?: { id: string; name: string }[];
  minimumQuantity?: number;
  products?: { productId: string; variantId?: string; position?: number }[];
  conditions?: {
    targetType: string;
    targetId?: string;
    targetIds?: string[];
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
