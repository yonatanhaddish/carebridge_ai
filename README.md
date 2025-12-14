<!-- {
{
  _id: ObjectId("66cfa1e9c9e4b23a9b91a111"),

  service_provider_id: "7a4b3b4a-0f8d-4e22-9c7f-1b8c2c3c4d55",

  user_id: "2e91f1c1-5d77-4c10-9f64-cc3d14b5f222",

  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com",
  phone_number: "+1-647-555-0199",

  home_address: "123 King St W, Toronto, ON",
  postal_code: "M5H2N2",
  location_latitude: 43.65107,
  location_longitude: -79.347015,

  service_levels_offered: ["Level 1", "Level 2"],

  service_prices: {
    "Level 1": 35,
    "Level 2": 50
  },

  availability: [
    // ─────────────────────────────────────
    // Weekly recurring availability
    {
      recurrence: {
        days: ["Monday", "Thursday"],
        startDate: ISODate("2026-01-02T00:00:00.000Z"),
        endDate: ISODate("2026-01-25T00:00:00.000Z")
      },
      times: [
        { start: "10:00", end: "14:00" },
        { start: "18:00", end: "22:00" }
      ]
    },

    // ─────────────────────────────────────
    // Single specific day (startDate === endDate)
    {
      recurrence: {
        days: ["Tuesday"],
        startDate: ISODate("2026-02-10T00:00:00.000Z"),
        endDate: ISODate("2026-02-10T00:00:00.000Z")
      },
      times: [
        { start: "10:00", end: "22:00" }
      ]
    },

    // ─────────────────────────────────────
    // Continuous date range (all days)
    {
      recurrence: {
        days: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        startDate: ISODate("2026-03-10T00:00:00.000Z"),
        endDate: ISODate("2026-03-14T00:00:00.000Z")
      },
      times: [
        { start: "11:00", end: "16:00" }
      ]
    }
  ],

  booking_confirmation_deadline_hours: 12,
  required_advance_notice_hours: 24,

  profile_created_at: ISODate("2025-12-01T15:42:10.123Z"),
  last_updated_at: ISODate("2025-12-11T18:20:45.456Z")
}



Key guarantees
startDate === endDate → single day
No weekday mentioned → use all 7 days
Multiple time slots per rule supported
Multiple rules per provider supported
Any matching rule = available


🧠 Design contract (important)
Availability is additive and opt-in only
Providers only enter times they are willing to work
No availability = not bookable
No blocking logic needed
No priority needed

This keeps:
schema simple
AI parsing simple
matching logic simple -->
<!-- bugs minimal -->
