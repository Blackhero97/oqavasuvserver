/**
 * Reports Controller
 * Excel hisobotlarni saqlash va boshqarish
 */

export const saveExcelReport = (req, res) => {
    try {
        const { reportDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Fayl topilmadi'
            });
        }

        const filePath = `C:\\hisobot\\${file.filename}`;

        console.log(`📊 Excel hisobot saqlandi: ${filePath}`);
        console.log(`📅 Hisobot sanasi: ${reportDate}`);

        res.json({
            success: true,
            message: 'Hisobot muvaffaqiyatli saqlandi',
            filePath: filePath,
            reportDate: reportDate,
            filename: file.filename,
            size: file.size
        });
    } catch (error) {
        console.error('❌ Hisobot saqlashda xato:', error);
        res.status(500).json({
            success: false,
            error: 'Hisobot saqlashda xato yuz berdi',
            message: error.message
        });
    }
};
