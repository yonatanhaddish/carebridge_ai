import React, { useState } from "react";
import axios from "axios";
import { Box, ext, Divider, Typography } from "@mui/material";

import SmartToyIcon from "@mui/icons-material/SmartToy";
import Navbar from "@/components/Navbar";
import SubNavbarSeeker from "@/components/SubNavbarSeeker";
import Footer from "@/components/Footer";
import MyBookingSS from "@/components/MyBookingSS";
import DashboardSS from "@/components/DashboardSS";
import Offers from "@/components/Offers";
import Schedule from "@/components/Schedule";
import BookingAI from "@/components/BookingAI";
import PastBookingSS from "@/components/PastBookingSS";

function DashboardServiceProvider() {
  const [selectedTab, setSelectedTab] = useState("my_booking");
  const [bookingData, setBookingData] = useState([]);

  const handleDataFromSideNavbar = (data) => {
    setSelectedTab(data);
  };
  const handleDataFromChild = (data) => {
    setBookingData(data);
  };

  console.log("selectedTab", selectedTab);

  return (
    <Box sx={{ backgroundColor: "#e0e0e0", minHeight: "100vh" }}>
      <Navbar />
      <SubNavbarSeeker sendDataToParent={handleDataFromSideNavbar} />
      {selectedTab === "dashboard" ? (
        <DashboardSS />
      ) : selectedTab === "add_booking" ? (
        <BookingAI />
      ) : selectedTab === "my_booking" ? (
        <MyBookingSS sendBookingDataToParent={handleDataFromChild} />
      ) : selectedTab === "calendar" ? (
        <PastBookingSS bookings={bookingData} />
      ) : selectedTab === "schedule" ? (
        <Schedule />
      ) : (
        <></>
      )}
      {/* <Footer /> */}
    </Box>
  );
}

export default DashboardServiceProvider;
