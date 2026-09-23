import mongoose from "mongoose";

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
    sourceFile: {
      type: String,
      default: null,
    },
    rowNumber: {
      type: Number,
      default: null,
    },
    observationId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    platformType: {
      type: String,
      default: null,
    },
    rawNotes: {
      type: String,
      default: null,
    },
    batchId: {
      type: String,
      default: null,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const fareObservationSchema = new mongoose.Schema(
  {
    // Ingestion Mode (Static upload vs Dynamic scraper)
    sourceType: {
      type: String,
      required: [true, "sourceType is required"],
      enum: {
        values: ["STATIC", "DYNAMIC"],
        message: "sourceType must be either STATIC or DYNAMIC",
      },
    },

    // Provenance Platform/Source Name (e.g., 'MakeMyTrip', 'IndiGo Portal', 'dgca_august_2026.csv')
    sourcePlatform: {
      type: String,
      required: [true, "sourcePlatform is required"],
      trim: true,
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
        trim: true,
        default: null,
      },
    },

    // Flight number (e.g., '6E-2045')
    flightNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // Route origin and destination codes (e.g., 'DEL', 'BOM')
    origin: {
      type: String,
      required: [true, "Origin airport is required"],
      trim: true,
      uppercase: true,
    },
    destination: {
      type: String,
      required: [true, "Destination airport is required"],
      trim: true,
      uppercase: true,
    },
    route: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    // Temporal timestamps
    departureDateTime: {
      type: Date,
      required: [true, "Departure date and time is required"],
    },
    arrivalDateTime: {
      type: Date,
      default: null,
    },
    observationDateTime: {
      type: Date,
      required: [true, "Observation date and time is required"],
      default: Date.now,
    },

    // Booking window / lead-time information
    leadDays: {
      type: Number,
      default: null,
    },
    leadBucket: {
      type: String,
      default: null, // e.g., 'T-1', 'T-3', 'T-7', 'T-14', 'T-30'
    },

    // Travel and fare classes
    cabinClass: {
      type: String,
      enum: {
        values: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
        message: "Invalid cabinClass",
      },
      default: "ECONOMY",
    },
    fareClass: {
      type: String,
      default: null, // e.g., 'SAVER', 'FLEXI', 'SUPER_SAVER'
    },

    // Fare price breakdown
    pricing: {
      type: pricingSchema,
      required: [true, "Pricing object is required"],
    },

    // Availability state
    availability: {
      type: availabilitySchema,
      default: () => ({}),
    },

    // Raw ingestion tracking
    provenance: {
      type: provenanceSchema,
      default: () => ({}),
    },

    // Observation validation/availability status
    status: {
      type: String,
      enum: ["VALID", "UNAVAILABLE"],
      default: "VALID",
    },

    // Deduplication hash for idempotency
    deduplicationHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Helpful compound indexes for query performance in Fare Basket calculations
fareObservationSchema.index({ route: 1, departureDateTime: 1 });
fareObservationSchema.index({ observationDateTime: 1 });
fareObservationSchema.index({ deduplicationHash: 1 }, { unique: true, sparse: true });

const FareObservation = mongoose.model("FareObservation", fareObservationSchema);

export default FareObservation;
