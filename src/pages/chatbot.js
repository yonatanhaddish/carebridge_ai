import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Box, Button, Typography } from "@mui/material";

function Chatbot() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Fetch logged-in user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/auth/check");
        setUser(res.data.user);
      } catch {
        setUser(null);
        console.log("User not logged in");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null); // update UI immediately
      router.push("/"); // redirect to home
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Box>
      {user ? (
        <Typography>Logged in as: {user.email}</Typography>
      ) : (
        <Typography>Not logged in</Typography>
      )}
      {user && <Button onClick={handleLogout}>Logout</Button>}
    </Box>
  );
}

export default Chatbot;
