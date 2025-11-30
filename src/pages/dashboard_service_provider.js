import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import Navbar from "@/components/Navbar";
import SubNavbar from "@/components/SubNavbar";
import Footer from "@/components/Footer";
import DashboardSP from "../components/DashboardSP";
import AvailabilityAI from "@/components/AvailabilityAI";
import AvailabiltiyCalendar from "@/components/AvailabiltiyCalendar";
import Offers from "@/components/Offers";
import Schedule from "@/components/Schedule";

function DashboardServiceProvider() {
  const [selectedTab, setSelectedTab] = useState("dashboard");

  const handleDataFromSideNavbar = (data) => {
    setSelectedTab(data);
  };

  return (
    <Box sx={{ backgroundColor: "#e0e0e0", height: "100vh" }}>
      <Navbar />
      <SubNavbar sendDataToParent={handleDataFromSideNavbar} />
      {selectedTab === "dashboard" ? (
        <DashboardSP />
      ) : selectedTab === "availability_ai" ? (
        <AvailabilityAI />
      ) : selectedTab === "availability_calendar" ? (
        <AvailabiltiyCalendar />
      ) : selectedTab === "offers" ? (
        <Offers />
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
