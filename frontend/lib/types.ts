export interface ShippingLabel {
  labelNumber: number;
  sku: string | null;
  orderId: string | null;
  quantity: number;
  deliveryPartner: string;
}

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
}

export interface LabelError {
  labelNumber: number;
  errors: string[];
}