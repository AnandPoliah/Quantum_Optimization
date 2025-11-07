import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

// Create custom icons for start, end, and waypoint markers
const createNumberedIcon = (number, color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">${number}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const startIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10b981; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">🏁</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

const endIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">🏁</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Custom component to add arrow decorations to polylines
const PolylineWithArrows = ({ positions, color, weight = 4, opacity = 0.9, dashArray = null }) => {
  const map = useMap();
  const decoratorRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    // Remove previous decorator if exists
    if (decoratorRef.current) {
      map.removeLayer(decoratorRef.current);
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    // Create the main polyline
    polylineRef.current = L.polyline(positions, {
      color: color,
      weight: weight,
      opacity: opacity,
      dashArray: dashArray,
    }).addTo(map);

    // Add arrow decorations
    decoratorRef.current = L.polylineDecorator(polylineRef.current, {
      patterns: [
        {
          offset: '10%',
          repeat: '15%',
          symbol: L.Symbol.arrowHead({
            pixelSize: 12,
            polygon: false,
            pathOptions: {
              stroke: true,
              weight: 3,
              color: color,
              opacity: opacity,
              fillOpacity: 0
            }
          })
        }
      ]
    }).addTo(map);

    // Cleanup function
    return () => {
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current);
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }
    };
  }, [map, positions, color, weight, opacity, dashArray]);

  return null;
};

// Component to add segment labels showing route sequence
const RouteSegmentLabels = ({ path, nodes, color }) => {
  if (!path || path.length < 2 || !nodes || nodes.length === 0) return null;
  
  return (
    <>
      {path.slice(0, -1).map((nodeId, idx) => {
        const node1 = nodes.find(n => n.id === nodeId);
        const node2 = nodes.find(n => n.id === path[idx + 1]);
        
        if (!node1 || !node2) return null;
        
        // Calculate midpoint between two nodes
        const midLat = (node1.lat + node2.lat) / 2;
        const midLng = (node1.lng + node2.lng) / 2;
        
        return (
          <CircleMarker
            key={`segment-${idx}-${nodeId}`}
            center={[midLat, midLng]}
            radius={16}
            pathOptions={{
              color: 'white',
              weight: 2,
              fillColor: color,
              fillOpacity: 0.95
            }}
          >
            <Popup>
              <div className="text-center">
                <div className="font-semibold text-sm">Segment {idx + 1}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {node1.name} → {node2.name}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

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
    
    // If route_geometry exists (actual road path), use it
    if (result.route_geometry && result.route_geometry.length > 0) {
      return result.route_geometry;  // Already in [lat, lng] format
    }
    
    // Otherwise, fall back to connecting node positions (straight lines)
    return result.path
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        return node ? [node.lat, node.lng] : null;
      })
      .filter((coord) => coord !== null);
  };

  const getMarkerIcon = (idx, pathLength, color = "#3b82f6") => {
    if (idx === 0) {
      return startIcon;
    } else if (idx === pathLength - 1) {
      return endIcon;
    } else {
      return createNumberedIcon(idx, color);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🗺️</span>
          <h2 className="text-2xl font-bold text-gray-800">Interactive Route Map</h2>
        </div>
        <p className="text-sm text-gray-600 mt-2 flex items-center gap-2 flex-wrap">
          {comparisonMode && dijkstraResult && qaoaResult && dijkstraResult.distance && qaoaResult.distance ? (
            <>
              <span className="px-3 py-1 rounded-full font-semibold bg-green-200 text-green-800">
                COMPARISON MODE
              </span>
              <span>
                Purple = Dijkstra ({dijkstraResult.distance.toFixed(2)} km) | 
                Blue = QAOA ({qaoaResult.distance.toFixed(2)} km)
              </span>
            </>
          ) : routeResult && routeResult.distance ? (
            <>
              <span className={`px-3 py-1 rounded-full font-semibold ${
                routeResult.algorithm === "dijkstra"
                  ? "bg-purple-200 text-purple-800"
                  : "bg-indigo-200 text-indigo-800"
              }`}>
                {routeResult.algorithm.toUpperCase()}
              </span>
              <span>
                route shown: {routeResult.distance.toFixed(2)} km
                {routeResult.route_geometry && (
                  <span className="ml-2 text-green-600 font-semibold">🛣️ Actual Road Path</span>
                )}
              </span>
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
            <>
              <PolylineWithArrows
                positions={getRouteCoordinates(routeResult)}
                color={routeResult.algorithm === "dijkstra" ? "#7c3aed" : "#4f46e5"}
                weight={routeResult.route_geometry ? 5 : 6}
                opacity={0.9}
                dashArray={routeResult.route_geometry ? null : "10, 10"}
              />
              
              {/* Route markers with start/end/waypoint distinction */}
              {routeResult.path && routeResult.path.map((nodeId, idx) => {
                const node = nodes.find((n) => n.id === nodeId);
                if (!node) return null;

                return (
                  <Marker
                    key={`route-marker-${idx}`}
                    position={[node.lat, node.lng]}
                    icon={getMarkerIcon(idx, routeResult.path.length, "#7c3aed")}
                    zIndexOffset={1000}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-semibold text-lg mb-2">
                          {idx === 0 ? "🟢 START" : idx === routeResult.path.length - 1 ? "🔴 END" : `📍 Stop ${idx}`}
                        </div>
                        <div className="font-bold text-blue-700">{node.name}</div>
                        <div className="text-sm text-gray-600 mt-2">
                          Position: {idx + 1} of {routeResult.path.length}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}

          {/* Render comparison routes */}
          {comparisonMode && dijkstraResult && qaoaResult && (
            <>
              {/* Dijkstra Route - Purple */}
              <PolylineWithArrows
                positions={getRouteCoordinates(dijkstraResult)}
                color="#7c3aed"
                weight={dijkstraResult.route_geometry ? 5 : 6}
                opacity={0.85}
                dashArray={dijkstraResult.route_geometry ? null : "15, 10"}
              />
              
              {/* Dijkstra Route Markers */}
              {dijkstraResult.path && dijkstraResult.path.map((nodeId, idx) => {
                const node = nodes.find((n) => n.id === nodeId);
                if (!node) return null;

                return (
                  <Marker
                    key={`dijkstra-marker-${idx}`}
                    position={[node.lat, node.lng]}
                    icon={getMarkerIcon(idx, dijkstraResult.path.length, "#7c3aed")}
                    zIndexOffset={1000}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-semibold text-lg mb-2 text-purple-700">
                          {idx === 0 ? "🟢 START" : idx === dijkstraResult.path.length - 1 ? "🔴 END" : `📍 Stop ${idx}`}
                        </div>
                        <div className="font-bold text-purple-700">{node.name}</div>
                        <div className="text-sm text-gray-600 mt-2">
                          Dijkstra Route - Position: {idx + 1} of {dijkstraResult.path.length}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* QAOA Route - Blue */}
              <PolylineWithArrows
                positions={getRouteCoordinates(qaoaResult)}
                color="#4f46e5"
                weight={qaoaResult.route_geometry ? 5 : 6}
                opacity={0.85}
                dashArray={qaoaResult.route_geometry ? null : "5, 5"}
              />
              
              {/* QAOA Route Markers */}
              {qaoaResult.path && qaoaResult.path.map((nodeId, idx) => {
                const node = nodes.find((n) => n.id === nodeId);
                if (!node) return null;

                return (
                  <Marker
                    key={`qaoa-marker-${idx}`}
                    position={[node.lat, node.lng]}
                    icon={getMarkerIcon(idx, qaoaResult.path.length, "#4f46e5")}
                    zIndexOffset={999}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-semibold text-lg mb-2 text-indigo-700">
                          {idx === 0 ? "🟢 START" : idx === qaoaResult.path.length - 1 ? "🔴 END" : `📍 Stop ${idx}`}
                        </div>
                        <div className="font-bold text-indigo-700">{node.name}</div>
                        <div className="text-sm text-gray-600 mt-2">
                          QAOA Route - Position: {idx + 1} of {qaoaResult.path.length}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
