import jwt from 'jsonwebtoken';

/**
 * JWT token yaratish
 */
export const generateToken = (userId, username, role) => {
    return jwt.sign(
        {
            id: userId,
            username,
            role
        },
        process.env.JWT_SECRET || 'bm-crm-secret-key-2025',
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
    );
};

/**
 * JWT token tekshirish middleware
 */
export const authenticateToken = (req, res, next) => {
    try {
        // Token headerdan olish
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token topilmadi. Iltimos tizimga kiring.'
            });
        }

        // Token verify qilish
        jwt.verify(
            token,
            process.env.JWT_SECRET || 'bm-crm-secret-key-2025',
            (err, user) => {
                if (err) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'Token yaroqsiz yoki muddati tugagan.'
                    });
                }

                // User ma'lumotlarini request'ga qo'shish
                req.user = user;
                next();
            }
        );
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
            message: 'Token tekshirishda xatolik yuz berdi.'
        });
    }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Autentifikatsiya talab qilinadi.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Sizda bu amalni bajarish uchun ruxsat yo\'q.'
            });
        }

        next();
    };
};

/**
 * Optional authentication - agar token bo'lsa verify qiladi, bo'lmasa davom etadi
 */
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // Token yo'q, davom et
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET || 'bm-crm-secret-key-2025',
        (err, user) => {
            if (!err) {
                req.user = user;
            }
            next();
        }
    );
};
