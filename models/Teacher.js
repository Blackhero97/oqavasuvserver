import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
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
    subject: {
      type: String,
      required: true, // Fan nomi: Matematika, Ingliz, va boshqalar
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

export default mongoose.model("Teacher", teacherSchema);
