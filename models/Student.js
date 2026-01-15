import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    // O'quvchi asosiy ma'lumotlari
    name: {
      type: String,
      required: true,
      trim: true,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Sinf ma'lumotlari
    className: {
      type: String,
      required: true,
      trim: true,
      // Masalan: "8-Blue", "9-A", "10-B"
    },

    // Shaxsiy ma'lumotlar
    age: {
      type: Number,
      min: 5,
      max: 25,
    },
    birthDate: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "Erkak", "Ayol", "erkak", "ayol"],
    },

    // Aloqa ma'lumotlari
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },

    // Hikvision system integration
    hikvisionEmployeeId: {
      type: String,
      sparse: true,
      index: true,
      // Hikvision tizimidagi xodim ID raqami (masalan: "00000001")
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },

    // Ota-ona ma'lumotlari
    parentName: {
      type: String,
      default: "",
    },
    parentPhone: {
      type: String,
      default: "",
    },
    parentEmail: {
      type: String,
      default: "",
    },

    // Avatar (initials)
    avatar: {
      type: String,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "graduated", "transferred"],
      default: "active",
    },

    // O'quv yili
    academicYear: {
      type: String,
      default: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        // Sentyabrdan boshlab yangi o'quv yili
        return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Avatar avtomatik yaratish
studentSchema.pre("save", function () {
  if (!this.avatar && this.name) {
    const nameParts = this.name.split(" ");
    this.avatar =
      nameParts.length > 1
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : this.name.substring(0, 2).toUpperCase();
  }
});

// Indekslar
studentSchema.index({ className: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ name: "text" });

const Student = mongoose.model("Student", studentSchema);

export default Student;
