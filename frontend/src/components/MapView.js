import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

const MapView = ({ 
  nodes, 
  selectedStops, 
  setSelectedStops, 
  routeResult, 
  dijkstraResult, 
  qaoaResult, 
  comparisonMode,
  mapCenter,
  loading 
}) => {
  
  const getRouteCoordinates = (result) => {
    if (!result || !result.path) return [];
    return result.path
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        return node ? [node.lat, node.lng] : null;
      })
      .filter((coord) => coord !== null);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-2xl font-bold text-gray-800">Interactive Route Map</h2>
        </div>
        <p className="text-sm text-gray-600 mt-2 flex items-center gap-2 flex-wrap">
          {comparisonMode && dijkstraResult && qaoaResult ? (
            <>
              <span className="px-3 py-1 rounded-full font-semibold bg-green-200 text-green-800">
                COMPARISON MODE
              </span>
              <span>
                Purple = Dijkstra ({dijkstraResult.distance.toFixed(2)} km) | 
                Blue = QAOA ({qaoaResult.distance.toFixed(2)} km)
              </span>
            </>
          ) : routeResult ? (
            <>
              <span className={`px-3 py-1 rounded-full font-semibold ${
                routeResult.algorithm === "dijkstra"
                  ? "bg-purple-200 text-purple-800"
                  : "bg-indigo-200 text-indigo-800"
              }`}>
                {routeResult.algorithm.toUpperCase()}
              </span>
              <span>route shown: {routeResult.distance.toFixed(2)} km</span>
            </>
          ) : (
            <span>👆 Select stops on the map and choose an algorithm to visualize the route</span>
          )}
        </p>
      </div>

      <div style={{ height: "650px" }} className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 z-[1000] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner-large mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">Optimizing route...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render nodes as markers */}
          {nodes.map((node) => (
            <Marker key={node.id} position={[node.lat, node.lng]}>
              <Popup>
                <div className="p-2">
                  <div className="font-bold text-lg text-gray-800 mb-2">{node.name}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📍 Lat: {node.lat.toFixed(4)}</div>
                    <div>📍 Lng: {node.lng.toFixed(4)}</div>
                  </div>
                  {setSelectedStops && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          if (!selectedStops.includes(node.id)) {
                            setSelectedStops([...selectedStops, node.id]);
                          }
                        }}
                        disabled={selectedStops.includes(node.id)}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                      >
                        {selectedStops.includes(node.id) ? '✓ Already Added' : '➕ Add to Route'}
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render single route */}
          {!comparisonMode && routeResult && getRouteCoordinates(routeResult).length > 1 && (
            <Polyline
              positions={getRouteCoordinates(routeResult)}
              pathOptions={{
                color: routeResult.algorithm === "dijkstra" ? "#7c3aed" : "#4f46e5",
                weight: 5,
                opacity: 0.8,
                dashArray: "10, 10",
              }}
            />
          )}

          {/* Render comparison routes */}
          {comparisonMode && dijkstraResult && qaoaResult && (
            <>
              {/* Dijkstra Route - Purple */}
              <Polyline
                positions={getRouteCoordinates(dijkstraResult)}
                pathOptions={{
                  color: "#7c3aed",
                  weight: 6,
                  opacity: 0.7,
                  dashArray: "15, 10",
                }}
              />
              {/* QAOA Route - Blue */}
              <Polyline
                positions={getRouteCoordinates(qaoaResult)}
                pathOptions={{
                  color: "#4f46e5",
                  weight: 6,
                  opacity: 0.7,
                  dashArray: "5, 5",
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
