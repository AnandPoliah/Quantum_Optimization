import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  const navItems = [
    { path: "/", label: "Nodes", icon: "📍" },
    { path: "/route-planning", label: "Route Planning", icon: "🛣️" },
    { path: "/comparison", label: "Comparison", icon: "⚔️" },
    { path: "/history", label: "History", icon: "📊" },
    { path: "/settings", label: "Cost Settings", icon: "💰" },
  ];

  return (
    <nav className="bg-white shadow-lg border-b-2 border-indigo-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚛️</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Quantum Route Optimizer
            </h1>
          </div>
          <div className="flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-indigo-50"
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
