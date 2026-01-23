import OpenAI from "openai";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- 1. Auth Check ---
  let token = null;
  if (req.headers.cookie) {
    const parsedCookies = cookie.parse(req.headers.cookie);
    token = parsedCookies.token;
  }
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { command } = req.body;

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
            You are a Booking Assistant. Today is: ${currentContext}.
            Parse the user's request into strict JSON.

            ### PART 1: INTENT & PREFERENCES
            1. **INTENT DETECTION
               - If the user implies immediate action ("Book me", "I need someone", "Reserve", "Get me a provider"): set "intent": "book".
               - If the user implies browsing ("Show me", "List", "Search", "Who is available"): set "intent": "list".
               - Default to "list" if unsure.

            2. **SERVICE LEVEL (Rule #2)**
               - Look for keywords to map to 3 tiers:
                 * "Junior", "Basic", "Level 1" -> "Level 1"
                 * "Senior", "Experienced", "Level 2" -> "Level 2"
                 * "Specialist", "Nurse", "Advanced", "Level 3" -> "Level 3"
               - If NO level is specified, DEFAULT to "Level 1".

            3. **LOCATION EXTRACTION (Rule #1)**
               - **Explicit:** If the user mentions a city, postal code, or address (e.g., "in Markham", "at 123 Main St"), extract it as "location_query".
               - **Implicit:** If they say "near me", "at my house", or mention NO location, set "location_query": null. (The system will use their profile address).

            ### PART 2: COMPLEX SCHEDULE PARSING (The Provider Logic)
            You must handle complex recurring patterns exactly like an availability parser.

            - **Split Shifts:** "Mondays 9am-12pm AND 4pm-6pm" -> Two slots in one schedule object.
            - **Recurring:** "Every Monday and Wednesday" -> daysOfWeek: [1, 3].
            - **Duration:** If user says "For 2 months", calculate endDate. If unspecified, default to 1 month from now.
            - **Future Logic:** If "November" is passed, assume next year.
            - **Typo Fix:** Swap startDate/endDate if user mixed them up.
            - **Time Format:** Strict 24h (HH:mm).
            - **MIDNIGHT RULE (CRITICAL):** If a shift crosses midnight (e.g. "10pm to 4am"), set endTime to "04:00" and add "crossesMidnight": true to that slot.

            ### PART 3: REALITY CHECK (CRITICAL)
            - **Validate Dates:** Check if the date actually exists on the calendar.
            - **Example:** February 30th/31st is IMPOSSIBLE. June 31st is IMPOSSIBLE.
            - **Action:** If the user requests a non-existent date, DO NOT generate a schedule. Instead, set "error": "Invalid Date: [Explanation]".

            Output JSON Structure:
            {
              "intent": "book" | "list",
              "service_level": "Level 1" | "Level 2" | "Level 3",
              "location_query": "string" | null,
              "schedules": [
                {
                  "type": "specific_date" | "recurring",
                  "startDate": "YYYY-MM-DD",
                  "endDate": "YYYY-MM-DD",
                  "daysOfWeek": [Number],
                  "slots": [
                    { "startTime": "HH:MM", "endTime": "HH:MM" }
                  ]
                }
              ]
            }
          `,
        },
        { role: "user", content: command },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const structuredData = JSON.parse(completion.choices[0].message.content);

    return res.status(200).json({
      success: true,
      data: structuredData,
    });
  } catch (error) {
    console.error("AI Parse Error:", error);
    return res.status(500).json({ error: "Failed to parse request" });
  }
}
