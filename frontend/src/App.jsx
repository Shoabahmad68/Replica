// src/App.jsx (Final Integrated)
import React, { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ImportPage from "./pages/ImportPage";
import Reports from "./pages/Reports";
import CompanyHierarchy from "./pages/CompanyHierarchy";
import Outstanding from "./pages/Outstanding";
import Analyst from "./pages/Analyst";
import Messaging from "./pages/Messaging";
import UserManagement from "./pages/UserManagement";
import Setting from "./pages/Setting";
import HelpSupport from "./pages/HelpSupport";


import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPopup from "./components/LoginPopup";

function MainApp() {
  const [route, setRoute] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const { user } = useAuth();

  const renderPage = () => {
    switch (route) {
      case "dashboard":
        return <Dashboard />;
      case "import":
        return user ? <ImportPage /> : <AccessDenied />;
      case "reports":
        return user ? <Reports /> : <AccessDenied />;
      case "hierarchy":
        return user ? <CompanyHierarchy /> : <AccessDenied />;
      case "outstanding":
        return user ? <Outstanding /> : <AccessDenied />;
      case "analyst":
        return user ? <Analyst /> : <AccessDenied />;
      case "messaging":
        return user ? <Messaging /> : <AccessDenied />;
      case "usermanagement":
        return user ? <UserManagement /> : <AccessDenied />;
      case "setting":
        return user ? <Setting /> : <AccessDenied />;
      case "helpsupport":
        return user ? <HelpSupport /> : <AccessDenied />;
      default:
        return (
          <div className="text-center text-gray-400 text-xl mt-10">
            🚧 Page not found or route mismatch!
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A192F] text-gray-100 relative">
      <Sidebar onNavigate={(r) => setRoute(r)} currentRoute={route} />

      <div className="flex flex-col flex-1 min-h-screen lg:ml-64 transition-all duration-300">
        <Header onNavigate={(r) => setRoute(r)} currentRoute={route} />

        <main className="flex-1 p-6 mt-20 lg:mt-24 bg-[#0A192F] transition-all duration-300">
          {renderPage()}
        </main>
      </div>

      {/* 🔹 Login popup (visible only when not logged in) */}
      {!user && showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}

      {/* 🔹 If no user logged in, show “Login” button floating bottom-right */}
      
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center text-gray-300">
      <img src="/lock.svg" alt="Lock" className="w-20 mb-4 opacity-75" />
      <h2 className="text-2xl font-bold text-[#64FFDA] mb-2">Access Restricted</h2>
      <p className="text-gray-400">Please login to access this section.</p>
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
