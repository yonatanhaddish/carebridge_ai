import React from "react";

import { Box, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
      sx={{
        height: "7%",
        backgroundColor: "#020E20",
        color: "#F7F7F7",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: "bold",
      }}
    >
      <Typography sx={{ fontSize: "14px" }}>@2026 CareBridge</Typography>
    </Box>
  );
}

export default Footer;
