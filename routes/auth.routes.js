import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Yangi user ro'yxatdan o'tkazish (faqat admin)
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, fullName, role } = req.body;

        // Validation
        if (!username || !password || !email || !fullName) {
            return res.status(400).json({
                error: 'Barcha maydonlar to\'ldirilishi shart'
            });
        }

        // Username yoki email mavjudligini tekshirish
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'Username yoki email allaqachon mavjud'
            });
        }

        // Yangi user yaratish
        const user = new User({
            username,
            password, // Pre-save hook avtomatik hash qiladi
            email,
            fullName,
            role: role || 'staff'
        });

        await user.save();

        // Token yaratish
        const token = generateToken(user._id, user.username, user.role);

        res.status(201).json({
            success: true,
            message: 'User muvaffaqiyatli yaratildi',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/login
 * Tizimga kirish
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username va password talab qilinadi'
            });
        }

        // Check for static credentials
        if (username === 'oqavasuv' && password === 'suv2026') {
            return res.json({
                success: true,
                message: 'Muvaffaqiyatli kirildi (Statik)',
                token: generateToken('static-admin-id', 'oqavasuv', 'admin'),
                user: {
                    id: 'static-admin-id',
                    username: 'oqavasuv',
                    email: 'admin@oqavasuv.uz',
                    fullName: 'Oqava Suv Admin',
                    role: 'admin'
                }
            });
        }

        // User topish
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // Active user tekshirish
        if (!user.isActive) {
            return res.status(403).json({
                error: 'User faol emas. Administrator bilan bog\'laning.'
            });
        }

        // Password tekshirish
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // Last login yangilash
        user.lastLogin = new Date();
        await user.save();

        // Token yaratish
        const token = generateToken(user._id, user.username, user.role);

        res.json({
            success: true,
            message: 'Muvaffaqiyatli kirildi',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/logout
 * Tizimdan chiqish (client-side token o'chirish)
 */
router.post('/logout', (req, res) => {
    // JWT stateless, shuning uchun server-side logout yo'q
    // Client token'ni o'chiradi
    res.json({
        success: true,
        message: 'Muvaffaqiyatli chiqildi'
    });
});

/**
 * GET /api/auth/me
 * Joriy user ma'lumotlarini olish
 */
router.get('/me', async (req, res) => {
    try {
        // authenticateToken middleware orqali req.user to'ldirilgan
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                error: 'User topilmadi'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

/**
 * PUT /api/auth/change-password
 * Parolni o'zgartirish
 */
router.put('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Eski va yangi parol talab qilinadi'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User topilmadi' });
        }

        // Eski parolni tekshirish
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Eski parol noto\'g\'ri'
            });
        }

        // Yangi parolni o'rnatish
        user.password = newPassword; // Pre-save hook hash qiladi
        await user.save();

        res.json({
            success: true,
            message: 'Parol muvaffaqiyatli o\'zgartirildi'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

export default router;
