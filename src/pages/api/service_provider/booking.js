import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import cookie from "cookie";
import axios from "axios";
import { verifyToken } from "../../../lib/jwt";
import { v4 as uuidv4 } from "uuid";
import { rrulestr, RRule } from "rrule";

// ------------------- UTILS -------------------

// Parse logged-in user from JWT cookie
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// Convert date string YYYYMMDDTHHMMSSZ to JS Date
function parseUTC(dateStr) {
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) throw new Error(`Invalid UTC format: ${dateStr}`);
  const [_, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// Map JS getDay() to iCal BYDAY codes
const JS_DAY_TO_ICAL = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Expand VEVENT to all occurrences
function expandVEVENT(ical) {
  const occurrences = [];

  const dtStartMatch = ical.match(/DTSTART:(\d{8}T\d{6}Z)/);
  const dtEndMatch = ical.match(/DTEND:(\d{8}T\d{6}Z)/);
  if (!dtStartMatch || !dtEndMatch) return occurrences;

  const dtStart = parseUTC(dtStartMatch[1]);
  const dtEnd = parseUTC(dtEndMatch[1]);
  const duration = dtEnd.getTime() - dtStart.getTime();

  const rruleMatch = ical.match(/RRULE:([^\n]+)/);
  if (!rruleMatch) {
    occurrences.push({ start: dtStart, end: dtEnd });
  } else {
    const rule = rrulestr(rruleMatch[1], { dtstart: dtStart });
    rule
      .all()
      .forEach((d) =>
        occurrences.push({ start: d, end: new Date(d.getTime() + duration) })
      );
  }

  return occurrences;
}

// Detect overlap
function hasOverlap(newOcc, existingOcc) {
  return newOcc.start < existingOcc.end && newOcc.end > existingOcc.start;
}

// ------------------- MAIN API HANDLER -------------------

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  let parsedICal;
  try {
    // Ask AI to parse the command into iCal events
    const aiRes = await axios.post(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceProviderCommand`,
      { command }
    );
    parsedICal = aiRes.data.ical;
  } catch (err) {
    console.error("AI Parsing Error:", err);
    return res.status(500).json({ error: "AI failed to parse command" });
  }

  if (!Array.isArray(parsedICal) || parsedICal.length === 0)
    return res
      .status(400)
      .json({ error: "Parsed AI schedule is empty or invalid" });

  try {
    // Inject UUIDs into each VEVENT
    const icalWithUUIDs = parsedICal.map((ical) =>
      ical.replace(/BEGIN:VEVENT/, `BEGIN:VEVENT\nUID:${uuidv4()}`)
    );

    // Fetch provider
    const provider = await ServiceProvider.findOne({ user_id: user.user_id });
    if (!provider)
      return res.status(404).json({ error: "ServiceProvider not found" });

    // Expand new events
    const newOccurrences = icalWithUUIDs.flatMap(expandVEVENT);

    // Expand existing events
    const existingOccurrences = (
      provider.ical_availability_entries || []
    ).flatMap((e) => expandVEVENT(e.ical_string));

    // Check for conflicts
    const nonConflictingICal = [];
    const conflicts = [];

    icalWithUUIDs.forEach((ical, idx) => {
      const occ = expandVEVENT(ical);
      const isConflict = occ.some((n) =>
        existingOccurrences.some((e) => hasOverlap(n, e))
      );

      if (isConflict) {
        conflicts.push({
          message: `Conflict detected for event ${idx + 1}`,
          ical_string: ical,
        });
      } else {
        nonConflictingICal.push(ical);
      }
    });

    // Save non-conflicting entries
    if (nonConflictingICal.length > 0) {
      const updated = await ServiceProvider.findOneAndUpdate(
        { user_id: user.user_id },
        {
          $push: {
            ical_availability_entries: {
              $each: nonConflictingICal.map((s) => ({ ical_string: s })),
            },
          },
        },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        added: nonConflictingICal,
        conflicts,
        totalAvailabilityEntries: updated.ical_availability_entries.length,
        message: `${nonConflictingICal.length} event(s) added, ${conflicts.length} conflict(s) skipped.`,
      });
    } else {
      return res.status(200).json({
        success: false,
        added: [],
        conflicts,
        totalAvailabilityEntries: provider.ical_availability_entries.length,
        message: `All events conflicted with existing availability. None were added.`,
      });
    }
  } catch (err) {
    console.error("Internal Error:", err);
    return res.status(500).json({ error: "Failed to process schedule update" });
  }
}
