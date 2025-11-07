import React, { useState } from "react";
import toast from 'react-hot-toast';
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
      toast.error("Please select at least two stops");
      return;
    }
    if (algorithm1 === algorithm2) {
      toast.error("Please select different algorithms to compare");
      return;
    }
    
    // If depot is selected, ensure it's included in stops
    let stopsToOptimize = [...selectedStops];
    if (selectedDepot && !stopsToOptimize.includes(selectedDepot)) {
      stopsToOptimize = [selectedDepot, ...stopsToOptimize];
    }
    
    try {
      setLoading(true);
      
      const requestBody1 = {
        stops: stopsToOptimize,
        algorithm: algorithm1,
      };
      const requestBody2 = {
        stops: stopsToOptimize,
        algorithm: algorithm2,
      };
      
      // Add depot_id if a depot is selected
      if (selectedDepot) {
        requestBody1.depot_id = selectedDepot;
        requestBody2.depot_id = selectedDepot;
      }
      
      // Run both algorithms in parallel
      const [response1, response2] = await Promise.all([
        fetch(`${API}/route/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody1),
        }),
        fetch(`${API}/route/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody2),
        }),
      ]);
      
      const data1 = await response1.json();
      const data2 = await response2.json();
      
      // Check for errors in results (both 'error' and 'detail' fields)
      const error1 = data1.error || data1.detail;
      const error2 = data2.error || data2.detail;
      
      if (error1 || error2) {
        if (error1) toast.error(`Algorithm 1: ${error1}`);
        if (error2) toast.error(`Algorithm 2: ${error2}`);
      } else {
        toast.success("Comparison completed successfully!");
      }
      
      setResult1(data1);
      setResult2(data2);
    } catch (error) {
      toast.error(`Failed to run comparison: ${error.message}`);
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
    const names = {
      'dijkstra': '🚀 Dijkstra',
      'qaoa': '⚛️ QAOA',
      'genetic': '🧬 Genetic Algorithm',
      'simulated_annealing': '🔥 Simulated Annealing',
      'simulated-annealing': '🔥 Simulated Annealing',
      'ant_colony': '🐜 Ant Colony',
      'ant-colony': '🐜 Ant Colony',
      'two_opt': '🔄 2-Opt',
      '2-opt': '🔄 2-Opt'
    };
    return names[algo] || algo;
  };

  const getAlgorithmColor = (algo) => {
    const colors = {
      'dijkstra': 'from-purple-500 to-purple-600',
      'qaoa': 'from-indigo-500 to-indigo-600',
      'genetic': 'from-green-500 to-green-600',
      'simulated_annealing': 'from-orange-500 to-orange-600',
      'simulated-annealing': 'from-orange-500 to-orange-600',
      'ant_colony': 'from-pink-500 to-pink-600',
      'ant-colony': 'from-pink-500 to-pink-600',
      'two_opt': 'from-blue-500 to-blue-600',
      '2-opt': 'from-blue-500 to-blue-600'
    };
    return colors[algo] || 'from-gray-500 to-gray-600';
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
                {/* Depot Selection */}
                {depotNodes.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🏭</span>
                      <h3 className="text-sm font-semibold text-gray-700">Starting Depot</h3>
                    </div>
                    {depotNodes.length === 1 ? (
                      <div className="bg-white p-3 rounded-lg border border-green-300 flex items-center gap-2">
                        <span className="text-green-600 text-lg">✓</span>
                        <span className="font-medium text-gray-800">{getNodeName(depotNodes[0].id)}</span>
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          Auto
                        </span>
                      </div>
                    ) : (
                      <select
                        value={selectedDepot || ""}
                        onChange={(e) => setSelectedDepot(e.target.value || null)}
                        className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-800 font-medium"
                      >
                        <option value="">No Depot (Optional)</option>
                        {depotNodes.map(node => (
                          <option key={node.id} value={node.id}>
                            🏭 {node.name}
                          </option>
                        ))}
                      </select>
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
                                  <span className="text-lg" title="Depot">🏭</span>
                                ) : (
                                  <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                    {idx + 1}
                                  </span>
                                )}
                                <span className={`font-medium ${isDepot ? 'text-green-800' : 'text-gray-800'}`}>
                                  {getNodeName(id)}
                                </span>
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
                      <option value="genetic">🧬 Genetic Algorithm</option>
                      <option value="simulated_annealing">🔥 Simulated Annealing</option>
                      <option value="ant_colony">🐜 Ant Colony</option>
                      <option value="two_opt">🔄 2-Opt</option>
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
                      <option value="genetic">🧬 Genetic Algorithm</option>
                      <option value="simulated_annealing">🔥 Simulated Annealing</option>
                      <option value="ant_colony">🐜 Ant Colony</option>
                      <option value="two_opt">🔄 2-Opt</option>
                    </select>
                  </div>

                  <button
                    onClick={runComparison}
                    disabled={loading || selectedStops.length < 2}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>Comparing...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl group-hover:scale-110 transition-transform">⚔️</span>
                        <span>Run Comparison</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Winner Badge - Only show when both results exist */}
            {result1 && result2 && result1.distance && result2.distance && (() => {
              const cost1 = calculateRouteCost(result1.distance);
              const cost2 = calculateRouteCost(result2.distance);
              const winner = parseFloat(cost1.totalCost) < parseFloat(cost2.totalCost) ? algorithm1 : algorithm2;
              const savings = Math.abs(parseFloat(cost1.totalCost) - parseFloat(cost2.totalCost)).toFixed(2);
              const savingsPercent = ((savings / Math.max(parseFloat(cost1.totalCost), parseFloat(cost2.totalCost))) * 100).toFixed(1);
              
              return (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow animate-fadeIn">
                  <div className={`p-4 rounded-lg bg-gradient-to-r ${getAlgorithmColor(winner)} bg-opacity-20 border-2 ${
                    winner === algorithm1 ? 'border-purple-400' : 'border-indigo-400'
                  }`}>
                    <div className="text-center">
                      <div className="text-3xl mb-2">🏆</div>
                      <div className="font-bold text-lg text-gray-800">
                        {getAlgorithmName(winner)} Wins!
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Saves ₹{savings} ({savingsPercent}% cheaper)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Panel - Side-by-Side Maps with Details */}
          <div className="lg:col-span-2">
            {result1 && result2 && result1.distance && result2.distance ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Algorithm 1 - Left Side */}
                <div className="space-y-4">
                  {/* Map 1 */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple-300">
                    <div className="bg-gradient-to-r from-purple-100 to-purple-200 p-3">
                      <h3 className="text-lg font-bold text-center text-gray-800">
                        {getAlgorithmName(algorithm1)}
                      </h3>
                    </div>
                    <MapView
                      nodes={nodes}
                      selectedStops={[]}
                      setSelectedStops={null}
                      routeResult={result1}
                      dijkstraResult={null}
                      qaoaResult={null}
                      comparisonMode={false}
                      mapCenter={mapCenter}
                      loading={false}
                    />
                  </div>

                  {/* Details 1 */}
                  <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-purple-300">
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Distance</div>
                        <div className="text-2xl font-bold text-blue-700">{result1.distance.toFixed(2)} km</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Execution Time</div>
                        <div className="text-lg font-bold text-green-700">
                          {result1.execution_time >= 1 
                            ? `${result1.execution_time.toFixed(2)}s`
                            : `${(result1.execution_time * 1000).toFixed(0)}ms`
                          }
                        </div>
                      </div>
                      {(() => {
                        const costs = calculateRouteCost(result1.distance);
                        return (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                            <div className="text-sm font-semibold text-gray-700 mb-3">💰 Cost Breakdown</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Fuel Cost:</span>
                                <span className="font-semibold">₹{costs.fuelCost}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Driver Cost:</span>
                                <span className="font-semibold">₹{costs.driverCost}</span>
                              </div>
                              <div className="flex justify-between border-t-2 border-green-300 pt-2 mt-2">
                                <span className="font-bold">Total Cost:</span>
                                <span className="font-bold text-green-700 text-lg">₹{costs.totalCost}</span>
                              </div>
                              <div className="text-center text-sm text-gray-600 bg-white rounded py-2 mt-2">
                                ⏱️ Est. Time: {costs.estimatedTimeMinutes} min
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Algorithm 2 - Right Side */}
                <div className="space-y-4">
                  {/* Map 2 */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-indigo-300">
                    <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 p-3">
                      <h3 className="text-lg font-bold text-center text-gray-800">
                        {getAlgorithmName(algorithm2)}
                      </h3>
                    </div>
                    <MapView
                      nodes={nodes}
                      selectedStops={[]}
                      setSelectedStops={null}
                      routeResult={result2}
                      dijkstraResult={null}
                      qaoaResult={null}
                      comparisonMode={false}
                      mapCenter={mapCenter}
                      loading={false}
                    />
                  </div>

                  {/* Details 2 */}
                  <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-indigo-300">
                    <div className="space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Distance</div>
                        <div className="text-2xl font-bold text-blue-700">{result2.distance.toFixed(2)} km</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Execution Time</div>
                        <div className="text-lg font-bold text-green-700">
                          {result2.execution_time >= 1 
                            ? `${result2.execution_time.toFixed(2)}s`
                            : `${(result2.execution_time * 1000).toFixed(0)}ms`
                          }
                        </div>
                      </div>
                      {(() => {
                        const costs = calculateRouteCost(result2.distance);
                        return (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                            <div className="text-sm font-semibold text-gray-700 mb-3">� Cost Breakdown</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Fuel Cost:</span>
                                <span className="font-semibold">₹{costs.fuelCost}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Driver Cost:</span>
                                <span className="font-semibold">₹{costs.driverCost}</span>
                              </div>
                              <div className="flex justify-between border-t-2 border-green-300 pt-2 mt-2">
                                <span className="font-bold">Total Cost:</span>
                                <span className="font-bold text-green-700 text-lg">₹{costs.totalCost}</span>
                              </div>
                              <div className="text-center text-sm text-gray-600 bg-white rounded py-2 mt-2">
                                ⏱️ Est. Time: {costs.estimatedTimeMinutes} min
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
                <MapView
                  nodes={nodes}
                  selectedStops={selectedStops}
                  setSelectedStops={setSelectedStops}
                  routeResult={null}
                  dijkstraResult={null}
                  qaoaResult={null}
                  comparisonMode={false}
                  mapCenter={mapCenter}
                  loading={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;
