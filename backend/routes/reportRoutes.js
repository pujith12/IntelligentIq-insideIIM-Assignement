import express from 'express';
import { uploadReport, checkReportExists, getMyReports } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes here require authentication
router.use(protect);

// Upload endpoint (uses multer single file upload under key 'pdf')
router.post('/upload', upload.single('pdf'), uploadReport);

// Check if report exists
router.get('/check/:companyName', checkReportExists);

// Get list of uploaded reports
router.get('/', getMyReports);

export default router;
