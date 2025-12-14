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
function expandAvailability(availabilityArray) {
  const concrete = [];
  if (!Array.isArray(availabilityArray)) return concrete;

  availabilityArray.forEach((entry) => {
    if (!entry || !entry.start_date || !entry.end_date) return;

    const startDate = parseISO(entry.start_date);
    const endDate = parseISO(entry.end_date);

    // Handle one-time time slots (for specific date ranges)
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
        });
      }
    }

    // Handle recurring days
    if (Array.isArray(entry.recurring) && entry.recurring.length > 0) {
      for (
        let current = startDate;
        !isAfter(current, endDate);
        current = addDays(current, 1)
      ) {
        entry.recurring.forEach((rec) => {
          if (!rec || !rec.day || !Array.isArray(rec.time_slots)) return;

          if (WEEKDAY_MAP[rec.day] === current.getDay()) {
            concrete.push({
              date: format(current, "yyyy-MM-dd"),
              time_slots: rec.time_slots.map((ts) => ({
                start: ts.start,
                end: ts.end,
              })),
            });
          }
        });
      }
    }
  });

  return concrete;
}

// --- API handler ---
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  try {
    const prompt = `
You are a booking assistant AI that converts natural language into structured availability schedules.

**Command to parse:** "${command}"

**Convert the command into a JSON array where EACH ITEM uses this EXACT structure:**

For RECURRING schedules (e.g., "every Monday and Thursday from Jan 2 to Jan 25"):
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "time_slots": [],
  "recurring": [
    {
      "day": "Monday",
      "time_slots": [
        { "start": "HH:MM", "end": "HH:MM" }
      ]
    },
    {
      "day": "Thursday", 
      "time_slots": [
        { "start": "HH:MM", "end": "HH:MM" }
      ]
    }
  ]
}

For ONE-TIME schedules (e.g., "Feb 10 from 10am to 10pm"):
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "time_slots": [
    { "start": "HH:MM", "end": "HH:MM" }
  ],
  "recurring": []
}

For DATE RANGE schedules (e.g., "March 10 to March 14 from 9am-5pm"):
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD", 
  "time_slots": [
    { "start": "HH:MM", "end": "HH:MM" }
  ],
  "recurring": []
}

**IMPORTANT RULES:**
1. For SINGLE DATE (like "Feb 10"): start_date = end_date = that date
2. For DATE RANGE (like "Jan 2 to Jan 25"): start_date = first date, end_date = last date
3. For RECURRING (mentions weekdays like "every Monday"): put days in recurring[], keep time_slots empty
4. NEVER put weekdays in recurring[] for a single date or date range without explicit recurring mention
5. Convert all times to 24-hour format (e.g., "10:00" for 10am, "22:00" for 10pm)
6. Always include BOTH time_slots (array) and recurring (array) even if empty
7. Today's date is ${format(new Date(), "MMMM d, yyyy")}

**Examples:**
Command: "Set my availability every Monday and Thursday from January 2 to January 25, 2026 10am-2pm"
Output: [
  {
    "start_date": "2026-01-02",
    "end_date": "2026-01-25",
    "time_slots": [],
    "recurring": [
      {
        "day": "Monday",
        "time_slots": [{ "start": "10:00", "end": "14:00" }]
      },
      {
        "day": "Thursday",
        "time_slots": [{ "start": "10:00", "end": "14:00" }]
      }
    ]
  }
]

Command: "Set availability for 10th February, 2026 from 10am to 10pm"
Output: [
  {
    "start_date": "2026-02-10",
    "end_date": "2026-02-10",
    "time_slots": [{ "start": "10:00", "end": "22:00" }],
    "recurring": []
  }
]

Command: "Set availability March 10 to March 14, 2026 from 9am to 5pm"
Output: [
  {
    "start_date": "2026-03-10",
    "end_date": "2026-03-14",
    "time_slots": [{ "start": "09:00", "end": "17:00" }],
    "recurring": []
  }
]

**Now parse this command:** "${command}"

Return ONLY valid JSON array. No explanations.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1500,
    });

    const text = response.choices[0].message.content.trim();
    console.log("AI Raw Response:", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON Parse Error:", err.message);
      console.error("Raw AI Response:", text);
      return res
        .status(500)
        .json({ error: "AI returned invalid JSON", raw: text });
    }

    // Validate parsed data
    if (!Array.isArray(parsed)) {
      return res.status(400).json({
        error: "AI should return an array",
        parsed,
      });
    }

    // Validate each entry
    const validated = parsed.map((entry, index) => {
      if (!entry.start_date || !entry.end_date) {
        throw new Error(`Entry ${index} missing start_date or end_date`);
      }

      // Ensure time_slots and recurring are arrays
      return {
        start_date: entry.start_date,
        end_date: entry.end_date,
        time_slots: Array.isArray(entry.time_slots) ? entry.time_slots : [],
        recurring: Array.isArray(entry.recurring) ? entry.recurring : [],
      };
    });

    const concreteAvailability = expandAvailability(validated);

    console.log("Parsed Data:", JSON.stringify(validated, null, 2));
    console.log("Concrete Dates:", concreteAvailability.length);

    res.status(200).json({
      success: true,
      parsed: validated,
      concreteAvailability,
    });
  } catch (err) {
    console.error("AI Parsing Error:", err);
    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
