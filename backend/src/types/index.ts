export interface PDFParseResult {
  text: string;
  numPages: number;
}

export interface ShippingLabel {
  labelNumber: number;
  sku: string | null;
  orderId: string | null;
  quantity: number;
  deliveryPartner: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatedLabel extends ShippingLabel {
  validation: ValidationResult;
}

// ✅ UPDATED: Added labelMappings field
export interface ParseResponse {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  numPages?: number;
  totalLabels?: number;
  validLabels?: number;
  invalidLabels?: number;
  labels?: ShippingLabel[];
  errors?: LabelError[];
  error?: string;
  details?: string;
  // ✅ NEW: Label mapping statistics
  labelMappings?: {
    saved: number;
    skipped: number;
  };
}

export interface LabelError {
  labelNumber: number;
  errors: string[];
}

// ✅ UPDATED: Added awbNumber field to ExtractedOrder
export interface ExtractedOrder {
  customer: {
    lines: string[];
  };
  returnTo?: {
    brandName?: string;
    lines: string[];
  };
  soldBy?: string;
  billTo?: string;
  returnCodes?: string[];
  barcode?: string;
  products: Array<{
    sku?: string;
    size?: string;
    quantity?: number;
    color?: string;
    orderNo?: string;
  }>;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  orderDate?: string;
  invoiceDate?: string;
  lineItems?: Array<{
    description?: string;
    hsn?: string;
    quantity?: string;
    grossAmount?: string;
    discount?: string;
    taxableValue?: string;
    taxes?: string;
    total?: string;
  }>;
  invoiceTotals?: {
    totalTax?: string;
    totalAmount?: string;
  };
  deliveryPartner?: string;
  paymentMethod?: string;
  deliveryType?: string;
  awbNumber?: string;  // ✅ NEW: AWB/Tracking number from shipping label
}

// ✅ NEW: Interface for label data mapping (used between PDF and Excel processing)
export interface LabelMapping {
  orderNo: string;
  awbNumber: string;
  sku?: string;
  deliveryPartner?: string;
}

// ✅ NEW: Interface for return order statistics in payment response
export interface ReturnOrderStats {
  created: number;
  awbMapped: number;
  awbNotFound: number;
}

// ✅ NEW: Interface for payment analysis response
export interface PaymentAnalysisResponse {
  success: boolean;
  stats: {
    totalNetOrderAmount: number;
    totalAdsCost: number;
    totalReferralEarnings: number;
    totalCompensation: number;
    totalRecoveries: number;
    paymentsCount: number;
    averagePayment: number;
  };
  paymentTrend: Array<{
    date: string;
    payment: number;
  }>;
  savedPayment: any;
  returnOrderStats: ReturnOrderStats;
  message?: string;
  error?: string;
}