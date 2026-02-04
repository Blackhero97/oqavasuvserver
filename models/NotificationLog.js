import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['telegram', 'email', 'sms', 'custom']
    },
    category: {
        type: String,
        required: true,
        enum: ['attendance', 'announcement', 'alert', 'report']
    },
    target: {
        type: String,
        required: true, // e.g., 'student', 'teacher', 'staff', 'class:6 green'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
    },
    recipients: {
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    metadata: {
        presentCount: Number,
        absentCount: Number,
        totalCount: Number,
        attendanceRate: Number
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationLogSchema.index({ sentAt: -1 });
notificationLogSchema.index({ type: 1, category: 1 });
notificationLogSchema.index({ status: 1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
