import React from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Box, Typography, Button } from "@mui/material";
function chatbot() {
  const router = useRouter();
  const handleLogout = async () => {
    await axios.post("/api/auth/logout");
    router.push("/");
  };
  return (
    <Box>
      <Button onClick={handleLogout}>Logout</Button>
    </Box>
  );
}

export default chatbot;
