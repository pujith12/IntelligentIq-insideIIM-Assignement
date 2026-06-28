import Report from '../models/Report.js';
import path from 'path';
import { processPDF } from '../services/pdfService.js';
import { createAndSaveIndex } from '../services/vectorStoreService.js';

// @desc    Upload annual report / earnings report metadata and create FAISS index
// @route   POST /api/reports/upload
// @access  Private
export const uploadReport = async (req, res, next) => {
  try {
    const { companyName } = req.body;

    // 1. Check if file was provided by Multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF document',
      });
    }

    // 2. Validate company name
    if (!companyName || companyName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a company name',
      });
    }

    const normalizedCompany = companyName.trim().toUpperCase();

    // 3. Check if a report for this company already exists and remove old metadata
    const existingReport = await Report.findOne({ companyName: normalizedCompany });
    if (existingReport) {
      console.log(`[Upload Controller] Replacing existing report for ${normalizedCompany}...`);
      await Report.deleteOne({ _id: existingReport._id });
    }

    // 4. Save initial metadata record in MongoDB
    const relativeFilePath = path.join('uploads', req.file.filename).replace(/\\/g, '/');

    const report = await Report.create({
      companyName: normalizedCompany,
      fileName: req.file.originalname,
      filePath: relativeFilePath,
      uploadedBy: req.user._id,
    });

    console.log(`[Upload Controller] Metadata created. Starting text parsing and FAISS indexing for ${normalizedCompany}...`);

    try {
      // 5. Parse and split PDF text
      const docs = await processPDF(relativeFilePath);

      // 6. Build FAISS index and save files
      const relativeVectorPath = await createAndSaveIndex(docs, report._id);

      // 7. Update report metadata with vector index path
      report.vectorIndexPath = relativeVectorPath;
      await report.save();

      console.log(`[Upload Controller] Processing complete. FAISS index created at: ${relativeVectorPath}`);

      res.status(201).json({
        success: true,
        message: 'Report uploaded and vector index created successfully',
        data: report,
      });
    } catch (processError) {
      // If processing fails, clean up the MongoDB report record to prevent stale/broken documents
      console.error('[Upload Controller] Failed to process document. Cleaning up record:', processError.message);
      await Report.deleteOne({ _id: report._id });
      throw processError; // Re-throw to be caught by global error handler
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Check if a report is already uploaded for a company
// @route   GET /api/reports/check/:companyName
// @access  Private
export const checkReportExists = async (req, res, next) => {
  try {
    const { companyName } = req.params;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a company name to check',
      });
    }

    const normalizedCompany = companyName.trim().toUpperCase();
    const report = await Report.findOne({ companyName: normalizedCompany }).populate('uploadedBy', 'name email');

    if (report) {
      return res.status(200).json({
        success: true,
        exists: true,
        data: report,
      });
    }

    res.status(200).json({
      success: true,
      exists: false,
      message: `No report found for ${normalizedCompany}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports uploaded by the logged-in user
// @route   GET /api/reports
// @access  Private
export const getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};
