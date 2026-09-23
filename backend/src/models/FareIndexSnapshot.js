import mongoose from "mongoose";

/**
 * FareIndexSnapshot Schema
 * Stores immutable historical calculations of the Airfare Price Index over time.
 * Supports longitudinal inflation trend analysis, time-series plotting, and MoSPI regulatory auditability.
 */
const FareIndexSnapshotSchema = new mongoose.Schema(
  {
    calculationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    snapshotPeriod: {
      type: String,
      required: true,
      index: true,
    },
    basePeriod: {
      type: String,
      required: true,
      default: "2026-08-29",
    },
    baseIndex: {
      type: Number,
      required: true,
      default: 100.0,
    },
    currentIndex: {
      type: Number,
      required: true,
    },
    percentageChange: {
      type: Number,
      required: true,
      default: 0.0,
    },
    coverage: {
      totalBaselineCells: { type: Number, required: true },
      availableCurrentCells: { type: Number, required: true },
      missingCurrentCells: { type: Number, required: true },
      coverageRate: { type: Number, required: true },
    },
    activeCells: {
      type: Number,
      required: true,
    },
    totalCells: {
      type: Number,
      required: true,
      default: 72,
    },
    methodology: {
      type: String,
      default: "LASPEYRES_FIXED_BASE",
    },
    representativeFareMethod: {
      type: String,
      default: "MEDIAN_COMPARABLE_FARE",
    },
    weightingMethod: {
      type: String,
      default: "EQUAL_BASKET_CELL_WEIGHT",
    },
    sourceFilter: {
      type: String,
      default: "ALL",
    },
    observationCount: {
      type: Number,
      required: true,
      default: 0,
    },
    interpretation: {
      type: String,
      default: "",
    },
    highFrequencyMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    provenance: {
      triggeredBy: {
        type: String,
        enum: ["MANUAL_AUDIT", "SCHEDULED_JOB", "REST_API", "BASELINE_INIT"],
        default: "REST_API",
      },
      notes: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    collection: "fareindexsnapshots",
  }
);

export default mongoose.model("FareIndexSnapshot", FareIndexSnapshotSchema);
