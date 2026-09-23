import mongoose from "mongoose";

const eventSourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: String, required: true },
    location: { type: String, required: true },
    relevance: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },
    reason: { type: String },
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ["GOVERNMENT", "AIRPORT_AUTHORITY", "AIRLINE_OFFICIAL", "REPUTABLE_MEDIA", "METEOROLOGICAL"],
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "PROVISIONAL", "UNVERIFIED"],
      default: "VERIFIED",
    },
  },
  { _id: false }
);

const eventIntelligenceRecordSchema = new mongoose.Schema(
  {
    route: { type: String, required: true, index: true },
    origin: { type: String, required: true },
    originCity: { type: String },
    destination: { type: String, required: true },
    destinationCity: { type: String },
    movementPercentage: { type: Number, required: true },
    direction: { type: String, enum: ["UP", "DOWN", "NEUTRAL"], required: true },
    isSignificant: { type: Boolean, default: false },
    thresholdApplied: { type: Number, default: 5.0 },
    explanation: {
      headline: { type: String, required: true },
      summary: { type: String, required: true },
      driverType: {
        type: String,
        enum: [
          "DEMAND_PRESSURE",
          "SUPPLY_DISRUPTION",
          "INFRASTRUCTURE_CONSTRAINT",
          "WEATHER_ADVISORY",
          "AIRLINE_CAPACITY_SHIFT",
          "SEASONAL_PEAK",
          "UNVERIFIED_EXTERNAL_FACTOR",
          "NORMAL_MARKET_VARIATION",
          "EXTERNAL_SERVICE_OFFLINE",
        ],
        default: "UNVERIFIED_EXTERNAL_FACTOR",
      },
      confidence: {
        type: String,
        enum: ["HIGH", "MEDIUM", "LOW", "UNVERIFIED"],
        default: "LOW",
      },
      causality: { type: String, default: "POTENTIAL / NOT PROVEN" },
      evidenceStrength: { type: Number, min: 0, max: 1, default: 0 },
      dimensionalInterpretation: { type: String },
      disclaimer: { type: String, required: true },
    },
    events: [eventSourceSchema],
    affectedDimensions: {
      routes: [String],
      airlines: [String],
      platforms: [String],
      leadBuckets: [String],
      cabins: [String],
      carrierConcentration: { type: String },
      leadTimeConcentration: { type: String },
    },
    statisticalSignal: {
      currentFare: Number,
      baseFare: Number,
      fareDelta: Number,
      observationDate: String,
      timeWindow: String,
      leadBucketDeltas: mongoose.Schema.Types.Mixed,
    },
    retrievalMethod: {
      type: String,
      enum: ["LIVE_GEMINI_SEARCH", "VERIFIED_INTELLIGENCE_BASE", "NO_EVENT_DETECTED", "OFFLINE_FALLBACK"],
      default: "VERIFIED_INTELLIGENCE_BASE",
    },
    analyzedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  {
    timestamps: true,
    collection: "event_intelligence_records",
  }
);

// Compound index for efficient lookup of active cached records
eventIntelligenceRecordSchema.index({ route: 1, analyzedAt: -1 });

export default mongoose.models.EventIntelligenceRecord ||
  mongoose.model("EventIntelligenceRecord", eventIntelligenceRecordSchema);
