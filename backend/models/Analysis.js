import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    investmentScore: {
      type: Number,
      required: true,
    },
    recommendation: {
      type: String,
      required: true,
      enum: ['Strong Buy', 'Buy', 'Hold', 'Underperform', 'Sell'],
    },
    confidence: {
      type: Number,
      required: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    risks: {
      type: [String],
      default: [],
    },
    latestNews: {
      type: [String],
      default: [],
    },
    financialSummary: {
      type: String,
      required: true,
    },
    documentInsights: {
      type: String,
      required: true,
    },
    finalReasoning: {
      type: String,
      required: true,
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report', // Reference to the PDF report metadata (if uploaded)
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Analysis = mongoose.model('Analysis', analysisSchema);
export default Analysis;
