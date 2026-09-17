/**
 * Weekly-schedule overlap checking — the "checking a manually-built
 * schedule for conflicts" half of the roadmap doc's item 6 (the other
 * half, auto-generating an optimal timetable from scratch, is explicitly
 * out of scope: a genuinely hard constraint-satisfaction problem real SIS
 * vendors have whole teams for). `startTime`/`endTime` are always
 * "HH:MM" 24-hour strings (enforced by CourseOffering's own schema), so
 * plain string comparison is a correct, zero-dependency way to compare
 * times — no Date parsing needed.
 */

function slotsOverlap(a, b) {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Returns the first conflicting {a, b} slot pair between two weekly
 * schedules, or null if none overlap. An empty schedule on either side
 * can never produce a conflict — a missing schedule is "unscheduled," not
 * "conflicts with everything."
 */
function findScheduleConflict(scheduleA, scheduleB) {
  if (!scheduleA?.length || !scheduleB?.length) return null;
  for (const a of scheduleA) {
    for (const b of scheduleB) {
      if (slotsOverlap(a, b)) return { a, b };
    }
  }
  return null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeSlot(slot) {
  return `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`;
}

module.exports = { findScheduleConflict, describeSlot, DAY_NAMES };
