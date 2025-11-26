// src/App.jsx
import React, { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import CompanyHierarchy from "./pages/CompanyHierarchy";
import Outstanding from "./pages/Outstanding";
import Analyst from "./pages/Analyst";
import Messaging from "./pages/Messaging";
import UserManagement from "./pages/UserManagement";
import Setting from "./pages/Setting";
import HelpSupport from "./pages/HelpSupport";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainApp() {
  const [route, setRoute] = useState("dashboard");
  const { user } = useAuth();

  const renderPage = () => {
    if (!user && route !== "dashboard") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center text-gray-300">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-2">Access Restricted</h2>
          <p className="text-gray-400">Please login to access this section.</p>
        </div>
      );
    }

    switch (route) {
      case "dashboard": return <Dashboard />;
      case "reports": return <Reports />;
      case "hierarchy": return <CompanyHierarchy />;
      case "outstanding": return <Outstanding />;
      case "analyst": return <Analyst />;
      case "messaging": return <Messaging />;
      case "usermanagement": return <UserManagement />;
      case "setting": return <Setting />;
      case "helpsupport": return <HelpSupport />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A192F] text-gray-100">
      {user && <Sidebar onNavigate={(r) => setRoute(r)} />}
      
      <div className={`flex flex-col flex-1 min-h-screen ${user ? 'lg:ml-64' : ''} transition-all duration-300`}>
        <Header onNavigate={(r) => setRoute(r)} />
        
        <main className="flex-1 p-4 md:p-6 mt-[70px] bg-[#0A192F]">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
