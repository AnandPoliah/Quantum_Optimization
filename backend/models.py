from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import uuid

class Node(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    lat: float
    lng: float
    is_depot: bool = False  # Flag to mark node as depot/warehouse
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class NodeCreate(BaseModel):
    name: str
    lat: float
    lng: float
    is_depot: bool = False

class RouteRequest(BaseModel):
    stops: List[str]        # List of node IDs to visit
    algorithm: str          # Algorithm to use
    depot_id: Optional[str] = None  # Optional depot node ID (must start and end here)

class RouteResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    algorithm: str
    start_node_id: str
    end_node_id: str
    path: List[str]
    distance: float
    execution_time: float
    route_geometry: Optional[List[List[float]]] = None  # [[lat, lng], [lat, lng], ...]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GraphVisualization(BaseModel):
    nodes: List[Dict]
    edges: List[Dict]
