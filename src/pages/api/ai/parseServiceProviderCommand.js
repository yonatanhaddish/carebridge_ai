import OpenAI from "openai";
import { addDays, format, parseISO, isAfter } from "date-fns";

// Map weekday names to numbers (0 = Sunday, 6 = Saturday)
const WEEKDAY_MAP = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Expands availability JSON into concrete dates with time slots.
 * @param {Array} availabilityArray - parsed JSON from AI
 * @returns {Array} concrete availability objects [{ date: "YYYY-MM-DD", time_slots: [...] }]
 */
function expandAvailability(availabilityArray) {
  const concrete = [];

  availabilityArray.forEach((entry) => {
    const startDate = parseISO(entry.start_date);
    const endDate = parseISO(entry.end_date);

    // Generate all dates in the range
    for (
      let current = startDate;
      !isAfter(current, endDate);
      current = addDays(current, 1)
    ) {
      entry.recurring.forEach((rec) => {
        if (WEEKDAY_MAP[rec.day] === current.getDay()) {
          concrete.push({
            date: format(current, "yyyy-MM-dd"),
            time_slots: rec.time_slots.map((ts) => ({ ...ts })),
          });
        }
      });
    }
  });

  return concrete;
}

// ================== API Handler ==================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Command required" });
  }

  try {
    const prompt = `
Convert this natural language availability command into JSON suitable for a service provider's availability_calendar.

Command: "${command}"

Instructions:
- Only focus on schedule and availability; ignore names, participants, or purposes.
- Support recurring patterns (e.g., "every Monday and Thursday") and single dates.
- Include "start_date" and "end_date" in ISO format (YYYY-MM-DD).
- For recurring days, output them as "recurring" entries with "day" and "time_slots".
- Each "time_slot" must have "start" and "end" in 24-hour format "HH:MM".
- If a day has multiple time blocks (e.g., "Monday 10am-2pm, 3pm-6pm"), include all under "time_slots".
- Expand phrases like "every day", "weekdays", or "weekends" into the correct days.
- For a single date (e.g., "on March 15, 2027 from 10am to 2pm"), set "start_date" and "end_date" to that date.
- Only output valid JSON, no explanations.

Return JSON in this exact format:
[
  {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "recurring": [
      {
        "day": "Monday",
        "time_slots": [
          { "start": "HH:MM", "end": "HH:MM" },
          { "start": "HH:MM", "end": "HH:MM" }
        ]
      }
    ]
  }
]
Only output valid JSON, no explanations.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const text = response.choices[0].message.content.trim();

    // Parse AI JSON safely
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (jsonErr) {
      console.error("JSON Parse Error:", jsonErr);
      return res.status(500).json({
        error: "AI returned invalid JSON",
        details: jsonErr.message,
        raw: text,
      });
    }

    // Expand recurring patterns into concrete dates
    const concreteAvailability = expandAvailability(parsed);

    res.json({ success: true, parsed, concreteAvailability });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
