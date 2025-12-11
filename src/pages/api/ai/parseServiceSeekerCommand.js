// pages/api/ai/parseServiceSeekerCommand.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map weekdays to iCal codes
const weekdayMap = {
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
  Saturday: "SA",
  Sunday: "SU",
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { command, userLocation } = req.body;
  if (!command) return res.status(400).json({ error: "Command is required" });

  try {
    // Construct prompt for OpenAI
    const prompt = `
You are a booking assistant AI. Convert the following service seeker command(s) into a JSON array of booking requests.

Each booking request must include:
- service_level ("Level 1"|"Level 2"|"Level 3")
- start_date ("YYYY-MM-DD")
- end_date ("YYYY-MM-DD")
- start_time ("HH:mm")
- end_time ("HH:mm")
- description (optional)
- recurrence_days: array of weekdays if recurring, empty array if single day

Return only valid JSON. Do NOT include markdown, explanations, or text.
COMMAND:
"${command}"
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1500,
    });

    let text = response.choices[0].message.content.trim();

    // Clean Markdown fences if present
    text = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("JSON parse failed:", text, err);
      return res.status(500).json({
        error: "Failed to parse AI JSON output",
        details: err.message,
        raw: text,
      });
    }

    // Optional: normalize recurrence days
    parsed = parsed.map((entry) => ({
      ...entry,
      recurrence_days: (entry.recurrence_days || []).map(
        (d) => weekdayMap[d] || d
      ),
    }));

    res.status(200).json({ success: true, parsed });
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: "AI parsing failed", details: err.message });
  }
}
