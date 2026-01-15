import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: String,
    salary: {
      type: Number,
      default: 0,
    },
    salaryStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    salaryMonth: {
      type: String, // Format: "2025-12"
      default: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      },
    },
    role: {
      type: String,
      enum: ["teacher", "staff", "admin", "student"],
      // Default olib tashlandi - har safar qo'lda belgilanadi
    },
    // Staff type - xodim lavozimi
    staffType: {
      type: String,
      enum: [
        "teacher",
        "cleaner",
        "guard",
        "cook",
        "director",
        "vice_director",
        "hr",
      ],
      default: null,
    },
    faceId: String,
    hikvisionEmployeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    avatar: String,
    email: String,
    phone: String,

    // Role-specific fields
    subject: String, // For teachers - O'qitadigan fan
    shift: String, // For guards/cleaners - Smena (Kunduzi/Kechqurun/Tungi)
    specialty: String, // For cooks - Mutaxassisligi (Milliy taomlar, etc.)

    // Student fields
    class: {
      type: String,
      default: null, // e.g., "10-A", "11-B"
    },
    studentId: {
      type: String,
      default: null, // Talaba ID raqami
    },

    // Class teacher field
    isClassTeacher: {
      type: Boolean,
      default: false,
    },
    classTeacherOf: {
      type: String,
      default: null, // Qaysi sinfga sinf rahbar: e.g., "10-A"
    },

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

// Indexes for better query performance
employeeSchema.index({ role: 1, status: 1 });
employeeSchema.index({ hikvisionEmployeeId: 1 });
employeeSchema.index({ name: 'text' });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
