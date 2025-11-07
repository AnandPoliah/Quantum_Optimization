import React, { useState } from "react";
import MapView from "../components/MapView";

const ComparisonPage = ({ 
  nodes, 
  mapCenter, 
  costSettings 
}) => {
  const [selectedStops, setSelectedStops] = useState([]);
  const [algorithm1, setAlgorithm1] = useState("dijkstra");
  const [algorithm2, setAlgorithm2] = useState("qaoa");
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
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

  const runComparison = async () => {
    if (selectedStops.length < 2) {
      alert("Please select at least two stops");
      return;
    }
    if (algorithm1 === algorithm2) {
      alert("Please select different algorithms to compare");
      return;
    }
    try {
      setLoading(true);
      
      // Run both algorithms in parallel
      const [response1, response2] = await Promise.all([
        fetch(`${API}/route/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stops: selectedStops, algorithm: algorithm1 }),
        }),
        fetch(`${API}/route/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stops: selectedStops, algorithm: algorithm2 }),
        }),
      ]);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      setResult1(data1);
      setResult2(data2);
    } catch (error) {
      console.error("Error running comparison:", error);
      alert("Error running comparison");
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

  const getAlgorithmName = (algo) => {
    return algo === "dijkstra" ? "🚀 Dijkstra" : "⚛️ QAOA";
  };

  const getAlgorithmColor = (algo) => {
    return algo === "dijkstra" 
      ? "from-purple-500 to-purple-600" 
      : "from-indigo-500 to-indigo-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Comparison Setup */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stop Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">⚔️</span>
                <h2 className="text-2xl font-bold text-gray-800">Comparison</h2>
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
                              >
                                ⬆️
                              </button>
                              <button
                                onClick={() => moveStopDown(idx)}
                                disabled={idx === selectedStops.length - 1}
                                className="p-1 text-lg hover:bg-indigo-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                              >
                                ⬇️
                              </button>
                              <button
                                onClick={() => removeStop(idx)}
                                className="p-1 text-lg hover:bg-red-100 rounded transition-all"
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

                {/* Algorithm Selection */}
                <div className="space-y-3 pt-4 border-t-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Algorithms to Compare</h3>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Algorithm 1</label>
                    <select
                      value={algorithm1}
                      onChange={(e) => setAlgorithm1(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                    >
                      <option value="dijkstra">🚀 Classical (Dijkstra)</option>
                      <option value="qaoa">⚛️ Quantum (QAOA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Algorithm 2</label>
                    <select
                      value={algorithm2}
                      onChange={(e) => setAlgorithm2(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    >
                      <option value="dijkstra">🚀 Classical (Dijkstra)</option>
                      <option value="qaoa">⚛️ Quantum (QAOA)</option>
                    </select>
                  </div>

                  <button
                    onClick={runComparison}
                    disabled={loading || selectedStops.length < 2}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">⚔️</span>
                    <span>Run Comparison</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comparison Results */}
            {result1 && result2 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow animate-fadeIn">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-xl font-bold text-gray-800">Comparison Results</h2>
                </div>

                {/* Winner Badge */}
                {(() => {
                  const cost1 = calculateRouteCost(result1.distance);
                  const cost2 = calculateRouteCost(result2.distance);
                  const winner = parseFloat(cost1.totalCost) < parseFloat(cost2.totalCost) ? algorithm1 : algorithm2;
                  const savings = Math.abs(parseFloat(cost1.totalCost) - parseFloat(cost2.totalCost)).toFixed(2);
                  const savingsPercent = ((savings / Math.max(parseFloat(cost1.totalCost), parseFloat(cost2.totalCost))) * 100).toFixed(1);
                  
                  return (
                    <div className={`p-4 rounded-lg mb-4 bg-gradient-to-r ${getAlgorithmColor(winner)} bg-opacity-20 border-2 ${
                      winner === algorithm1 ? 'border-purple-400' : 'border-indigo-400'
                    }`}>
                      <div className="text-center">
                        <div className="text-3xl mb-2">{winner === "qaoa" ? '⚛️' : '🚀'}</div>
                        <div className="font-bold text-lg text-gray-800">
                          {getAlgorithmName(winner)} Wins!
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Saves ₹{savings} ({savingsPercent}% cheaper)
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Algorithm 1 Column */}
                  <div className="space-y-3">
                    <div className={`bg-gradient-to-r ${getAlgorithmColor(algorithm1)} text-white px-3 py-2 rounded-lg text-center font-bold text-sm`}>
                      {getAlgorithmName(algorithm1)}
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Distance</div>
                      <div className="text-lg font-bold text-blue-700">{result1.distance.toFixed(2)} km</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Exec Time</div>
                      <div className="text-sm font-bold text-green-700">
                        {result1.execution_time >= 1 
                          ? `${result1.execution_time.toFixed(2)}s`
                          : `${(result1.execution_time * 1000).toFixed(0)}ms`
                        }
                      </div>
                    </div>
                    {(() => {
                      const costs = calculateRouteCost(result1.distance);
                      return (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-2">💰 Costs</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Fuel:</span>
                              <span className="font-semibold">₹{costs.fuelCost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Driver:</span>
                              <span className="font-semibold">₹{costs.driverCost}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-bold">Total:</span>
                              <span className="font-bold text-green-700">₹{costs.totalCost}</span>
                            </div>
                            <div className="text-center text-gray-600 mt-1">
                              ⏱️ {costs.estimatedTimeMinutes} min
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Algorithm 2 Column */}
                  <div className="space-y-3">
                    <div className={`bg-gradient-to-r ${getAlgorithmColor(algorithm2)} text-white px-3 py-2 rounded-lg text-center font-bold text-sm`}>
                      {getAlgorithmName(algorithm2)}
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Distance</div>
                      <div className="text-lg font-bold text-blue-700">{result2.distance.toFixed(2)} km</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Exec Time</div>
                      <div className="text-sm font-bold text-green-700">
                        {result2.execution_time >= 1 
                          ? `${result2.execution_time.toFixed(2)}s`
                          : `${(result2.execution_time * 1000).toFixed(0)}ms`
                        }
                      </div>
                    </div>
                    {(() => {
                      const costs = calculateRouteCost(result2.distance);
                      return (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                          <div className="text-xs text-gray-600 mb-2">💰 Costs</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Fuel:</span>
                              <span className="font-semibold">₹{costs.fuelCost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Driver:</span>
                              <span className="font-semibold">₹{costs.driverCost}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                              <span className="font-bold">Total:</span>
                              <span className="font-bold text-green-700">₹{costs.totalCost}</span>
                            </div>
                            <div className="text-center text-gray-600 mt-1">
                              ⏱️ {costs.estimatedTimeMinutes} min
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Difference Stats */}
                {(() => {
                  const distDiff = Math.abs(result1.distance - result2.distance).toFixed(2);
                  const distPercent = ((distDiff / Math.max(result1.distance, result2.distance)) * 100).toFixed(1);
                  
                  return (
                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                      <div className="text-center">
                        <div className="font-bold text-gray-800 mb-2">📏 Distance Difference</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {distDiff} km ({distPercent}%)
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <MapView
              nodes={nodes}
              selectedStops={selectedStops}
              setSelectedStops={setSelectedStops}
              routeResult={null}
              dijkstraResult={algorithm1 === "dijkstra" ? result1 : result2}
              qaoaResult={algorithm1 === "qaoa" ? result1 : result2}
              comparisonMode={result1 && result2}
              mapCenter={mapCenter}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
