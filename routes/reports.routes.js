import express from 'express';
import { upload } from '../middleware/upload.js';
import { saveExcelReport, getReportStats } from '../controllers/reports.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/reports/stats
 * Hisobotlar uchun statistikalarni olish
 * Auth: admin, teacher
 */
router.get(
    '/stats',
    authenticateToken,
    requireRole('admin', 'teacher'),
    getReportStats
);

/**
 * POST /api/reports/save-excel
 * Excel hisobotni saqlash
 * Auth: admin, teacher
 */
router.post(
    '/save-excel',
    authenticateToken,
    requireRole('admin', 'teacher'),
    upload.single('excelFile'),
    saveExcelReport
);

export default router;
