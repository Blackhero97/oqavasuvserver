import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    // Sinf nomi (masalan: "8-Blue", "9-A", "10-B")
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Sinf darajasi (8, 9, 10, 11)
    grade: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    // Sinf bo'limi (A, B, Blue, Red)
    section: {
      type: String,
      required: true,
      trim: true,
    },

    // Sinf rahbari (teacher ID ga reference)
    classTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    classTeacherName: {
      type: String,
    },

    // O'quvchilar soni (avtomatik hisoblanadi)
    studentCount: {
      type: Number,
      default: 0,
    },

    // Maksimal o'quvchilar soni
    maxStudents: {
      type: Number,
      default: 30,
    },

    // Xona raqami
    roomNumber: {
      type: String,
    },

    // O'quv yili
    academicYear: {
      type: String,
      default: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      },
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Indekslar
classSchema.index({ grade: 1, section: 1 });
classSchema.index({ academicYear: 1 });

const Class = mongoose.model("Class", classSchema);

export default Class;
