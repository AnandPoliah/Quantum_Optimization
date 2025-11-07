import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

import Navigation from "./components/Navigation";
import NodesPage from "./pages/NodesPage";
import RoutePlanningPage from "./pages/RoutePlanningPage";
import ComparisonPage from "./pages/ComparisonPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [nodes, setNodes] = useState([]);
  const [mapCenter] = useState([10.938445890689305, 76.95216275638683]);
  const [costSettings, setCostSettings] = useState({
    fuelCostPerKm: 8.5,
    driverWagePerHour: 150,
    vehicleSpeed: 40
  });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await axios.get(`${API}/nodes`);
      setNodes(response.data);
    } catch (error) {
      console.error("Error fetching nodes:", error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<NodesPage nodes={nodes} setNodes={setNodes} fetchNodes={fetchNodes} mapCenter={mapCenter} />} />
          <Route path="/route-planning" element={<RoutePlanningPage nodes={nodes} mapCenter={mapCenter} costSettings={costSettings} />} />
          <Route path="/comparison" element={<ComparisonPage nodes={nodes} mapCenter={mapCenter} costSettings={costSettings} />} />
          <Route path="/history" element={<HistoryPage nodes={nodes} mapCenter={mapCenter} />} />
          <Route path="/settings" element={<SettingsPage costSettings={costSettings} setCostSettings={setCostSettings} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
