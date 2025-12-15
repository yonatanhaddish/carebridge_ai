// pages/api/ai/parseServiceSeekerCommand.js
import OpenAI from "openai";
import { parseISO, addDays, isAfter, format } from "date-fns";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Map weekday names to numbers (0 = Sunday)
const WEEKDAY_MAP = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// --- Expand recurring into concrete dates ---
function expandRequests(requestArray) {
  const concrete = [];
  if (!Array.isArray(requestArray)) return concrete;

  requestArray.forEach((entry) => {
    if (!entry || !entry.start_date || !entry.end_date) return;
    const startDate = parseISO(entry.start_date);
    const endDate = parseISO(entry.end_date);

    // One-time or date-range time_slots
    if (Array.isArray(entry.time_slots) && entry.time_slots.length > 0) {
      for (
        let current = startDate;
        !isAfter(current, endDate);
        current = addDays(current, 1)
      ) {
        concrete.push({
          date: format(current, "yyyy-MM-dd"),
          time_slots: entry.time_slots.map((ts) => ({
            start: ts.start,
            end: ts.end,
          })),
          service_level: entry.service_level || null,
        });
      }
    }

    // Recurring days
    if (Array.isArray(entry.recurring) && entry.recurring.length > 0) {
      for (
        let current = startDate;
        !isAfter(current, endDate);
        current = addDays(current, 1)
      ) {
        entry.recurring.forEach((rec) => {
          if (!rec?.day || !Array.isArray(rec.time_slots)) return;
          if (WEEKDAY_MAP[rec.day] === current.getDay()) {
            concrete.push({
              date: format(current, "yyyy-MM-dd"),
              time_slots: rec.time_slots.map((ts) => ({
                start: ts.start,
                end: ts.end,
              })),
              service_level: entry.service_level || null,
            });
          }
        });
      }
    }
  });

  return concrete;
}

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

// --- API handler ---
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command is required" });

  try {
    const prompt = `
You are a booking assistant AI. Convert natural language availability commands into structured JSON for service seeker requests.

Command: "${command}"

**Requirements:**
- Return ONLY valid JSON array. No markdown, no explanations.
- Each item must include:
  - start_date (YYYY-MM-DD)
  - end_date (YYYY-MM-DD)
  - time_slots: array of { start: HH:MM, end: HH:MM }
  - service_level: one of "Level 1", "Level 2", "Level 3" (extract from command)

**Rules:**
- Single date → start_date = end_date
- Date range → start_date = first date, end_date = last date
- Recurring weekdays → put in recurring[], leave time_slots empty
- Always include BOTH time_slots and recurring even if empty
- Convert all times to 24-hour format
- Extract service_level automatically from the command
- IMPORTANT: Extract the service_level from the command and include it in every object. 
- It must be "Level 1", "Level 2", or "Level 3".
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
        ],
        service_level: "Level 1"
      }
    ]
    
    Start JSON Output now (do not include markdown ticks or explanations):
  `;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const text = response.choices[0].message.content.trim();
    const parsed = JSON.parse(text);

    const concreteAvailability = normalizeAndExpand(parsed);

    console.log("parsed", parsed);

    console.log("concreteAvailability", concreteAvailability);

    res.json({ success: true, parsed, concreteAvailability });
  } catch (err) {
    console.error("AI Parsing Error:", err);
    res.status(500).json({ error: "AI parsing failed", details: err.message });
  }
}
