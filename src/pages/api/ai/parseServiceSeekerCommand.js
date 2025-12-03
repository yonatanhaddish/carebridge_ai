// api/ai/parseServiceSeekerCommand.js - COMPLETE UPDATED CODE
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
You are a booking assistant AI. Convert the natural language booking command into a JSON array of booking requests.

COMMAND TO PARSE: "${command}"

USER'S DEFAULT LOCATION (use when no specific address mentioned):
- Address: ${userLocation.home_address}
- Postal Code: ${userLocation.postal_code}
- Latitude: ${userLocation.location_latitude}
- Longitude: ${userLocation.location_longitude}

RULES:
1. OUTPUT MUST BE A VALID JSON ARRAY, even for single requests
2. Each booking request becomes a separate object in the array
3. Handle multiple bookings in one command (e.g., "Level 2 on Monday and Level 3 on Tuesday")
4. For recurring: include all specified days with their time slots
5. For single date: set start_date = end_date
6. Day names MUST be correct for the given dates (e.g., Jan 2 2026 is actually a Friday)
7. Times in 24-hour format: "10am" → "10:00", "2pm" → "14:00", "10pm" → "22:00"

DATE EXAMPLES (2025-2026):
- "December 4th 2025" → 2025-12-04 (Thursday)
- "January 2 to January 5, 2026" → 2026-01-02 to 2026-01-05 (Friday to Monday)
- "10th February, 2026" → 2026-02-10 (Tuesday)

TIME CONVERSIONS:
- "10am-2pm" → start: "10:00", end: "14:00"
- "10am to 2pm" → start: "10:00", end: "14:00"
- "10am to 10pm" → start: "10:00", end: "22:00"

SAMPLE INPUTS AND OUTPUTS:

1. INPUT: "Book me a Level 2 caregiver every Monday and Thursday from January2 to January 5 10am-2pm"
   OUTPUT: [
     {
       "request_type": "book",
       "service_level": "Level 2",
       "start_date": "2026-01-02",
       "end_date": "2026-01-05",
       "recurring": [
         {"day": "Friday", "time_slots": [{"start": "10:00", "end": "14:00"}]},
         {"day": "Monday", "time_slots": [{"start": "10:00", "end": "14:00"}]}
       ],
       "location": {
         "home_address": "${userLocation.home_address}",
         "postal_code": "${userLocation.postal_code}",
         "location_latitude": ${userLocation.location_latitude},
         "location_longitude": ${userLocation.location_longitude}
       }
     }
   ]

2. INPUT: "Book me a Level 2 caregiver December 4th 2025 from 10am-2pm"
   OUTPUT: [
     {
       "request_type": "book",
       "service_level": "Level 2",
       "start_date": "2025-12-04",
       "end_date": "2025-12-04",
       "recurring": [
         {"day": "Thursday", "time_slots": [{"start": "10:00", "end": "14:00"}]}
       ],
       "location": {
         "home_address": "${userLocation.home_address}",
         "postal_code": "${userLocation.postal_code}",
         "location_latitude": ${userLocation.location_latitude},
         "location_longitude": ${userLocation.location_longitude}
       }
     }
   ]

3. INPUT: "Book me a Level 2 caregiver every Monday and Thursday from January2 to January 5, 2026 10am-2pm and Level 3 caregiver for 10th February, 2026 from 10am to 10pm"
   OUTPUT: [
     {
       "request_type": "book",
       "service_level": "Level 2",
       "start_date": "2026-01-02",
       "end_date": "2026-01-05",
       "recurring": [
         {"day": "Friday", "time_slots": [{"start": "10:00", "end": "14:00"}]},
         {"day": "Monday", "time_slots": [{"start": "10:00", "end": "14:00"}]}
       ],
       "location": {
         "home_address": "${userLocation.home_address}",
         "postal_code": "${userLocation.postal_code}",
         "location_latitude": ${userLocation.location_latitude},
         "location_longitude": ${userLocation.location_longitude}
       }
     },
     {
       "request_type": "book",
       "service_level": "Level 3",
       "start_date": "2026-02-10",
       "end_date": "2026-02-10",
       "recurring": [
         {"day": "Tuesday", "time_slots": [{"start": "10:00", "end": "22:00"}]}
       ],
       "location": {
         "home_address": "${userLocation.home_address}",
         "postal_code": "${userLocation.postal_code}",
         "location_latitude": ${userLocation.location_latitude},
         "location_longitude": ${userLocation.location_longitude}
       }
     }
   ]

CRITICAL:
- Always return an ARRAY
- request_type is always "book" for booking commands
- service_level must be "Level 1", "Level 2", or "Level 3"
- For single days, include that specific day in recurring
- Day MUST match the actual weekday of the date

OUTPUT ONLY VALID JSON. No explanations, no markdown, no additional text.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 1000,
    });

    const text = response.choices[0].message.content.trim();

    // Clean the response
    const cleanedText = text
      .replace(/```json\n?/g, "")
      .replace(/\n?```/g, "")
      .replace(/^\[\s*{/, "[{")
      .replace(/}\s*\]$/, "}]")
      .trim();

    console.log("AI Raw Response:", text);
    console.log("Cleaned Text:", cleanedText);

    const parsed = JSON.parse(cleanedText);

    // Validate and normalize
    const normalizedEntries = parsed.map((entry) => {
      // Ensure recurring is always an array
      if (!entry.recurring || !Array.isArray(entry.recurring)) {
        entry.recurring = [];
      }

      // Ensure time_slots are properly formatted
      entry.recurring = entry.recurring.map((dayEntry) => ({
        ...dayEntry,
        time_slots: Array.isArray(dayEntry.time_slots)
          ? dayEntry.time_slots.map((slot) => ({
              start: slot.start?.replace(/[^0-9:]/g, "") || "09:00",
              end: slot.end?.replace(/[^0-9:]/g, "") || "17:00",
            }))
          : [],
      }));

      return entry;
    });

    console.log(
      "Final Parsed Entries:",
      JSON.stringify(normalizedEntries, null, 2)
    );

    res.status(200).json({
      success: true,
      parsed: normalizedEntries,
    });
  } catch (err) {
    console.error("AI Error:", err);
    console.error("Failed Command:", command);
    console.error("Error Stack:", err.stack);

    res.status(500).json({
      error: "AI parsing failed",
      details: err.message,
      command: command,
    });
  }
}
