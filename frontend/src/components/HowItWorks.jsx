import React from "react";
import { Download, Sliders, Scale, Calculator, Eye } from "lucide-react";

/**
 * HowItWorks Component
 * Educational section explaining the 5-step Laspeyres index methodology.
 */
export const HowItWorks = () => {
  const steps = [
    {
      num: "01",
      icon: Download,
      title: "Collect",
      desc: "Airfare observations are collected from monitored airline portals and online travel platforms across canonical booking windows.",
    },
    {
      num: "02",
      icon: Sliders,
      title: "Normalize",
      desc: "Observations are standardized across routes, cabin classes, and booking lead times with strict schema validation and sanity gating.",
    },
    {
      num: "03",
      icon: Scale,
      title: "Compare",
      desc: "Current median airfare observations are evaluated against the immutable fixed base-period prices established on 29 August 2026.",
    },
    {
      num: "04",
      icon: Calculator,
      title: "Calculate",
      desc: "The fixed-base Laspeyres price index is calculated with fixed passenger volume weights, preventing period-to-period drift.",
    },
    {
      num: "05",
      icon: Eye,
      title: "Understand",
      desc: "Policy analysts, regulators, and travelers explore airfare movement, market concentration (HHI), and early-warning forecast signals.",
    },
  ];

  return (
    <section className="portal-section section-how-it-works" id="how-it-works">
      <div className="portal-container">
        <div className="portal-section-header">
          <div className="section-kicker">
            <span>METHODOLOGICAL PROCESS</span>
          </div>
          <h2 className="section-title">How the Airfare Price Index Works</h2>
          <p className="section-subtitle">
            A standardized, five-stage analytical pipeline engineered to provide transparent price intelligence for Indian aviation.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div key={st.num} className="step-card">
                <div className="step-top-row">
                  <span className="step-num">{st.num}</span>
                  <div className="step-icon-box">
                    <Icon size={18} />
                  </div>
                </div>
                <h3 className="step-title">{st.title}</h3>
                <p className="step-desc">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
