import React from "react";
import { Info, AlertCircle } from "lucide-react";

export const PrototypeNotice = () => {
  return (
    <div className="prototype-notice-banner">
      <div className="notice-icon-col">
        <Info size={20} className="notice-icon" />
      </div>
      <div className="notice-text-col">
        <strong>AeroPulse Statistical Data Notice:</strong> Current dashboard metrics and baseline calculations are computed directly from the validated <strong>SIH26056 Research Dataset</strong> and active Playwright browser automation across approved platforms (<strong>IndiGo, Air India, Akasa Air, Goibibo, MakeMyTrip</strong>) stored in MongoDB. Zero synthetic data permitted.
      </div>
    </div>
  );
};
