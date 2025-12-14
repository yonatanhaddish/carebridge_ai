import OpenAI from "openai";
import { addDays, format, parseISO, isAfter } from "date-fns";

// Map weekday names to numbers (0 = Sunday, 6 = Saturday)
const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeAndExpand(aiArray) {
  const concrete = [];

  aiArray.forEach((block) => {
    const startDate = parseISO(block.start_date);
    const endDate = parseISO(block.end_date);

    if (block.recurring && block.recurring.length > 0) {
      block.recurring.forEach((rec) => {
        const days = Array.isArray(rec.day)
          ? rec.day.includes("ALL")
            ? ALL_DAYS
            : rec.day
          : rec.day === "ALL"
          ? ALL_DAYS
          : [rec.day];

        for (let d = startDate; !isAfter(d, endDate); d = addDays(d, 1)) {
          const weekdayName = format(d, "EEEE");
          if (days.includes(weekdayName)) {
            concrete.push({
              date: format(d, "yyyy-MM-dd"),
              time_slots: rec.time_slots.map((ts) => ({
                start: ts.start,
                end: ts.end,
              })),
            });
          }
        }
      });
    } else {
      // Single-day fallback
      concrete.push({
        date: format(startDate, "yyyy-MM-dd"),
        time_slots: [],
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

  console.log("commandRecieved", command);

  try {
    const prompt = `
Convert this natural language availability command into JSON.


Command: "${command}"


Rules:
    - Only output availability-related data.
    - Support recurring weekdays and bounded date ranges.
    - Use ISO date format (YYYY-MM-DD) for start_date and end_date.
    - If no weekday restriction is specified for a date range (e.g., "March 10 to March 14"), output the day field as "ALL".
    - Multiple time blocks per day are allowed.
    - For a single-day availability, start_date and end_date must be identical.
    - Use 24-hour time format HH:MM.
    - IMPORTANT: Return ONLY valid JSON that strictly adheres to the schema below.

    JSON Schema:
    [
      {
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "recurring": [
          {
            "day": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday | ALL",
            "time_slots": [
              { "start": "HH:MM", "end": "HH:MM" }
            ]
          }
        ]
      }
    ]
    
    Start JSON Output now (do not include markdown ticks or explanations):
  `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4o" or "gpt-4.1"
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const text = response.choices[0].message.content.trim();
    const parsed = JSON.parse(text);
    const concreteAvailability = normalizeAndExpand(parsed);

    console.log("concreteAvailability", concreteAvailability);
    console.log("concreteAvailability", concreteAvailability[0].time_slots);

    res.json({ success: true, concreteAvailability });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
