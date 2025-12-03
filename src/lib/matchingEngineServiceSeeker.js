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

// --- Haversine distance in KM ---
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

// --- Check provider availability ---
function checkProviderAvailability(provider, request) {
  const conflicts = [];
  const { recurring, time_slots, start_date, end_date } = request;

  console.log("333333333333", {
    recurring,
    time_slots,
    start_date,
    end_date,
  });

  if (!provider.availability_calendar?.length) {
    conflicts.push({
      type: "no_schedule",
      message: `Provider ${provider.name} has no availability calendar`,
    });
    return { available: false, conflicts };
  }

  for (const entry of provider.availability_calendar) {
    const existStart = new Date(entry.start_date);
    const existEnd = new Date(entry.end_date);

    // Date range check
    if (!datesOverlap(start_date, end_date, existStart, existEnd)) {
      conflicts.push({
        type: "date_range_conflict",
        message: `Provider unavailable between ${existStart.toDateString()} - ${existEnd.toDateString()}`,
      });
      continue;
    }

    // --- Recurring check ---
    if (Array.isArray(recurring) && recurring.length > 0 && entry.recurring) {
      for (const reqRec of recurring) {
        const existRec = entry.recurring.find((r) => r.day === reqRec.day);
        if (!existRec) {
          conflicts.push({
            type: "day_conflict",
            message: `Provider not available on ${reqRec.day}`,
          });
          continue;
        }

        for (const reqSlot of reqRec.time_slots) {
          const overlap = existRec.time_slots?.some((existSlot) =>
            timeOverlaps(reqSlot, existSlot)
          );
          if (!overlap) {
            conflicts.push({
              type: "time_conflict",
              message: `Time ${reqSlot.start} - ${reqSlot.end} unavailable on ${reqRec.day}`,
            });
          }
        }
      }
    }

    // --- One-time time_slots check ---
    if ((!recurring || recurring.length === 0) && Array.isArray(time_slots)) {
      for (const reqSlot of time_slots) {
        const overlap = entry.time_slots?.some((existSlot) =>
          timeOverlaps(reqSlot, existSlot)
        );
        if (!overlap) {
          conflicts.push({
            type: "time_conflict",
            message: `Provider not available during ${reqSlot.start} - ${reqSlot.end}`,
          });
        }
      }
    }
  }

  return { available: conflicts.length === 0, conflicts };
}

// --- Main matching function ---
export async function matchProviders(request, maxDistanceKm = 20) {
  const providers = await ServiceProvider.find({
    service_levels_offered: request.service_level,
  });

  const matched = [];
  const conflictDetails = [];

  for (const provider of providers) {
    // --- Location filter ---
    if (
      provider.location_latitude &&
      provider.location_longitude &&
      request.location?.location_latitude &&
      request.location?.location_longitude
    ) {
      const dist = distanceKm(
        provider.location_latitude,
        provider.location_longitude,
        request.location.location_latitude,
        request.location.location_longitude
      );

      if (dist > maxDistanceKm) {
        conflictDetails.push({
          provider: provider.name,
          type: "location_conflict",
          message: `Provider is ${dist.toFixed(
            2
          )} km away. Max allowed: ${maxDistanceKm} km`,
        });
        continue;
      }
    }

    const { available, conflicts } = checkProviderAvailability(
      provider,
      request
    );

    if (available) {
      matched.push({
        ...provider.toObject(),
        distance_km:
          provider.location_latitude && request.location?.location_latitude
            ? distanceKm(
                provider.location_latitude,
                provider.location_longitude,
                request.location.location_latitude,
                request.location.location_longitude
              ).toFixed(2)
            : null,
      });
    } else {
      conflictDetails.push(
        ...conflicts.map((c) => ({ provider: provider.name, ...c }))
      );
    }
  }

  // Sort by closest first
  matched.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

  return { matched, conflictDetails };
}
