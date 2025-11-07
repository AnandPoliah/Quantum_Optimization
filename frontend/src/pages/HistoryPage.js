import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import MapView from "../components/MapView";

const HistoryPage = ({ nodes, mapCenter }) => {
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  const getAlgorithmName = (algo) => {
    const names = {
      dijkstra: "🚀 Dijkstra",
      qaoa: "⚛️ QAOA",
      genetic: "🧬 Genetic Algorithm",
      simulated_annealing: "🔥 Simulated Annealing",
      two_opt: "🔄 2-Opt",
      ant_colony: "🐜 Ant Colony"
    };
    return names[algo?.toLowerCase()] || algo;
  };

  const getAlgorithmColor = (algo) => {
    const colors = {
      dijkstra: "bg-purple-200 text-purple-800",
      qaoa: "bg-indigo-200 text-indigo-800",
      genetic: "bg-pink-200 text-pink-800",
      simulated_annealing: "bg-orange-200 text-orange-800",
      two_opt: "bg-blue-200 text-blue-800",
      ant_colony: "bg-green-200 text-green-800"
    };
    return colors[algo?.toLowerCase()] || "bg-gray-200 text-gray-800";
  };

  useEffect(() => {
    fetchOptimizationHistory();
  }, []);

  const fetchOptimizationHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/route/results`);
      const data = await response.json();
      setOptimizationHistory(data);
    } catch (error) {
      toast.error("Failed to fetch optimization history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getNodeName = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? node.name : nodeId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - History List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-2xl font-bold text-gray-800">Optimization History</h2>
                </div>
                <button
                  onClick={fetchOptimizationHistory}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  title="Refresh"
                >
                  🔄
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="spinner-large mb-4"></div>
                  <p className="text-gray-600">Loading history...</p>
                </div>
              ) : optimizationHistory.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <p className="text-sm text-gray-500">
                    No optimization history yet. Run some optimizations to see results here!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar">
                  {optimizationHistory.slice().reverse().map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => setRouteResult(result)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        routeResult && routeResult.id === result.id
                          ? 'bg-indigo-100 border-indigo-500 shadow-lg'
                          : 'bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${getAlgorithmColor(result.algorithm)}`}
                        >
                          {getAlgorithmName(result.algorithm)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-bold text-blue-700">{result.distance.toFixed(2)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-bold text-green-700">
                            {result.execution_time >= 1 
                              ? `${result.execution_time.toFixed(2)}s`
                              : `${(result.execution_time * 1000).toFixed(0)}ms`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stops:</span>
                          <span className="font-semibold text-gray-800">{result.path.length}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="text-xs text-gray-600 truncate">
                          Route: {result.path.slice(0, 3).map(nid => getNodeName(nid)).join(" → ")}
                          {result.path.length > 3 && "..."}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            {routeResult ? (
              <div className="space-y-6">
                <MapView
                  nodes={nodes}
                  selectedStops={[]}
                  setSelectedStops={null}
                  routeResult={routeResult}
                  dijkstraResult={null}
                  qaoaResult={null}
                  comparisonMode={false}
                  mapCenter={mapCenter}
                  loading={false}
                />

                {/* Detailed Result Info */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Route Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Algorithm</div>
                      <div className="font-bold text-lg">
                        {getAlgorithmName(routeResult.algorithm)}
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Distance</div>
                      <div className="font-bold text-lg text-blue-700">
                        {routeResult.distance.toFixed(2)} km
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Execution Time</div>
                      <div className="font-bold text-lg text-green-700">
                        {routeResult.execution_time >= 1 
                          ? `${routeResult.execution_time.toFixed(2)}s`
                          : `${(routeResult.execution_time * 1000).toFixed(0)}ms`
                        }
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Stops</div>
                      <div className="font-bold text-lg text-purple-700">
                        {routeResult.path.length} nodes
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200">
                    <span className="font-semibold text-gray-700 block mb-2">Complete Route Path:</span>
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
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
                <span className="text-6xl mb-4 block">📊</span>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Select a Route</h3>
                <p className="text-gray-600">
                  Click on any optimization result from the history to view it on the map
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
