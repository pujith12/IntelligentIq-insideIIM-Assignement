import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Please provide the company name'],
      trim: true,
      uppercase: true, // Standardize uppercase to make searches case-insensitive
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    vectorIndexPath: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to speed up company queries by user
reportSchema.index({ companyName: 1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
