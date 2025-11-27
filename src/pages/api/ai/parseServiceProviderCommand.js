import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
Convert this natural language booking command into JSON focusing ONLY on schedule and availability.

Command: "${command}"

Instructions:
- Ignore names, participants, or purpose.
- If the command mentions recurring days (e.g., "every Monday in January 2027"), output them as "recurring" entries with "day" and "time_slots".
- If the command mentions a date range (e.g., "from Jan 5 to Feb 10"), include "start_date" and "end_date" in ISO format (YYYY-MM-DD).
- If the command mentions multiple time blocks (e.g., Monday 3-7pm, Thursday 1-9pm), include each block under "recurring.time_slots".
- If the command specifies a single date (e.g., "on March 15, 2027 from 10am to 2pm"), set both "start_date" and "end_date" to that date.
- If the command mentions daily repetition (e.g., "every day from Jan 1 to Jan 10"), include all 7 days of the week in "recurring".
- If the command mentions weekends or weekdays, expand them into the correct days ("Saturday" + "Sunday", or "Monday"-"Friday").
- Times must always be in 24-hour format "HH:MM".
- Only output valid JSON. No explanations.

Return JSON in this format:
[
  {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
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
]
Only output valid JSON. No explanations.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4o" or "gpt-4.1"
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const text = response.choices[0].message.content.trim();
    const parsed = JSON.parse(text);

    res.json({ success: true, parsed });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
