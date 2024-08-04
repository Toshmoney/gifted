const mongoose = require("mongoose");

const { Schema, model } = mongoose;

const TransactionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    balance_before: {
      type: Number,
    },
    balance_after: {
      type: Number,
    },
    amount: {
      type: Number,
      required: [true, "transaction amount not indicated"],
    },
    service: {
      type: String,
      enum: ["wallet", "subscription", "course", "spin", "quiz"],
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      required: true,
    },
    description: {
      type: String,
      required: [true, "transaction not described"],
    },
    reference_number: {
      type: String,
      trim: true,
    },
    external_id: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Transaction = model("Transaction", TransactionSchema);

module.exports = Transaction;
