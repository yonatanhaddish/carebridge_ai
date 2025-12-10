import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";
import { v4 as uuidv4 } from "uuid";

// --- Get logged-in user from JWT cookie ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

// --- Convert iCal date string to Date ---
function parseICalDate(str) {
  // Expects: 20251210T090000Z
  const match = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [_, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// --- Expand VEVENT into start/end occurrences ---
function expandVEVENT(ical) {
  const occurrences = [];
  const dtStartMatch = ical.match(/DTSTART:(\d{8}T\d{6}Z)/);
  const dtEndMatch = ical.match(/DTEND:(\d{8}T\d{6}Z)/);
  if (!dtStartMatch || !dtEndMatch) return occurrences;

  const start = parseICalDate(dtStartMatch[1]);
  const end = parseICalDate(dtEndMatch[1]);
  if (!start || !end) return occurrences;

  occurrences.push({ start, end });
  return occurrences;
}

// --- Detect duplicates & conflicts based on start/end times only ---
function detectConflicts(newICals, existingICals) {
  const conflicts = [];
  const duplicates = [];

  const normalize = (date) => date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  const newOccs = newICals.flatMap(expandVEVENT).map((o) => ({
    start: normalize(o.start),
    end: normalize(o.end),
  }));

  const existingOccs = (existingICals || [])
    .flatMap((e) => expandVEVENT(e.ical_string))
    .map((o) => ({
      start: normalize(o.start),
      end: normalize(o.end),
    }));

  newOccs.forEach((n) => {
    existingOccs.forEach((e) => {
      // Exact duplicate
      if (n.start === e.start && n.end === e.end) {
        duplicates.push({
          type: "duplicate",
          message: `Duplicate slot: ${n.start} - ${n.end}`,
        });
      }
      // Overlapping/conflict
      else if (n.start < e.end && n.end > e.start) {
        conflicts.push({
          type: "conflict",
          message: `Conflict with existing slot: ${n.start} - ${n.end}`,
        });
      }
    });
  });

  return { conflicts, duplicates };
}

// --- Inject UUID into VEVENT ---
function injectUUID(icalStrings) {
  return icalStrings.map((ical) =>
    ical.replace(/BEGIN:VEVENT/, `BEGIN:VEVENT\nUID:${uuidv4()}`)
  );
}

// --- API handler ---
export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { icalData, action = "add" } = req.body;
  if (!icalData || !Array.isArray(icalData))
    return res.status(400).json({ error: "iCal data array required" });

  try {
    const provider = await ServiceProvider.findOne({ user_id: user.user_id });
    if (!provider)
      return res.status(404).json({ error: "ServiceProvider not found" });

    if (action === "add") {
      const { conflicts, duplicates } = detectConflicts(
        icalData,
        provider.ical_availability_entries
      );

      if (duplicates.length > 0) {
        return res.status(200).json({
          success: false,
          message: `${duplicates.length} duplicate slot(s) detected`,
          duplicates,
          added: [],
          totalAvailabilityEntries: provider.ical_availability_entries.length,
        });
      }

      if (conflicts.length > 0) {
        return res.status(200).json({
          success: false,
          message: `${conflicts.length} conflict(s) detected`,
          conflicts,
          added: [],
          totalAvailabilityEntries: provider.ical_availability_entries.length,
        });
      }

      // Add UUIDs and save
      const icalWithUUID = injectUUID(icalData);

      const updated = await ServiceProvider.findOneAndUpdate(
        { user_id: user.user_id },
        {
          $push: {
            ical_availability_entries: {
              $each: icalWithUUID.map((s) => ({ ical_string: s })),
            },
          },
        },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: `Added ${icalWithUUID.length} slot(s) successfully!`,
        added: icalWithUUID.map((s) => ({ ical_string: s })),
        totalAvailabilityEntries: updated.ical_availability_entries.length,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("API Error:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
