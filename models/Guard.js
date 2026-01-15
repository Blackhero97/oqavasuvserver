import mongoose from "mongoose";

const guardSchema = new mongoose.Schema(
  {
    employeeId: {
      type: Number,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    hikvisionEmployeeId: {
      type: String,
      unique: true,
    },
    shift: {
      type: String,
      enum: ["kunuz", "oqshomi", "tungi"],
      required: true, // Kunuz, O'qshomi, Tungi
    },
    salary: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Guard", guardSchema);
