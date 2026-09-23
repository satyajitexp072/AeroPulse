import mongoose from "mongoose";

const basketCellSchema = new mongoose.Schema(
  {
    route: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    cabinClass: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    leadBucket: {
      type: String,
      required: true,
      trim: true,
    },
    baseFare: {
      type: Number,
      required: true, // Representative fare (Median comparableFare) in Base Period
    },
    weight: {
      type: Number,
      required: true, // Fixed basket weight (e.g. 1/N for equal weighting)
    },
    observationCount: {
      type: Number,
      required: true,
    },
    meanFare: {
      type: Number,
      default: null,
    },
    minFare: {
      type: Number,
      default: null,
    },
    maxFare: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const fareIndexBaselineSchema = new mongoose.Schema(
  {
    basePeriod: {
      type: String,
      required: true, // e.g. "2026-08-29"
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
    baseIndex: {
      type: Number,
      default: 100,
    },
    totalBaselineCells: {
      type: Number,
      required: true,
    },
    totalWeight: {
      type: Number,
      default: 1.0,
    },
    basketCells: [basketCellSchema],
    metadata: {
      totalEligibleObservations: {
        type: Number,
        required: true,
      },
      sourceFilter: {
        type: String,
        default: "ALL_VALID_OBSERVATIONS",
      },
      routesCovered: [{ type: String }],
      cabinsCovered: [{ type: String }],
      leadBucketsCovered: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

const FareIndexBaseline = mongoose.model("FareIndexBaseline", fareIndexBaselineSchema);

export default FareIndexBaseline;
