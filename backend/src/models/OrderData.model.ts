import { Schema, model, Document } from 'mongoose';

// Sub-schemas for better organization
interface ICustomer {
  lines: string[]; // Full address split into lines
}

interface IReturnTo {
  brandName?: string;
  lines: string[];
}

interface IProduct {
  sku?: string;
  size?: string;
  quantity?: number;
  color?: string;
  orderNo?: string;
}

interface ILineItem {
  description?: string;
  hsn?: string;
  quantity?: string;
  grossAmount?: string;
  discount?: string;
  taxableValue?: string;
  taxes?: string;
  total?: string;
}

interface IInvoiceTotals {
  totalTax?: string;
  totalAmount?: string;
}

export interface IOrderData extends Document {
  // Customer & Address Info
  customer: ICustomer;
  returnTo?: IReturnTo;
  soldBy?: string;
  billTo?: string;
  
  // Order Identifiers
  returnCodes?: string[];
  barcode?: string;
  
  // Products (Array - can have multiple items per order)
  products: IProduct[];
  
  // Business & Invoice Info
  gstin: string;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  orderDate?: string;
  invoiceDate?: string;
  
  // Line Items (Pricing breakdown)
  lineItems?: ILineItem[];
  
  // Totals
  invoiceTotals?: IInvoiceTotals;
  
  // Delivery Info
  deliveryPartner?: string;
  paymentMethod?: string;
  deliveryType?: string;
  
  // Processing Status
  inventoryProcessed: boolean;
}

const OrderDataSchema = new Schema<IOrderData>(
  {
    customer: {
      type: {
        lines: [String]
      },
      required: true
    },
    returnTo: {
      type: {
        brandName: { type: String },
        lines: [String]
      }
    },
    soldBy: { type: String },
    billTo: { type: String },
    returnCodes: [String],
    barcode: { type: String },
    
    products: [{
      sku: { type: String, required: false },
      size: { type: String },
      quantity: { type: Number },
      color: { type: String },
      orderNo: { type: String }
    }],
    
    gstin: { type: String, required: true },
    purchaseOrderNo: { type: String, required: false },
    invoiceNo: { type: String, required: false },
    orderDate: { type: String, required: false },
    invoiceDate: { type: String, required: false },
    
    lineItems: [{
      description: String,
      hsn: String,
      quantity: String,
      grossAmount: String,
      discount: String,
      taxableValue: String,
      taxes: String,
      total: String
    }],
    
    invoiceTotals: {
      type: {
        totalTax: { type: String },
        totalAmount: { type: String }
      }
    },
    
    deliveryPartner: { type: String },
    paymentMethod: { type: String },
    deliveryType: { type: String },
    
    inventoryProcessed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for performance
OrderDataSchema.index({ gstin: 1 });
OrderDataSchema.index({ purchaseOrderNo: 1, invoiceNo: 1 }, { unique: true, sparse: true });
OrderDataSchema.index({ 'products.orderNo': 1 }); // For searching by order number

export const OrderData = model<IOrderData>('OrderData', OrderDataSchema);