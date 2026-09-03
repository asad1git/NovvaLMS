/**
 * Institution branding — read from env, never hardcoded into a template.
 * This is the concrete implementation of the white-label decision: the
 * product is single-tenant per deployment, but nothing should tie the
 * codebase itself to University of Central Punjab specifically, so a
 * future deployment for a different institute is a `.env` change, not a
 * code change. Fee challan / salary slip PDFs are exactly where a literal
 * "University of Central Punjab" string would otherwise creep in.
 */
module.exports = {
  name: process.env.INSTITUTION_NAME || "University of Central Punjab",
  address: process.env.INSTITUTION_ADDRESS || "Lahore, Pakistan",
  contactEmail: process.env.INSTITUTION_EMAIL || "info@ucp.edu.pk",
};
