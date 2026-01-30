import OpenAI from "openai";
import jwt from "jsonwebtoken";
import cookie from "cookie"; // ✅ NEW: Import cookie parser

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // 1. Method Check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let token = null;
  if (req.headers.cookie) {
    const parsedCookies = cookie.parse(req.headers.cookie);
    token = parsedCookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "No command provided" });
  }

  const currentContext = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
            You are a scheduling assistant for Personal Support Workers in Canada.
            Today is: ${currentContext}.
            
            Your goal is to extract availability patterns from the user's text into strict JSON.

            CRITICAL TIME PARSING RULES:
            1. **Strictly respect AM/PM.** "6pm" is ALWAYS "18:00". "7am" is ALWAYS "07:00".
            2. Never assume a time is PM just because it comes first. Parse exactly what is written.
            3. If a range is "7am-11am", both are morning.
            
            General Rules:
            1. Output MUST be a JSON object with a "schedules" array.
            2. Each schedule object must have:
               - type: "specific_date" | "recurring"
               - startDate: "YYYY-MM-DD"
               - endDate: "YYYY-MM-DD" (If not specified, infer reasonable end or same as start)
               - daysOfWeek: [Number] (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday). *Only required if type is recurring.*
               - slots: [{ startTime: "HH:MM", endTime: "HH:MM" }] (24h format).
            3. Handle split shifts (e.g. "9am-12pm and 4pm-6pm") as multiple slots in one object.
            4. If the time crosses midnight (e.g. "10pm to 4am"), set endTime correctly and add "crossesMidnight": true.
            5. If the user says "Next 3 months", calculate the end date relative to Today.
            6. CRITICAL - FUTURE INTENT:
               - Never set a startDate in the past.
               - If the user specifies a month (e.g., "November") without a year:
                 a) If that month is LATER this year than "Today", use the CURRENT year.
                 b) If that month is BEFORE "Today" (or has already passed), use the NEXT year.

            7. CRITICAL - HUMAN ERROR CORRECTION (Date Swapping):
              - If the user provides a Start Date that is AFTER the End Date (e.g., "From May 20th to May 10th"), assume it was a typo.
              - You MUST SWAP the dates. Set the earlier date as 'startDate' and the later date as 'endDate'.

            8. 🛡️ REALITY CHECK & ERRORS:
              - If the user enters a non-existent date (e.g., "February 31st"), return: { "error": "Invalid Date: [Date] does not exist." }
              - If the user provides dates but NO time range, return: { "error": "Please specify a time range." }

            9. 📅 WHOLE MONTH RULE (The "March 31st" Fix):
              - If the user requests a service "for [Month]" (e.g., "for March"), set the 'endDate' to the LAST DAY of that month (e.g., 30th or 31st).
              - Do NOT set the end date to the 1st of the following month.
              - Example: "For March 2026" -> endDate: "2026-03-31", NOT "2026-04-01".
            
            Return ONLY raw JSON. No markdown formatting.
          `,
        },
        {
          role: "user",
          content: command,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0].message.content;
    const structuredData = JSON.parse(result);

    console.log("Parsed Availability:", structuredData);

    // 4. Return the structured data to the Frontend
    return res.status(200).json({
      original: command,
      data: structuredData,
    });
  } catch (error) {
    console.error("AI Parse Error:", error);
    return res.status(500).json({ error: "Failed to parse command" });
  }
}
