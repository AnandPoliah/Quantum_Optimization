import math
import numpy as np
import networkx as nx
from typing import Dict, Any, List, Tuple
from db import get_db
import traceback

from qiskit_aer import Aer
from qiskit_aer.primitives import Sampler as AerSampler
from qiskit_algorithms import QAOA   # ✅ comes from qiskit-algorithms
from qiskit_algorithms.optimizers import COBYLA
from qiskit_optimization import QuadraticProgram
from qiskit_optimization.algorithms import MinimumEigenOptimizer

from qiskit_optimization.applications import Tsp 

# Import centralized logger
from logger_config import get_logger

logger = get_logger(__name__)

# instead of algorithm_globals
np.random.seed(42)

# -------------------------
# Utilities
# -------------------------
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute distance between two coordinates (km) using Haversine."""
    R = 6371.0
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# -------------------------
# Graph build helpers
# -------------------------
async def build_graph_from_nodes(node_ids: List[str]) -> nx.Graph:
    """
    Load a specific list of nodes from DB and construct a weighted complete graph.
    """
    logger.info(f"Building graph for {len(node_ids)} nodes")
    
    db = await get_db()
    
    # Query MongoDB to find all documents where the 'id' is in our list
    query = {"id": {"$in": node_ids}}
    nodes_cursor = db.nodes.find(query)
    nodes = await nodes_cursor.to_list(len(node_ids))

    G = nx.Graph()
    for node in nodes:
        G.add_node(node['id'], name=node['name'], lat=node['lat'], lng=node['lng'])

    # Build complete graph with weighted edges
    node_list = list(G.nodes(data=True))
    for i, (n1, d1) in enumerate(node_list):
        for j, (n2, d2) in enumerate(node_list):
            if i < j:
                dist = haversine_km(d1['lat'], d1['lng'], d2['lat'], d2['lng'])
                G.add_edge(n1, n2, weight=dist)

    logger.info(f"Graph ready: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G


async def graph_visualization() -> Dict[str, List[Dict[str, Any]]]:
    """Prepare graph nodes and edges for frontend visualization."""
    db = await get_db()
    nodes = await db.nodes.find().to_list(1000)

    vis_nodes = [
        {"id": n['id'], "name": n['name'], "lat": n['lat'], "lng": n['lng']} for n in nodes
    ]

    vis_edges = []
    for i, n1 in enumerate(vis_nodes):
        for j, n2 in enumerate(vis_nodes):
            if i < j:
                d = haversine_km(n1['lat'], n1['lng'], n2['lat'], n2['lng'])
                vis_edges.append({"from": n1['id'], "to": n2['id'], "weight": round(d, 2)})

    return {"nodes": vis_nodes, "edges": vis_edges}

# -------------------------
# Algorithms
# -------------------------
class QuantumRouteOptimizer:
    """
    Solves routing problems using classical and quantum algorithms.
    Includes Dijkstra for A-to-B paths and QAOA for the Traveling Salesperson Problem (TSP).
    """

    def solve_tsp_qaoa(self, graph: nx.Graph, p: int = 1) -> Tuple[List[str], float]:
        """
        Solves the Traveling Salesperson Problem (TSP) using QAOA.
        Finds the optimal tour that visits every node in the graph.
        """
        num_nodes = graph.number_of_nodes()
        logger.info(f"Starting QAOA TSP for {num_nodes} nodes")
        
        # Pre-check: TSP needs at least 2 nodes to be meaningful.
        if num_nodes < 2:
            logger.warning("Graph has less than 2 nodes")
            return [], 0.0
            
        try:
            # 1. Relabel the graph nodes to integers (0, 1, 2...)
            int_graph = nx.convert_node_labels_to_integers(graph, label_attribute='original_label')
            inverse_mapping = nx.get_node_attributes(int_graph, 'original_label')

            # 2. Create a TSP instance from the integer-labeled graph
            tsp = Tsp(int_graph)
            qp = tsp.to_quadratic_program()

            # 3. Set up QAOA solver with adaptive parameters
            if num_nodes <= 4:
                shots = 512
                maxiter = 50
                reps = 2
            else:
                shots = 256
                maxiter = 30
                reps = p
            
            logger.info(f"QAOA params: shots={shots}, maxiter={maxiter}, reps={reps}")
            
            sampler = AerSampler(
                backend_options={"method": "statevector"},
                run_options={"shots": shots, "seed": 42}
            )
            qaoa = QAOA(sampler=sampler, optimizer=COBYLA(maxiter=maxiter), reps=reps)
            optimizer = MinimumEigenOptimizer(qaoa)
            
            logger.info("Running QAOA optimization...")
            result = optimizer.solve(qp)
            logger.info(f"QAOA complete - fval: {result.fval if hasattr(result, 'fval') else 'N/A'}")

            # 4. Interpret the result
            raw_path = tsp.interpret(result)
            
            if raw_path is None or not raw_path:
                logger.error("Empty path returned from TSP interpret")
                return [], float("inf")

            # Normalize output: flatten nested lists and coerce to ints
            path = raw_path
            if path:
                first = path[0]
                if isinstance(first, (list, tuple, np.ndarray)) and len(path) == 1:
                    path = list(first)

            normalized: List[int] = []
            for elem in path:
                if isinstance(elem, (list, tuple, np.ndarray)):
                    for sub in elem:
                        normalized.append(int(sub))
                else:
                    normalized.append(int(elem))

            logger.info(f"Path: {normalized}")
            
            # Verify we have all nodes
            if len(normalized) != num_nodes:
                logger.error(f"Incomplete path: {len(normalized)}/{num_nodes} nodes. Missing: {set(range(num_nodes)) - set(normalized)}")
                return [], float("inf")

            adj_matrix = nx.to_numpy_array(int_graph, weight="weight")
            distance = Tsp.tsp_value(normalized, adj_matrix)
            
            # 5. Convert back to original node IDs
            path_ids = [inverse_mapping[i] for i in normalized]
            
            # Get node names for logging
            node_names = [graph.nodes[node_id].get('name', node_id) for node_id in path_ids]

            # Close the tour if not already closed
            if path_ids and path_ids[0] != path_ids[-1]:
                path_ids.append(path_ids[0])
                closing_distance = graph[path_ids[-2]][path_ids[-1]]['weight']
                distance += closing_distance
                node_names.append(node_names[0])
            
            logger.info(f"Tour: {' → '.join(node_names)}")
            logger.info(f"Total distance: {distance:.2f} km")
            
            return path_ids, distance

        except Exception as e:
            logger.error(f"QAOA TSP Error: {e}")
            logger.error(traceback.format_exc())
            return [], float("inf")

    def solve_dijkstra(self, graph: nx.Graph, start: str, end: str) -> Tuple[List[str], float]:
        """Classical shortest path via Dijkstra."""
        try:
            path = nx.shortest_path(graph, source=start, target=end, weight="weight")
            dist = nx.shortest_path_length(graph, source=start, target=end, weight="weight")
            return path, dist
        except nx.NetworkXNoPath:
            logger.error(f"No path found from {start} to {end}")
            return [], float("inf")

    def solve_multi_stop(self, graph: nx.Graph, stops: List[str], algorithm: str) -> Tuple[List[str], float]:
        """
        Computes a route across multiple stops.
        - 'dijkstra': Solves in the given order [A->B, B->C, ...].
        - 'qaoa-tsp': Solves the TSP to find the optimal order of all nodes in the graph.
        """
        logger.info(f"Solving {algorithm} for {len(stops)} stops")
        algorithm = algorithm.lower()

        if algorithm == "qaoa":
            # The 'stops' list is ignored for TSP, as it solves for all nodes in the graph.
            return self.solve_tsp_qaoa(graph)

        elif algorithm == "dijkstra":
            if len(stops) < 2:
                return [], 0.0
            
            full_path: List[str] = []
            total_distance: float = 0.0

            # Visit stops in order
            for i in range(len(stops) - 1):
                s, t = stops[i], stops[i+1]
                path, dist = self.solve_dijkstra(graph, s, t)
                if not path:
                    logger.error(f"Failed to find path: {s} -> {t}")
                    return [], float("inf")
                
                if full_path:
                    full_path.extend(path[1:])
                else:
                    full_path.extend(path)
                total_distance += dist

            # Close the tour by returning to the starting point
            start_node = stops[0]
            end_node = stops[-1]
            
            if start_node != end_node:
                path, dist = self.solve_dijkstra(graph, end_node, start_node)
                if not path:
                    logger.error(f"Failed to close tour: {end_node} -> {start_node}")
                    return [], float("inf")
                
                full_path.extend(path[1:])
                total_distance += dist
            
            logger.info(f"Dijkstra tour: {total_distance:.2f} km")
            return full_path, total_distance
            
        else:
            logger.error(f"Invalid algorithm: {algorithm}")
            raise ValueError("Invalid algorithm specified.")


# Global optimizer instance
optimizer = QuantumRouteOptimizer()