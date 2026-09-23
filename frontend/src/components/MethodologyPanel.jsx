import React from "react";
import { BookOpen, Calculator, ShieldCheck, Scale } from "lucide-react";

export const MethodologyPanel = () => {
  return (
    <div className="card methodology-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Index Methodology & CPI Augmentation Standards</h2>
          <p className="card-subtitle">
            Statistical guidelines under the Ministry of Statistics and Programme Implementation (MoSPI)
          </p>
        </div>
      </div>

      <div className="methodology-grid">
        <div className="method-spec-card">
          <div className="method-icon-box">
            <Calculator size={18} />
          </div>
          <div className="method-spec-content">
            <h3 className="method-spec-title">Laspeyres Fixed-Base Formula</h3>
            <div className="math-formula-box">
              Index_t = [ Σ (w_i × (p_t,i / p_0,i)) / Σ (w_i_available) ] × 100
            </div>
            <p className="method-spec-desc">
              Computes relative price changes against a fixed baseline (Base = 100.00). Missing cells are dynamically re-weighted across available cells to prevent index distortion.
            </p>
          </div>
        </div>

        <div className="method-spec-card">
          <div className="method-icon-box">
            <Scale size={18} />
          </div>
          <div className="method-spec-content">
            <h3 className="method-spec-title">Comparable Fare Specification</h3>
            <div className="math-formula-box">
              Comparable Fare = Total Fare − Optional Add-on Charges
            </div>
            <p className="method-spec-desc">
              Excludes non-mandatory optional items (e.g. seat selection, meals, extra baggage) so the index tracks genuine transport passenger pricing.
            </p>
          </div>
        </div>

        <div className="method-spec-card">
          <div className="method-icon-box">
            <ShieldCheck size={18} />
          </div>
          <div className="method-spec-content">
            <h3 className="method-spec-title">Median Representative Price</h3>
            <div className="math-formula-box">
              Representative Fare = Median (Comparable Fares in Cell)
            </div>
            <p className="method-spec-desc">
              Within each of the 72 basket cells, the Median comparable fare serves as the robust representative price point, neutralizing extreme surge spikes and promotional flash sales.
            </p>
          </div>
        </div>

        <div className="method-spec-card">
          <div className="method-icon-box">
            <BookOpen size={18} />
          </div>
          <div className="method-spec-content">
            <h3 className="method-spec-title">Basket Cell Stratification</h3>
            <div className="math-formula-box">
              72 Cells = 6 Routes × 2 Cabins × 6 Advance Lead Buckets
            </div>
            <p className="method-spec-desc">
              Stratified across 6 major domestic routes (BLR-DEL, BOM-BLR, CCU-BOM, DEL-BOM, DEL-HYD, MAA-BLR) across Economy & Business cabins and lead windows (T-1 to T-60).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
