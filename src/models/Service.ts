import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
  description: string;
  price: number;
  duration: number;
  category?: string;
  image?: string;
  provider: mongoose.Types.ObjectId;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model<IService>("Service", serviceSchema);

export default Service;