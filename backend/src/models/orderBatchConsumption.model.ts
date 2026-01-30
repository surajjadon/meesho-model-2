import mongoose from "mongoose";

const orderBatchConsumptionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    inventoryItem: {
      type: String,
      required: true,
      index: true
    },

    batchId: {
      type: String,          // batc-301, batc-302
      required: true,
      index: true
    },

    qtyConsumed: {
      type: Number,
      required: true,
      min: 1
    },

    costPerUnit: {
      type: Number,
      required: true
    },

    consumedDate: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true   // createdAt, updatedAt
  }
);

export const OrderBatchConsumption = mongoose.model(
  "OrderBatchConsumption",
  orderBatchConsumptionSchema
);
