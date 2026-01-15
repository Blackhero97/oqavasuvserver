import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Excel reports uchun storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const reportsDir = 'C:\\hisobot';

        // Papka yo'q bo'lsa yaratish
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
            console.log(`📁 Created reports directory: ${reportsDir}`);
        }

        cb(null, reportsDir);
    },
    filename: function (req, file, cb) {
        // Original filename'ni saqlash
        cb(null, file.originalname);
    }
});

// File filter (faqat Excel fayllar)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Faqat Excel fayllar (.xls, .xlsx) qabul qilinadi'), false);
    }
};

// Multer instance
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});
