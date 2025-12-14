import { format, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";

/**
 * Converts a booking entry into an iCal string.
 * Handles both one-time and recurring bookings.
 */
export function entryToICal(entry) {
  const uid = uuidv4();
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareBridge AI//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

  // --- One-time bookings ---
  if (entry.time_slots && entry.time_slots.length > 0) {
    entry.time_slots.forEach((slot) => {
      const start = format(
        new Date(`${entry.start_date}T${slot.start}`),
        "yyyyMMdd'T'HHmmss"
      );
      const end = format(
        new Date(`${entry.end_date}T${slot.end}`),
        "yyyyMMdd'T'HHmmss"
      );
      ical += `BEGIN:VEVENT
UID:${uid}
SUMMARY:${entry.service_level} Caregiver Booking
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
END:VEVENT
`;
    });
  }

  // --- Recurring bookings ---
  if (entry.recurring && entry.recurring.length > 0) {
    entry.recurring.forEach((rec) => {
      const daysMap = {
        Sunday: "SU",
        Monday: "MO",
        Tuesday: "TU",
        Wednesday: "WE",
        Thursday: "TH",
        Friday: "FR",
        Saturday: "SA",
      };

      const byDay = daysMap[rec.day];
      rec.time_slots.forEach((slot) => {
        const start = format(
          new Date(`${entry.start_date}T${slot.start}`),
          "yyyyMMdd'T'HHmmss"
        );
        const end = format(
          new Date(`${entry.start_date}T${slot.end}`),
          "yyyyMMdd'T'HHmmss"
        );
        const until = format(new Date(entry.end_date), "yyyyMMdd'T'HHmmss");

        ical += `BEGIN:VEVENT
UID:${uuidv4()}
SUMMARY:${entry.service_level} Caregiver Booking
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${until}
END:VEVENT
`;
      });
    });
  }

  ical += "END:VCALENDAR";

  return ical;
}
