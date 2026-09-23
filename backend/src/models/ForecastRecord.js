import mongoose from "mongoose";

const ForecastPointSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    dayOffset: { type: Number, required: true },
    predictedIndex: { type: Number, required: true },
    lowerBound: { type: Number, required: true },
    upperBound: { type: Number, required: true },
    confidence: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
  },
  { _id: false }
);

const ForecastRecordSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    scope: { type: String, enum: ["NATIONAL", "ROUTE"], required: true },
    route: { type: String, default: null, index: true },
    horizonDays: { type: Number, required: true },
    model: {
      name: { type: String, default: "Damped Holt's Linear Exponential Smoothing" },
      code: { type: String, default: "DAMPED_HOLT_EXPONENTIAL_SMOOTHING" },
      parameters: {
        alpha: { type: Number, default: 0.30 },
        beta: { type: Number, default: 0.10 },
        phi: { type: Number, default: 0.85 },
      },
      confidenceLevel: { type: String, default: "95% Prediction Interval" },
    },
    status: { type: String, enum: ["AVAILABLE", "INSUFFICIENT_DATA"], required: true },
    statusMessage: { type: String, default: null },
    lastObservedIndex: { type: Number, default: null },
    lastObservedDate: { type: String, default: null },
    trainingObservationCount: { type: Number, default: 0 },
    forecastPoints: [ForecastPointSchema],
    earlyWarning: {
      level: {
        type: String,
        enum: ["NORMAL", "WATCH", "ELEVATED", "INSUFFICIENT_DATA"],
        default: "INSUFFICIENT_DATA",
      },
      projectedChangePercent: { type: Number, default: null },
      thresholds: {
        watchPercent: { type: Number, default: 5.0 },
        elevatedPercent: { type: Number, default: 12.0 },
      },
      interpretation: { type: String, default: null },
    },
    disclaimer: {
      type: String,
      default:
        "Forecast is statistical guidance, not observed airfare. Does not assert price gouging.",
    },
  },
  {
    collection: "forecast_records",
    timestamps: true,
  }
);

export default mongoose.models.ForecastRecord ||
  mongoose.model("ForecastRecord", ForecastRecordSchema);
