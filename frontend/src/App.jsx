import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";

const Dashboard = () => (
  <div>
    <h2>Dashboard</h2>
    <p>Protected dashboard content here.</p>
  </div>
);

const App = () => (
  <Router>
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Login />} />     {/* Root now shows Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* fallback 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </div>
    </div>
  </Router>
);

export default App;
