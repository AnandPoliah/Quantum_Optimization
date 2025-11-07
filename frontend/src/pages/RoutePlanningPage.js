import React, { useState } from "react";
import MapView from "../components/MapView";

const RoutePlanningPage = ({ 
  nodes, 
  mapCenter, 
  costSettings 
}) => {
  const [selectedStops, setSelectedStops] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  const getNodeName = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  const removeStop = (indexToRemove) => {
    setSelectedStops(selectedStops.filter((_, idx) => idx !== indexToRemove));
  };

  const moveStopUp = (index) => {
    if (index === 0) return;
    const newStops = [...selectedStops];
    [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
    setSelectedStops(newStops);
  };

  const moveStopDown = (index) => {
    if (index === selectedStops.length - 1) return;
    const newStops = [...selectedStops];
    [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
    setSelectedStops(newStops);
  };

  const optimizeRoute = async (algorithm) => {
    if (selectedStops.length < 2) {
      alert("Please select at least two stops");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API}/route/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: selectedStops,
          algorithm,
        }),
      });
      const data = await response.json();
      setRouteResult(data);
    } catch (error) {
      console.error("Error optimizing route:", error);
      alert("Error optimizing route");
    } finally {
      setLoading(false);
    }
  };

  const calculateRouteCost = (distance) => {
    const fuelCost = distance * costSettings.fuelCostPerKm;
    const travelTimeHours = distance / costSettings.vehicleSpeed;
    const driverCost = travelTimeHours * costSettings.driverWagePerHour;
    const totalCost = fuelCost + driverCost;
    
    return {
      fuelCost: fuelCost.toFixed(2),
      driverCost: driverCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      estimatedTimeMinutes: (travelTimeHours * 60).toFixed(0)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Route Planning */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">🛣️</span>
                <h2 className="text-2xl font-bold text-gray-800">Route Planning</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Selected Stops</h3>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold">
                      {selectedStops.length}
                    </span>
                  </div>
                  {selectedStops.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
                      <p className="text-sm text-gray-500">
                        Click markers on the map to add stops
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                      <ul className="space-y-2">
                        {selectedStops.map((id, idx) => (
                          <li key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-200 group hover:shadow-md transition-all">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-gray-800">{getNodeName(id)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveStopUp(idx)}
                                disabled={idx === 0}
                                className="p-1 text-lg hover:bg-indigo-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                title="Move up"
                              >
                                ⬆️
                              </button>
                              <button
                                onClick={() => moveStopDown(idx)}
                                disabled={idx === selectedStops.length - 1}
                                className="p-1 text-lg hover:bg-indigo-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                title="Move down"
                              >
                                ⬇️
                              </button>
                              <button
                                onClick={() => removeStop(idx)}
                                className="p-1 text-lg hover:bg-red-100 rounded transition-all"
                                title="Remove this stop"
                              >
                                ❌
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => setSelectedStops([])}
                        className="mt-3 w-full text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                      >
                        🗑️ Clear All Stops
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-xs text-gray-500 text-center mb-2">
                    Select at least 2 stops to optimize
                  </p>
                  <button
                    onClick={() => optimizeRoute("dijkstra")}
                    disabled={loading || selectedStops.length < 2}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🚀</span>
                    <span>Classical (Dijkstra)</span>
                  </button>

                  <button
                    onClick={() => optimizeRoute("qaoa")}
                    disabled={loading || selectedStops.length < 2}
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:rotate-180 transition-transform">⚛️</span>
                    <span>Quantum (QAOA)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {routeResult && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow animate-fadeIn">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-2xl font-bold text-gray-800">Latest Result</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <span className="font-semibold text-gray-700">Algorithm</span>
                    <span
                      className={`px-4 py-2 rounded-lg font-bold text-sm shadow-md ${
                        routeResult.algorithm === "dijkstra"
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                          : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white"
                      }`}
                    >
                      {routeResult.algorithm === "dijkstra" ? "🚀 DIJKSTRA" : "⚛️ QAOA"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <span className="font-semibold text-gray-700">Distance</span>
                    <span className="text-xl font-bold text-blue-700">
                      {routeResult.distance.toFixed(2)} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <span className="font-semibold text-gray-700">Execution Time</span>
                    <span className="text-lg font-bold text-green-700">
                      {routeResult.execution_time >= 1 
                        ? `${routeResult.execution_time.toFixed(2)}s`
                        : `${(routeResult.execution_time * 1000).toFixed(0)}ms`
                      }
                    </span>
                  </div>

                  {/* Cost Breakdown */}
                  {(() => {
                    const costs = calculateRouteCost(routeResult.distance);
                    return (
                      <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">💰</span>
                          <span className="font-bold text-gray-800">Cost Breakdown</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">⛽ Fuel Cost:</span>
                            <span className="font-bold text-gray-800">₹{costs.fuelCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">👨‍✈️ Driver Cost:</span>
                            <span className="font-bold text-gray-800">₹{costs.driverCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">⏱️ Est. Travel Time:</span>
                            <span className="font-bold text-gray-800">{costs.estimatedTimeMinutes} min</span>
                          </div>
                          <div className="border-t-2 border-green-300 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800">💵 Total Cost:</span>
                              <span className="text-xl font-bold text-green-700">₹{costs.totalCost}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200">
                    <span className="font-semibold text-gray-700 block mb-2">Route Path:</span>
                    <div className="text-sm bg-white p-3 rounded border border-gray-300 max-h-32 overflow-y-auto custom-scrollbar">
                      {routeResult.path.map((nodeId, idx) => (
                        <span key={idx} className="inline-block">
                          <span className="font-medium text-indigo-700">{getNodeName(nodeId)}</span>
                          {idx < routeResult.path.length - 1 && (
                            <span className="mx-2 text-gray-400">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <MapView
              nodes={nodes}
              selectedStops={selectedStops}
              setSelectedStops={setSelectedStops}
              routeResult={routeResult}
              dijkstraResult={null}
              qaoaResult={null}
              comparisonMode={false}
              mapCenter={mapCenter}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanningPage;
