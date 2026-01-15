import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: Number,
        required: true,
        index: true
    },
    hikvisionEmployeeId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    department: String,
    role: String,
    date: {
        type: String,  // YYYY-MM-DD format
        required: true,
        index: true
    },

    // Time tracking
    firstCheckIn: String,    // HH:MM - birinchi kelgan vaqt
    lastCheckOut: String,    // HH:MM - oxirgi ketgan vaqt

    // All events during the day
    events: [{
        time: String,          // HH:MM
        type: {
            type: String,
            enum: ['IN', 'OUT']
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // Status
    status: {
        type: String,
        enum: ['present', 'absent', 'partial'],
        default: 'absent'
    },
    workDuration: Number,   // Minutes worked

    // Metadata
    source: {
        type: String,
        default: 'hikvision-webhook'
    }
}, {
    timestamps: true  // Adds createdAt and updatedAt automatically
});

// Compound index for faster queries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ hikvisionEmployeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, role: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
