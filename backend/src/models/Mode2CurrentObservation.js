/**
 * Mode 2 Current Observation Mongoose Model
 * Dedicated collection 'mode2_current_observations' for current live scraped observations.
 * Evaluated strictly against the immutable 72-cell baseline from 2026-08-29.
 * GUARANTEE: Never modifies or overwrites baseline records in 'fareobservations' or 'fareindexbaselines'.
 */

import mongoose from "mongoose";
import { CURRENT_COLLECTION_NAME } from "../config/mode2Config.js";

const pricingSchema = new mongoose.Schema(
  {
    baseFare: { type: Number, default: null },
    taxes: { type: Number, default: 0 },
    mandatoryCharges: { type: Number, default: 0 },
    optionalCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalFare: { type: Number, default: null },
    comparableFare: { type: Number, required: true },
    currency: { type: String, default: "INR", trim: true },
  },
  { _id: false }
);

const mode2CurrentObservationSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      default: "MODE_2",
      immutable: true,
    },
    dataOrigin: {
      type: String,
      enum: ["REAL_SCRAPED", "SEEDED_PROTOTYPE", "MANUAL_RESEARCH"],
      default: "REAL_SCRAPED",
      index: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    airline: {
      name: { type: String, required: true },
      code: { type: String, required: true, uppercase: true },
    },
    flightNumber: {
      type: String,
      trim: true,
      default: null,
    },
    departureDateTime: {
      type: Date,
      required: true,
    },
    arrivalDateTime: {
      type: Date,
      default: null,
    },
    observationDateTime: {
      type: Date,
      required: true,
    },
    leadDays: {
      type: Number,
      required: true,
    },
    leadBucket: {
      type: String,
      required: true,
      enum: ["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"],
    },
    cabinClass: {
      type: String,
      enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"],
      default: "ECONOMY",
    },
    fareClass: {
      type: String,
      default: "STANDARD",
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    availability: {
      isAvailable: { type: Boolean, default: true },
      seatsAvailable: { type: Number, default: null },
    },
    sourcePlatform: {
      type: String,
      default: "Mode2Ingestion",
      trim: true,
    },
    collectionRunId: {
      type: String,
      default: null,
      index: true,
    },
    scraperVersion: {
      type: String,
      default: "2.0.0",
    },
    flightIdentityKey: {
      type: String,
      default: null,
      index: true,
    },
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
    deduplicationHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mode2CurrentObservationSchema.index({ route: 1, cabinClass: 1, leadBucket: 1 });
mode2CurrentObservationSchema.index({ observationDateTime: 1 });
mode2CurrentObservationSchema.index({ deduplicationHash: 1 }, { unique: true, sparse: true });

const Mode2CurrentObservation = mongoose.model(
  "Mode2CurrentObservation",
  mode2CurrentObservationSchema,
  CURRENT_COLLECTION_NAME
);

export default Mode2CurrentObservation;
