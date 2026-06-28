import express from 'express';
import { runCompanyAnalysis, getAnalysisHistory, getAnalysisDetails } from '../controllers/analysisController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Guard all routes with authentication middleware
router.use(protect);

// Perform analysis
router.post('/run', runCompanyAnalysis);

// Fetch summary list of past analyses
router.get('/history', getAnalysisHistory);

// Fetch full detail of a specific analysis
router.get('/:id', getAnalysisDetails);

export default router;
