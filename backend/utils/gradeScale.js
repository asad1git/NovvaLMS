// Standard 4.0-scale letter grades, in descending percentage order —
// the first row whose `min` the percentage clears wins. Ordinary
// university convention; not configurable per-institution in this pass.
const SCALE = [
  { min: 93, letter: "A", points: 4.0 },
  { min: 90, letter: "A-", points: 3.7 },
  { min: 87, letter: "B+", points: 3.3 },
  { min: 83, letter: "B", points: 3.0 },
  { min: 80, letter: "B-", points: 2.7 },
  { min: 77, letter: "C+", points: 2.3 },
  { min: 73, letter: "C", points: 2.0 },
  { min: 70, letter: "C-", points: 1.7 },
  { min: 60, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0.0 },
];

/**
 * Maps a 0-100 percentage to a letter grade + its 4.0-scale grade points.
 * `percentage` may be null (nothing graded yet) — returns null in that
 * case rather than defaulting to F, since "no grade yet" and "failing
 * grade" are not the same thing.
 */
function percentageToGrade(percentage) {
  if (percentage === null || percentage === undefined) return null;
  const row = SCALE.find((r) => percentage >= r.min);
  return { letter: row.letter, points: row.points };
}

module.exports = { percentageToGrade, SCALE };
