import mongoose from "mongoose";

const AirlineShareSchema = new mongoose.Schema(
  {
    airlineCode: { type: String, required: true },
    airlineName: { type: String, required: true },
    flightCount: { type: Number, required: true },
    marketSharePercent: { type: Number, required: true },
    hhiContribution: { type: Number, required: true },
  },
  { _id: false }
);

const RouteCompetitionRecordSchema = new mongoose.Schema(
  {
    route: { type: String, required: true, index: true },
    observationPeriod: { type: String, required: true },
    totalUniqueFlights: { type: Number, required: true },
    airlineBreakdown: [AirlineShareSchema],
    hhi: { type: Number, required: true },
    concentrationLevel: {
      type: String,
      enum: [
        "LOW_CONCENTRATION",
        "MODERATE_CONCENTRATION",
        "HIGH_CONCENTRATION",
        "INSUFFICIENT_DATA",
      ],
      required: true,
    },
    topAirline: {
      airlineCode: String,
      airlineName: String,
      marketSharePercent: Number,
    },
    dataCoverage: {
      flightsObserved: Number,
      carriersCount: Number,
      sourcesCount: Number,
      deduplicatedPhysicalFlights: Number,
    },
    fareMovementVsConcentration: {
      fareMovementPercent: { type: Number, default: null },
      hhi: { type: Number, default: null },
      correlationNote: {
        type: String,
        default:
          "Insufficient observations to establish a causal relationship.",
      },
    },
    thresholds: {
      lowConcentrationMax: { type: Number, default: 1500 },
      moderateConcentrationMax: { type: Number, default: 2500 },
      description: {
        type: String,
        default:
          "US DOJ / Indian CCI antitrust guidelines: HHI < 1500 = Low Concentration, 1500-2500 = Moderate Concentration, > 2500 = High Concentration.",
      },
    },
    status: { type: String, enum: ["VALID", "INSUFFICIENT_DATA"], default: "VALID" },
  },
  {
    collection: "route_competition_records",
    timestamps: true,
  }
);

export default mongoose.models.RouteCompetitionRecord ||
  mongoose.model("RouteCompetitionRecord", RouteCompetitionRecordSchema);
