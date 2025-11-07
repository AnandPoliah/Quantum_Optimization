import React, { useState } from "react";
import toast from 'react-hot-toast';
import MapView from "../components/MapView";

const RoutePlanningPage = ({ 
  nodes, 
  mapCenter, 
  costSettings 
}) => {
  const [selectedStops, setSelectedStops] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("dijkstra");
  const [selectedDepot, setSelectedDepot] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  // Get depot nodes
  const depotNodes = nodes.filter(node => node.is_depot);
  
  // Auto-select depot if only one exists
  React.useEffect(() => {
    if (depotNodes.length === 1 && !selectedDepot) {
      setSelectedDepot(depotNodes[0].id);
    }
  }, [depotNodes.length, selectedDepot, depotNodes]);

  const getAlgorithmName = (algo) => {
    const names = {
      dijkstra: "🚀 Dijkstra",
      qaoa: "⚛️ QAOA",
      genetic: "🧬 Genetic Algorithm",
      simulated_annealing: "🔥 Simulated Annealing",
      two_opt: "🔄 2-Opt",
      ant_colony: "🐜 Ant Colony"
    };
    return names[algo] || algo;
  };

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
      toast.error("Please select at least two stops");
      return;
    }
    
    // If depot is selected, ensure it's included in stops
    let stopsToOptimize = [...selectedStops];
    if (selectedDepot && !stopsToOptimize.includes(selectedDepot)) {
      stopsToOptimize = [selectedDepot, ...stopsToOptimize];
    }
    
    try {
      setLoading(true);
      const requestBody = {
        stops: stopsToOptimize,
        algorithm,
      };
      
      // Add depot_id if a depot is selected
      if (selectedDepot) {
        requestBody.depot_id = selectedDepot;
      }
      
      const response = await fetch(`${API}/route/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      
      // Handle both 'error' and 'detail' fields from backend
      if (data.error || data.detail) {
        toast.error(data.error || data.detail);
      } else {
        setRouteResult(data);
        toast.success("Route optimized successfully!");
      }
    } catch (error) {
      toast.error("Failed to optimize route. Please try again.");
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
                {/* Depot Selection */}
                {depotNodes.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🏭</span>
                      <h3 className="text-sm font-semibold text-gray-700">Starting Depot (Warehouse)</h3>
                    </div>
                    {depotNodes.length === 1 ? (
                      <div className="bg-white p-3 rounded-lg border border-green-300 flex items-center gap-2">
                        <span className="text-green-600 text-lg">✓</span>
                        <span className="font-medium text-gray-800">{getNodeName(depotNodes[0].id)}</span>
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          Auto-selected
                        </span>
                      </div>
                    ) : (
                      <select
                        value={selectedDepot || ""}
                        onChange={(e) => setSelectedDepot(e.target.value || null)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-800 font-medium"
                      >
                        <option value="">No Depot (Optional)</option>
                        {depotNodes.map(node => (
                          <option key={node.id} value={node.id}>
                            🏭 {node.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedDepot && (
                      <p className="text-xs text-green-600 mt-2">
                        ℹ️ Route will start and end at this depot
                      </p>
                    )}
                  </div>
                )}
                
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
                        {selectedStops.map((id, idx) => {
                          const isDepot = id === selectedDepot;
                          return (
                            <li key={idx} className={`flex items-center justify-between p-2 rounded-lg border group hover:shadow-md transition-all ${
                              isDepot ? 'bg-green-50 border-green-300' : 'bg-white border-indigo-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                {isDepot ? (
                                  <span className="text-lg" title="Depot/Warehouse">🏭</span>
                                ) : (
                                  <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                    {idx + 1}
                                  </span>
                                )}
                                <span className={`font-medium ${isDepot ? 'text-green-800' : 'text-gray-800'}`}>
                                  {getNodeName(id)}
                                </span>
                                {isDepot && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    Depot
                                  </span>
                                )}
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
                          );
                        })}
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Algorithm
                    </label>
                    <select
                      value={selectedAlgorithm}
                      onChange={(e) => setSelectedAlgorithm(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-800 font-medium transition-all"
                    >
                      <option value="dijkstra">🚀 Dijkstra (Classical)</option>
                      <option value="qaoa">⚛️ QAOA (Quantum)</option>
                      <option value="genetic">🧬 Genetic Algorithm</option>
                      <option value="simulated_annealing">🔥 Simulated Annealing</option>
                      <option value="two_opt">� 2-Opt</option>
                      <option value="ant_colony">🐜 Ant Colony Optimization</option>
                    </select>
                  </div>

                  <button
                    onClick={() => optimizeRoute(selectedAlgorithm)}
                    disabled={loading || selectedStops.length < 2}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">✨</span>
                    <span>Optimize Route</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {routeResult && routeResult.distance && routeResult.execution_time !== undefined && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow animate-fadeIn">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-2xl font-bold text-gray-800">Latest Result</h2>
                </div>
                
                {/* Depot indicator in results */}
                {selectedDepot && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏭</span>
                      <span className="text-sm text-green-800">
                        <span className="font-semibold">Starting from depot:</span> {getNodeName(selectedDepot)}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <span className="font-semibold text-gray-700">Algorithm</span>
                    <span className="px-4 py-2 rounded-lg font-bold text-sm shadow-md bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                      {getAlgorithmName(routeResult.algorithm)}
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
