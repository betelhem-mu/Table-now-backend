import mongoose, { Document, Schema } from "mongoose";

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  date: Date;
  time?: string;
  status: "scheduled" | "completed" | "cancelled";
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String,
      required: false,
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;