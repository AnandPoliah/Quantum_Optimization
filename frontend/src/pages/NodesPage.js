import React, { useState } from "react";
import MapView from "../components/MapView";

const NodesPage = ({ nodes, setNodes, fetchNodes, mapCenter }) => {
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNode, setNewNode] = useState({ name: "", lat: "", lng: "" });
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  const createSampleNodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/nodes/sample`, { method: "POST" });
      if (response.ok) {
        await fetchNodes();
        alert("Sample nodes created successfully!");
      }
    } catch (error) {
      console.error("Error creating sample nodes:", error);
      alert("Error creating sample nodes");
    } finally {
      setLoading(false);
    }
  };

  const addNode = async () => {
    if (!newNode.name || !newNode.lat || !newNode.lng) {
      alert("Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newNode.name,
          lat: parseFloat(newNode.lat),
          lng: parseFloat(newNode.lng),
        }),
      });
      if (response.ok) {
        await fetchNodes();
        setNewNode({ name: "", lat: "", lng: "" });
        setShowAddNode(false);
        alert("Node added successfully!");
      }
    } catch (error) {
      console.error("Error adding node:", error);
      alert("Error adding node");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Node Management */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">📍</span>
                <h2 className="text-2xl font-bold text-gray-800">Delivery Points</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={createSampleNodes}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <span>🎯</span> Create Sample Nodes (10)
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowAddNode(!showAddNode)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>{showAddNode ? "✖" : "➕"}</span>
                  {showAddNode ? "Cancel" : "Add Custom Node"}
                </button>

                {showAddNode && (
                  <div className="space-y-3 pt-4 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Node name (e.g., Warehouse A)"
                      value={newNode.name}
                      onChange={(e) =>
                        setNewNode({ ...newNode, name: e.target.value })
                      }
                      className="w-full border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg px-4 py-3 outline-none transition-all"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g., 11.0183)"
                      value={newNode.lat}
                      onChange={(e) =>
                        setNewNode({ ...newNode, lat: e.target.value })
                      }
                      className="w-full border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg px-4 py-3 outline-none transition-all"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g., 76.9685)"
                      value={newNode.lng}
                      onChange={(e) =>
                        setNewNode({ ...newNode, lng: e.target.value })
                      }
                      className="w-full border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg px-4 py-3 outline-none transition-all"
                    />
                    <button
                      onClick={addNode}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      ✓ Add Node
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-5 border-t-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Active Nodes
                  </p>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                    {nodes.length}
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                  {nodes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No nodes available. Create some to get started!
                    </p>
                  ) : (
                    nodes.map((node) => (
                      <div
                        key={node.id}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-gray-800">
                          {node.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          📍 {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <MapView
              nodes={nodes}
              selectedStops={[]}
              setSelectedStops={null}
              routeResult={null}
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

export default NodesPage;
