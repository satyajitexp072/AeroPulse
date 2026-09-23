import mongoose from "mongoose";
import { HISTORICAL_COLLECTION_NAME } from "../config/mode1Config.js";

const historicalPricingSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, default: null },
    taxes: { type: Number, default: null },
    mandatoryCharges: { type: Number, default: null },
    totalFare: { type: Number, required: true },
    comparableFare: { type: Number, required: true },
    currency: { type: String, default: "INR", trim: true },
  },
  { _id: false }
);

const historicalSourceSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "EaseMyTrip" },
    datasetName: { type: String, default: "EaseMyTrip Historical Airfare Dataset" },
    sourcePeriod: { type: String, default: "2022" },
    sourcePlatform: { type: String, default: "EaseMyTrip" },
    author: { type: String, default: "Shubham Bathwal" },
    sourceReference: { type: String, default: "https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction" },
    methodology: { type: String, default: "externally collected historical fare observations via Octoparse web scraping" },
    provenanceNote: {
      type: String,
      default: "Historical externally sourced airfare observations; observation date is inferred from the documented dataset structure and days_left relationship. Exact observation time is unavailable.",
    },
  },
  { _id: false }
);

const mode1HistoricalObservationSchema = new mongoose.Schema(
  {
    mode: { type: String, default: "MODE_1", immutable: true },
    origin: { type: String, required: true, trim: true, uppercase: true },
    destination: { type: String, required: true, trim: true, uppercase: true },
    route: { type: String, required: true, trim: true, uppercase: true, index: true },
    airline: {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true, uppercase: true },
    },
    flightNumber: { type: String, trim: true, default: null },
    departureDateTime: { type: Date, required: true },
    travelDate: { type: String, required: true, index: true },
    arrivalDateTime: { type: Date, default: null },
    observationDateTime: { type: Date, required: true },
    observedAt: { type: Date, required: true, index: true },
    leadDays: { type: Number, required: true },
    leadBucket: {
      type: String,
      required: true,
      enum: ["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"],
      index: true,
    },
    cabinClass: {
      type: String,
      required: true,
      enum: ["ECONOMY", "BUSINESS"],
      index: true,
    },
    stops: {
      type: String,
      enum: ["non-stop", "1-stop", "2+-stop"],
      default: "non-stop",
    },
    timeTaken: { type: String, default: null },
    pricing: { type: historicalPricingSchema, required: true },
    flightIdentityKey: { type: String, required: true, index: true },
    dataOrigin: {
      type: String,
      default: "HISTORICAL_EXTERNAL",
      enum: ["HISTORICAL_EXTERNAL"],
      immutable: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["VALID", "INVALID"],
      default: "VALID",
      index: true,
    },
    historicalSource: { type: historicalSourceSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: HISTORICAL_COLLECTION_NAME || "mode1_historical_archive",
  }
);

mode1HistoricalObservationSchema.index({ route: 1, cabinClass: 1, leadBucket: 1 });
mode1HistoricalObservationSchema.index({ observedAt: 1, route: 1 });

const Mode1HistoricalObservation = mongoose.model("Mode1HistoricalObservation", mode1HistoricalObservationSchema);
export default Mode1HistoricalObservation;
