import mongoose from 'mongoose';

const telegramUserSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        unique: true
    },
    username: String,
    firstName: String,
    lastName: String,
    isActive: {
        type: Boolean,
        default: true
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.model('TelegramUser', telegramUserSchema);
