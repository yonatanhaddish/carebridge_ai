import ServiceProvider from "../models/ServiceProvider";

// --- Time helpers ---
function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeOverlaps(slot1, slot2) {
  return (
    Math.max(toMinutes(slot1.start), toMinutes(slot2.start)) <
    Math.min(toMinutes(slot1.end), toMinutes(slot2.end))
  );
}

function datesOverlap(start1, end1, start2, end2) {
  return !(
    new Date(end1) < new Date(start2) || new Date(start1) > new Date(end2)
  );
}

function checkDayInDateRange(day, startDate, endDate) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayIndex = daysOfWeek.indexOf(day);
  if (dayIndex === -1) return false;
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    if (current.getDay() === dayIndex) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

// --- Haversine distance (km) ---
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Check availability and conflicts ---
function checkProviderAvailability(provider, request) {
  const conflicts = [];
  const { start_date, end_date, recurring, time_slots } = request;

  for (const entry of provider.availability_calendar) {
    const existStart = new Date(entry.start_date);
    const existEnd = new Date(entry.end_date);

    if (!datesOverlap(start_date, end_date, existStart, existEnd)) {
      conflicts.push({
        type: "date_range_conflict",
        message: `Provider ${provider.name} unavailable during requested dates`,
        providerRange: `${existStart.toLocaleDateString()} - ${existEnd.toLocaleDateString()}`,
      });
      continue;
    }

    if (Array.isArray(recurring) && recurring.length > 0 && entry.recurring) {
      for (const reqRec of recurring) {
        const existRec = entry.recurring.find((r) => r.day === reqRec.day);
        if (!existRec) {
          conflicts.push({
            type: "day_conflict",
            message: `Provider ${provider.name} not available on ${reqRec.day}`,
          });
          continue;
        }

        for (const reqSlot of reqRec.time_slots) {
          const overlap = existRec.time_slots.some((existSlot) =>
            timeOverlaps(reqSlot, existSlot)
          );
          if (!overlap) {
            conflicts.push({
              type: "time_conflict",
              message: `Provider ${provider.name} time slot ${reqSlot.start}-${reqSlot.end} on ${reqRec.day} unavailable`,
            });
          }
        }
      }
    }
  }

  const available = conflicts.length === 0;
  return { available, conflicts };
}

// --- Main Matching Function ---
export async function matchProviders(request, maxDistanceKm = 10) {
  const providers = await ServiceProvider.find({
    service_level: request.service_level,
  });

  console.log("222", request);

  const matched = [];
  const conflictDetails = [];

  for (const provider of providers) {
    // Location filter
    if (
      provider.location_latitude &&
      provider.location_longitude &&
      request.location.latitude &&
      request.location.longitude
    ) {
      const dist = distanceKm(
        provider.location_latitude,
        provider.location_longitude,
        request.location.latitude,
        request.location.longitude
      );
      if (dist > maxDistanceKm) {
        conflictDetails.push({
          provider: provider.name,
          type: "location_conflict",
          message: `Provider ${provider.name} is ${dist.toFixed(
            2
          )} km away, beyond radius ${maxDistanceKm} km`,
        });
        continue;
      }
    }

    const { available, conflicts } = checkProviderAvailability(
      provider,
      request
    );
    if (available) {
      matched.push(provider);
    } else {
      conflictDetails.push(
        ...conflicts.map((c) => ({ provider: provider.name, ...c }))
      );
    }
  }

  return { matched, conflictDetails };
}
