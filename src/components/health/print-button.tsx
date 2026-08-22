"use client";

// "Als PDF sichern" — a plain window.print() with a print stylesheet
// (see .no-print in globals.css) rather than pulling in a PDF-generation
// library. The browser's own "Save as PDF" print destination covers the
// same outcome honestly, without a new dependency.
export function PrintButton() {
  return (
    <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
      Als PDF sichern
    </button>
  );
}
