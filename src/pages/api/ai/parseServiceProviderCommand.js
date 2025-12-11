import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: normalize a date string like "20260310T110000Z" or "20260310T110000" to UTC format
function normalizeToUTC(dateStr) {
  let cleanStr = dateStr.replace(/Z$/, "");
  const match = cleanStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`Invalid date format: ${dateStr}`);

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  try {
    const prompt = `
You are a converter that transforms natural language scheduling commands into valid iCal VEVENT entries.

COMMAND:
"${command}"

OUTPUT FORMAT:
Return ONLY a JSON array of strings.
Each string MUST be a complete VCALENDAR containing a single VEVENT.

GENERAL RULES:
- Only include dates, times, and recurrence.
- All times MUST be in 24-hour format.
- All DTSTART and DTEND MUST be full UTC format: YYYYMMDDTHHMMSSZ.
- Multiple independent bookings → multiple VCALENDAR strings.
- Replace {UUID} with a randomly generated UUIDv4.
- Omit RRULE line if not recurring.
- Return ONLY the JSON array.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let text = response.choices[0].message.content.trim();

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in model output.");

    let parsed = JSON.parse(jsonMatch[0]);

    // Inject UUIDs and normalize all DTSTART/DTEND to UTC
    parsed = parsed.map((ical) => {
      let result = ical.replace(/\{UUID\}/g, () => uuidv4());

      // Normalize DTSTART
      result = result.replace(
        /DTSTART:(\d{8}T\d{6}Z?)/,
        (_, dt) => `DTSTART:${normalizeToUTC(dt)}Z`
      );
      // Normalize DTEND
      result = result.replace(
        /DTEND:(\d{8}T\d{6}Z?)/,
        (_, dt) => `DTEND:${normalizeToUTC(dt)}Z`
      );

      // Basic VCALENDAR structure validation
      if (
        !result.includes("BEGIN:VEVENT") ||
        !result.includes("DTSTART") ||
        !result.includes("DTEND")
      ) {
        throw new Error("Invalid iCal format detected.");
      }

      return result;
    });

    res.json({ success: true, ical: parsed });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
