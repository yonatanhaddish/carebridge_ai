import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { command, userLocation } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  if (!userLocation) {
    return res.status(400).json({ error: "User location is required" });
  }

  try {
    const prompt = `
Convert this natural language service request into JSON.

Command: "${command}"

LOGGED-IN USER LOCATION (ALWAYS USE THIS IF COMMAND HAS NO ADDRESS):
Address: ${userLocation.home_address}
Postal Code: ${userLocation.postal_code}
Latitude: ${userLocation.location_latitude}
Longitude: ${userLocation.location_longitude}

Instructions:
- Extract service_level: "Level 1", "Level 2", "Level 3"
- Extract start_date and end_date in ISO format (YYYY-MM-DD)
- Extract recurring days and time_slots if mentioned
- Times MUST be in 24-hour format HH:MM
- ALWAYS use the logged-in user location unless command provides a different one
- request_type is "list" or "book"

Return ONLY valid JSON in this exact format:

{
  "request_type": "list" | "book",
  "service_level": "Level 1" | "Level 2" | "Level 3",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "recurring": [
    {
      "day": "Monday",
      "time_slots": [
        { "start": "HH:MM", "end": "HH:MM" }
      ]
    }
  ],
  "time_slots": [
    { "start": "HH:MM", "end": "HH:MM" }
  ],
  "location": {
    "home_address": "${userLocation.home_address}",
    "postal_code": "${userLocation.postal_code}",
    "location_latitude": ${userLocation.location_latitude},
    "location_longitude": ${userLocation.location_longitude}
  }
}

NO explanation. Only JSON.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const text = response.choices[0].message.content.trim();

    const parsed = JSON.parse(text);

    res.status(200).json({
      success: true,
      parsed,
    });
  } catch (err) {
    console.error("AI Error:", err);

    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
    });
  }
}
