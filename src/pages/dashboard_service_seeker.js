import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SeekerBooking() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);

  // ✅ Get logged-in user's location
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/me`
        );

        const user = res.data;

        const location = {
          home_address: user.service_provider.home_address,
          postal_code: user.service_provider.postal_code,
          location_latitude: user.service_provider.location_latitude,
          location_longitude: user.service_provider.location_longitude,
        };
        setUserLocation(location);
        setLoggedInUser(user.service_provider);
      } catch (err) {
        console.error("Failed to fetch user location", err);
      }
    };

    fetchUser();
  }, []);

  const handleSubmit = async () => {
    if (!command) return alert("Please enter a request");
    if (!userLocation) return alert("User location not loaded yet");

    setLoading(true);
    setResponse(null);

    console.log("111", userLocation);

    try {
      // ✅ step 1: send BOTH command + userLocation to AI
      const parseRes = await axios.post("/api/ai/parseServiceSeekerCommand", {
        command,
        userLocation,
      });

      const parsedRequest = parseRes.data.parsed;
      console.log("FINAL parsed request:", parsedRequest);

      // ✅ step 2: send AI output to booking API
      // const bookingRes = await axios.post("/api/service_seeker/booking", {
      //   request: parsedRequest,
      // });

      // setResponse(bookingRes.data);
    } catch (err) {
      console.error(err);
      setResponse({ error: err.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>Service Seeker Booking</h2>

      <textarea
        rows={4}
        style={{ width: "100%", padding: 10 }}
        placeholder='E.g: "Book me a Level 2 caregiver every Monday and Thursday 10am-2pm from Feb 10 to March 20"'
        value={command}
        onChange={(e) => setCommand(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginTop: 10 }}
      >
        {loading ? "Processing..." : "Submit"}
      </button>

      {response && (
        <pre style={{ marginTop: 20, background: "#f4f4f4", padding: 10 }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
