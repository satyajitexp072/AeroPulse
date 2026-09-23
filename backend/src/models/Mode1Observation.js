import mongoose from "mongoose";
import { COLLECTION_NAME } from "../config/mode1Config.js";

const pricingSchema = new mongoose.Schema(
  {
    baseFare: {
      type: Number,
      default: null,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    mandatoryCharges: {
      type: Number,
      default: 0,
    },
    optionalCharges: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalFare: {
      type: Number,
      default: null,
    },
    comparableFare: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    isAvailable: {
      type: Boolean,
      default: true,
    },
    seatsAvailable: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const provenanceSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      default: "Mode1Seeder",
    },
    batchId: {
      type: String,
      default: null,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const mode1ObservationSchema = new mongoose.Schema(
  {
    // Mode identifier
    mode: {
      type: String,
      default: "MODE_1",
      immutable: true,
    },

    // Route origin and destination codes (e.g., 'DEL', 'BOM')
    origin: {
      type: String,
      required: [true, "Origin airport code is required"],
      trim: true,
      uppercase: true,
    },
    destination: {
      type: String,
      required: [true, "Destination airport code is required"],
      trim: true,
      uppercase: true,
    },
    route: {
      type: String,
      required: [true, "Route identifier is required"],
      trim: true,
      uppercase: true,
    },

    // Airline identification
    airline: {
      name: {
        type: String,
        required: [true, "Airline name is required"],
        trim: true,
      },
      code: {
        type: String,
        required: [true, "Airline code is required"],
        trim: true,
        uppercase: true,
      },
    },

    // Flight number (e.g., '6E-2045')
    flightNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // Temporal timestamps
    departureDateTime: {
      type: Date,
      required: [true, "Departure date and time is required"],
    },
    travelDate: {
      type: String,
      default: null,
    },
    arrivalDateTime: {
      type: Date,
      default: null,
    },
    observationDateTime: {
      type: Date,
      required: [true, "Observation date and time is required"],
    },
    observedAt: {
      type: Date,
      default: Date.now,
    },

    // Advance booking lead information
    leadDays: {
      type: Number,
      required: [true, "leadDays is required"],
    },
    leadBucket: {
      type: String,
      required: [true, "leadBucket is required"],
      enum: ["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"],
    },

    // Travel and fare classes
    cabinClass: {
      type: String,
      enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
      default: "ECONOMY",
    },
    fareClass: {
      type: String,
      default: "STANDARD",
    },

    // Pricing breakdown
    pricing: {
      type: pricingSchema,
      required: [true, "Pricing object is required"],
    },

    // Availability state
    availability: {
      type: availabilitySchema,
      default: () => ({ isAvailable: true }),
    },

    // Ingestion mode & data origin distinction
    dataOrigin: {
      type: String,
      enum: ["REAL_SCRAPED", "REAL_HISTORICAL", "HISTORICAL_EXTERNAL", "SEEDED_PROTOTYPE", "MANUAL_RESEARCH"],
      default: "REAL_SCRAPED",
      index: true,
    },

    // Ingestion & platform provenance
    sourcePlatform: {
      type: String,
      default: "Mode1Ingestion",
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: null,
    },
    sourceResponseStatus: {
      type: Number,
      default: 200,
    },
    collectionRunId: {
      type: String,
      default: null,
      index: true,
    },
    scrapeRunId: {
      type: String,
      default: null,
    },
    collectionDate: {
      type: String,
      default: null,
      index: true,
    },
    collectionTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scraperVersion: {
      type: String,
      default: "2.0.0",
    },

    // Flight cross-source identity
    flightIdentityKey: {
      type: String,
      default: null,
      index: true,
    },
    crossValidationStatus: {
      type: String,
      default: null, // "SAME_FLIGHT_MULTI_SOURCE" | "UNIQUE_FLIGHT" | "SOURCE_CONFLICT"
    },
    sourceQuotesCount: {
      type: Number,
      default: 1,
    },
    divergencePercent: {
      type: Number,
      default: null,
    },
    participatingSources: [{ type: String }],

    // Raw captured fare before normalization
    rawFare: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Observation validity & quality status
    status: {
      type: String,
      enum: ["VALID", "UNAVAILABLE"],
      default: "VALID",
    },
    qualityStatus: {
      type: String,
      enum: [
        "VALID",
        "SOLD_OUT",
        "NO_FLIGHT",
        "PARSER_ERROR",
        "SOURCE_BLOCKED",
        "INVALID",
        "MISSING_FARE",
        "QUARANTINED",
      ],
      default: "VALID",
    },
    qualityFlags: [{ type: String }],

    provenance: {
      type: provenanceSchema,
      default: () => ({}),
    },

    // Deduplication hash for idempotency
    deduplicationHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-throughput period-over-period slicing
mode1ObservationSchema.index({ route: 1, cabinClass: 1, leadBucket: 1 });
mode1ObservationSchema.index({ route: 1, departureDateTime: 1 });
mode1ObservationSchema.index({ observationDateTime: 1 });
mode1ObservationSchema.index({ collectionDate: 1, route: 1, cabinClass: 1 });
mode1ObservationSchema.index({ scrapeRunId: 1 });
mode1ObservationSchema.index({ deduplicationHash: 1 }, { unique: true, sparse: true });

const Mode1Observation = mongoose.model("Mode1Observation", mode1ObservationSchema, COLLECTION_NAME);

export default Mode1Observation;
