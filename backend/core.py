import math
import numpy as np
import networkx as nx
from typing import Dict, Any, List, Tuple
from db import get_db
import traceback
import random
import os
import requests
from dotenv import load_dotenv

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

# Load environment variables
load_dotenv()
OPENROUTE_API_KEY = os.getenv("OPENROUTE_API_KEY")

# Cache to reduce API calls
road_distance_cache = {}

# instead of algorithm_globals
np.random.seed(42)
random.seed(42)

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


def get_road_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> Tuple[float, List]:
    """
    Get actual road distance and route geometry using OpenRouteService API.
    Returns: (distance_in_km, list_of_coordinates)
    Coordinates are in [lat, lng] format for Leaflet.
    Falls back to Haversine if API fails.
    """
    # Check cache first
    cache_key = f"{lat1:.6f},{lng1:.6f}-{lat2:.6f},{lng2:.6f}"
    if cache_key in road_distance_cache:
        logger.debug(f"Using cached road distance")
        return road_distance_cache[cache_key]
    
    if not OPENROUTE_API_KEY:
        logger.warning("OPENROUTE_API_KEY not set, using Haversine fallback")
        return haversine_km(lat1, lng1, lat2, lng2), None
    
    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    
    headers = {
        'Authorization': OPENROUTE_API_KEY,
        'Content-Type': 'application/json'
    }
    
    body = {
        'coordinates': [[lng1, lat1], [lng2, lat2]]  # ORS uses [lng, lat]
    }
    
    try:
        logger.info(f"🌐 Fetching road route from ORS API")
        response = requests.post(url, json=body, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'features' in data and len(data['features']) > 0:
            feature = data['features'][0]
            distance_m = feature['properties']['segments'][0]['distance']
            distance_km = distance_m / 1000
            
            # Get coordinates from geometry
            coordinates = feature['geometry']['coordinates']
            # Convert [lng, lat] to [lat, lng] for Leaflet
            coordinates = [[coord[1], coord[0]] for coord in coordinates]
            
            # Cache the result
            road_distance_cache[cache_key] = (distance_km, coordinates)
            
            logger.info(f"✅ Road distance: {distance_km:.2f} km with {len(coordinates)} waypoints")
            return distance_km, coordinates
        else:
            logger.warning("No routes in API response, using Haversine")
            distance = haversine_km(lat1, lng1, lat2, lng2)
            return distance, None
            
    except Exception as e:
        logger.error(f"❌ OpenRouteService API error: {e}")
        distance = haversine_km(lat1, lng1, lat2, lng2)
        return distance, None


# -------------------------
# Graph build helpers
# -------------------------
async def build_graph_from_nodes(node_ids: List[str], use_road_routing: bool = True) -> nx.Graph:
    """
    Load a specific list of nodes from DB and construct a weighted complete graph.
    If use_road_routing=True, uses actual road distances and stores route geometry.
    Otherwise uses straight-line Haversine distance.
    """
    logger.info(f"Building graph for {len(node_ids)} nodes (road_routing={use_road_routing})")
    
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
    edge_count = 0
    
    for i, (n1, d1) in enumerate(node_list):
        for j, (n2, d2) in enumerate(node_list):
            if i < j:
                if use_road_routing:
                    # Get actual road distance and geometry
                    dist, geometry = get_road_distance(d1['lat'], d1['lng'], d2['lat'], d2['lng'])
                    G.add_edge(n1, n2, weight=dist, geometry=geometry)
                else:
                    # Use straight-line distance
                    dist = haversine_km(d1['lat'], d1['lng'], d2['lat'], d2['lng'])
                    G.add_edge(n1, n2, weight=dist, geometry=None)
                edge_count += 1

    logger.info(f"Graph ready: {G.number_of_nodes()} nodes, {edge_count} edges")
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
# Helper function for distance calculation
# -------------------------
def calculate_route_distance(route: List[str], graph: nx.Graph) -> float:
    """Calculate total distance of a route including return to start"""
    if len(route) < 2:
        return 0.0
    distance = 0.0
    for i in range(len(route) - 1):
        if graph.has_edge(route[i], route[i+1]):
            distance += graph[route[i]][route[i+1]]['weight']
        else:
            return float('inf')
    # Add return to start
    if graph.has_edge(route[-1], route[0]):
        distance += graph[route[-1]][route[0]]['weight']
    return distance

# -------------------------
# Algorithms
# -------------------------
class QuantumRouteOptimizer:
    """
    Solves routing problems using classical and quantum algorithms.
    Includes Dijkstra, QAOA, Genetic Algorithm, Simulated Annealing, Ant Colony, and 2-Opt.
    """

    def solve_genetic_algorithm(self, graph: nx.Graph, population_size: int = 50, 
                                 generations: int = 100, mutation_rate: float = 0.01, 
                                 close_tour: bool = True) -> Tuple[List[str], float]:
        """Solve TSP using Genetic Algorithm"""
        logger.info(f"Starting Genetic Algorithm: pop={population_size}, gen={generations}")
        
        nodes = list(graph.nodes())
        if len(nodes) < 2:
            return nodes, 0.0
        
        # Initialize population with random routes
        population = [random.sample(nodes, len(nodes)) for _ in range(population_size)]
        
        def calc_fitness(route):
            # For open tours, don't add return distance
            if close_tour:
                dist = calculate_route_distance(route, graph)
            else:
                dist = 0.0
                for i in range(len(route) - 1):
                    if graph.has_edge(route[i], route[i+1]):
                        dist += graph[route[i]][route[i+1]]['weight']
                    else:
                        return 0.0
            return 1.0 / dist if dist > 0 else 0
        
        def tournament_select(pop, fitness_vals):
            sample_indices = random.sample(range(len(pop)), k=min(3, len(pop)))
            best_idx = max(sample_indices, key=lambda i: fitness_vals[i])
            return pop[best_idx].copy()
        
        def crossover(parent1, parent2):
            """Order Crossover (OX)"""
            size = len(parent1)
            start, end = sorted(random.sample(range(size), 2))
            child = [None] * size
            child[start:end] = parent1[start:end]
            pointer = end
            for city in parent2[end:] + parent2[:end]:
                if city not in child:
                    child[pointer % size] = city
                    pointer += 1
            return child
        
        def mutate(route):
            """Swap mutation"""
            route = route.copy()
            i, j = random.sample(range(len(route)), 2)
            route[i], route[j] = route[j], route[i]
            return route
        
        # Evolution loop
        for generation in range(generations):
            fitness = [calc_fitness(route) for route in population]
            new_population = []
            
            for _ in range(population_size):
                parent1 = tournament_select(population, fitness)
                parent2 = tournament_select(population, fitness)
                child = crossover(parent1, parent2)
                
                if random.random() < mutation_rate:
                    child = mutate(child)
                
                new_population.append(child)
            
            population = new_population
        
        # Return best route
        best_route = min(population, key=lambda r: calc_fitness(r) if close_tour else sum(graph[r[i]][r[i+1]]['weight'] for i in range(len(r)-1) if graph.has_edge(r[i], r[i+1])))
        
        if close_tour:
            best_distance = calculate_route_distance(best_route, graph)
            best_route.append(best_route[0])  # Close the tour
        else:
            best_distance = 0.0
            for i in range(len(best_route) - 1):
                if graph.has_edge(best_route[i], best_route[i+1]):
                    best_distance += graph[best_route[i]][best_route[i+1]]['weight']
        
        logger.info(f"Genetic Algorithm result: {best_distance:.2f} km")
        return best_route, best_distance
    
    def solve_simulated_annealing(self, graph: nx.Graph, initial_temp: float = 1000, 
                                   cooling_rate: float = 0.995, min_temp: float = 1,
                                   close_tour: bool = True) -> Tuple[List[str], float]:
        """Solve TSP using Simulated Annealing"""
        logger.info(f"Starting Simulated Annealing: T={initial_temp}, cooling={cooling_rate}")
        
        nodes = list(graph.nodes())
        if len(nodes) < 2:
            return nodes, 0.0
        
        current_route = random.sample(nodes, len(nodes))
        
        # Calculate distance based on whether tour is closed
        def calc_distance(route):
            if close_tour:
                return calculate_route_distance(route, graph)
            else:
                dist = 0.0
                for i in range(len(route) - 1):
                    if graph.has_edge(route[i], route[i+1]):
                        dist += graph[route[i]][route[i+1]]['weight']
                    else:
                        return float('inf')
                return dist
        
        current_distance = calc_distance(current_route)
        
        best_route = current_route.copy()
        best_distance = current_distance
        
        temp = initial_temp
        
        while temp > min_temp:
            # Generate neighbor by swapping two cities
            new_route = current_route.copy()
            i, j = random.sample(range(len(new_route)), 2)
            new_route[i], new_route[j] = new_route[j], new_route[i]
            
            new_distance = calc_distance(new_route)
            
            # Accept or reject
            if new_distance < current_distance:
                current_route = new_route
                current_distance = new_distance
                
                if new_distance < best_distance:
                    best_route = new_route.copy()
                    best_distance = new_distance
            else:
                delta = new_distance - current_distance
                probability = math.exp(-delta / temp)
                if random.random() < probability:
                    current_route = new_route
                    current_distance = new_distance
            
            temp *= cooling_rate
        
        if close_tour:
            best_route.append(best_route[0])  # Close the tour
        logger.info(f"Simulated Annealing result: {best_distance:.2f} km")
        return best_route, best_distance
    
    def solve_ant_colony(self, graph: nx.Graph, n_ants: int = 10, n_iterations: int = 100,
                        alpha: float = 1.0, beta: float = 2.0, evaporation: float = 0.5,
                        close_tour: bool = True) -> Tuple[List[str], float]:
        """Solve TSP using Ant Colony Optimization"""
        logger.info(f"Starting Ant Colony: ants={n_ants}, iterations={n_iterations}")
        
        nodes = list(graph.nodes())
        if len(nodes) < 2:
            return nodes, 0.0
        
        n_nodes = len(nodes)
        
        # Initialize pheromone matrix
        pheromone = np.ones((n_nodes, n_nodes))
        
        # Build distance matrix
        distances = np.zeros((n_nodes, n_nodes))
        for i in range(n_nodes):
            for j in range(n_nodes):
                if i != j and graph.has_edge(nodes[i], nodes[j]):
                    distances[i][j] = graph[nodes[i]][nodes[j]]['weight']
                else:
                    distances[i][j] = float('inf')
        
        best_route = None
        best_distance = float('inf')
        
        for iteration in range(n_iterations):
            all_routes = []
            all_distances = []
            
            for ant in range(n_ants):
                # Build route for this ant
                visited = [random.randint(0, n_nodes - 1)]
                
                while len(visited) < n_nodes:
                    current = visited[-1]
                    unvisited = [i for i in range(n_nodes) if i not in visited]
                    
                    # Calculate probabilities
                    probabilities = []
                    for next_node in unvisited:
                        pheromone_val = pheromone[current][next_node] ** alpha
                        distance_val = (1.0 / distances[current][next_node]) ** beta if distances[current][next_node] > 0 else 0
                        probabilities.append(pheromone_val * distance_val)
                    
                    prob_sum = sum(probabilities)
                    if prob_sum > 0:
                        probabilities = [p / prob_sum for p in probabilities]
                        next_idx = np.random.choice(len(unvisited), p=probabilities)
                        visited.append(unvisited[next_idx])
                    else:
                        visited.append(random.choice(unvisited))
                
                # Calculate distance
                route = [nodes[i] for i in visited]
                if close_tour:
                    distance = calculate_route_distance(route, graph)
                else:
                    distance = 0.0
                    for i in range(len(route) - 1):
                        if graph.has_edge(route[i], route[i+1]):
                            distance += graph[route[i]][route[i+1]]['weight']
                        else:
                            distance = float('inf')
                            break
                
                all_routes.append(route)
                all_distances.append(distance)
                
                if distance < best_distance:
                    best_distance = distance
                    best_route = route.copy()
            
            # Update pheromones
            pheromone *= (1 - evaporation)
            
            for route, distance in zip(all_routes, all_distances):
                if distance < float('inf'):
                    deposit = 1.0 / distance
                    for i in range(len(route)):
                        from_idx = nodes.index(route[i])
                        to_idx = nodes.index(route[(i + 1) % len(route)])
                        pheromone[from_idx][to_idx] += deposit
        
        if best_route:
            if close_tour:
                best_route.append(best_route[0])  # Close the tour
        else:
            best_route = nodes + ([nodes[0]] if close_tour else [])
        
        logger.info(f"Ant Colony result: {best_distance:.2f} km")
        return best_route, best_distance
    
    def solve_two_opt(self, graph: nx.Graph, max_iterations: int = 1000, close_tour: bool = True) -> Tuple[List[str], float]:
        """Solve TSP using 2-Opt local search improvement"""
        logger.info(f"Starting 2-Opt: max_iterations={max_iterations}")
        
        nodes = list(graph.nodes())
        if len(nodes) < 2:
            return nodes, 0.0
        
        # Distance calculation function
        def calc_distance(route):
            if close_tour:
                return calculate_route_distance(route, graph)
            else:
                dist = 0.0
                for i in range(len(route) - 1):
                    if graph.has_edge(route[i], route[i+1]):
                        dist += graph[route[i]][route[i+1]]['weight']
                    else:
                        return float('inf')
                return dist
        
        route = nodes.copy()
        improved = True
        iteration = 0
        
        while improved and iteration < max_iterations:
            improved = False
            iteration += 1
            
            for i in range(1, len(route) - 1):
                for j in range(i + 1, len(route)):
                    # Try reversing segment [i:j]
                    new_route = route[:i] + route[i:j][::-1] + route[j:]
                    
                    if calc_distance(new_route) < calc_distance(route):
                        route = new_route
                        improved = True
                        break
                if improved:
                    break
        
        distance = calc_distance(route)
        if close_tour:
            route.append(route[0])  # Close the tour
        
        logger.info(f"2-Opt result: {distance:.2f} km")
        return route, distance

    def solve_tsp_qaoa(self, graph: nx.Graph, p: int = 1, close_tour: bool = True) -> Tuple[List[str], float]:
        """
        Solves the Traveling Salesperson Problem (TSP) using QAOA.
        Finds the optimal tour that visits every node in the graph.
        
        Args:
            graph: NetworkX graph with weighted edges
            p: QAOA repetition parameter
            close_tour: If True, returns to starting point. If False, leaves tour open.
        """
        num_nodes = graph.number_of_nodes()
        logger.info(f"Starting QAOA TSP for {num_nodes} nodes (close_tour={close_tour})")
        
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
            # Increase shots and iterations for better accuracy
            if num_nodes == 3:
                shots = 2048
                maxiter = 100
                reps = 3
            elif num_nodes == 4:
                shots = 1024
                maxiter = 80
                reps = 3
            elif num_nodes == 5:
                shots = 512
                maxiter = 60
                reps = 2
            else:
                shots = 256
                maxiter = 40
                reps = p
            
            logger.info(f"QAOA params: shots={shots}, maxiter={maxiter}, reps={reps}")
            
            sampler = AerSampler(
                backend_options={"method": "statevector"},
                run_options={"shots": shots, "seed": None}  # Remove fixed seed for better results
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
                logger.warning(f"Incomplete path: {len(normalized)}/{num_nodes} nodes. Missing: {set(range(num_nodes)) - set(normalized)}")
                
                # For small graphs, try to fix by adding missing nodes
                missing = list(set(range(num_nodes)) - set(normalized))
                if missing and num_nodes <= 5:
                    logger.info(f"Attempting to insert missing nodes: {missing}")
                    # Insert missing nodes in optimal positions
                    for missing_node in missing:
                        best_pos = 0
                        best_increase = float('inf')
                        
                        # Try inserting at each position
                        for i in range(len(normalized) + 1):
                            test_path = normalized[:i] + [missing_node] + normalized[i:]
                            # Calculate distance increase (simple heuristic)
                            if i == 0:
                                increase = 0
                            elif i == len(normalized):
                                increase = 0
                            else:
                                increase = i  # Simple heuristic: prefer middle positions
                            
                            if increase < best_increase:
                                best_increase = increase
                                best_pos = i
                        
                        normalized.insert(best_pos, missing_node)
                        logger.info(f"Inserted node {missing_node} at position {best_pos}")
                    
                    logger.info(f"Fixed path: {normalized}")
                else:
                    logger.error("Cannot fix incomplete path, returning empty path")
                    return [], float("inf")

            # 5. Convert back to original node IDs
            path_ids = [inverse_mapping[i] for i in normalized]
            
            # Close the tour if requested and not already closed
            if close_tour and path_ids and path_ids[0] != path_ids[-1]:
                path_ids.append(path_ids[0])
            
            # Calculate distance based on close_tour setting
            if close_tour:
                distance = calculate_route_distance(path_ids[:-1] if path_ids[-1] == path_ids[0] else path_ids, graph)
            else:
                distance = 0.0
                for i in range(len(path_ids) - 1):
                    if graph.has_edge(path_ids[i], path_ids[i+1]):
                        distance += graph[path_ids[i]][path_ids[i+1]]['weight']
                    else:
                        distance = float('inf')
                        break
            
            # Get node names for logging
            node_names = [graph.nodes[node_id].get('name', node_id) for node_id in path_ids]
            
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

    def solve_multi_stop(self, graph: nx.Graph, stops: List[str], algorithm: str, close_tour: bool = True) -> Tuple[List[str], float]:
        """
        Computes a route across multiple stops.
        - 'dijkstra': Solves in the given order [A->B, B->C, ...].
        - 'qaoa': Solves the TSP to find the optimal order (quantum).
        - 'genetic': Genetic Algorithm for TSP.
        - 'simulated-annealing': Simulated Annealing for TSP.
        - 'ant-colony': Ant Colony Optimization for TSP.
        - '2-opt': 2-Opt local search for TSP.
        
        Args:
            graph: The graph to solve on
            stops: List of node IDs to visit
            algorithm: Algorithm name
            close_tour: If True, returns to starting point. If False, leaves tour open.
        """
        logger.info(f"Solving {algorithm} for {len(stops)} stops (close_tour={close_tour})")
        algorithm = algorithm.lower()

        if algorithm == "qaoa":
            return self.solve_tsp_qaoa(graph, p=1, close_tour=close_tour)
        
        elif algorithm == "genetic":
            return self.solve_genetic_algorithm(graph, close_tour=close_tour)
        
        elif algorithm == "simulated-annealing":
            return self.solve_simulated_annealing(graph, close_tour=close_tour)
        
        elif algorithm == "ant-colony":
            return self.solve_ant_colony(graph, close_tour=close_tour)
        
        elif algorithm == "2-opt":
            return self.solve_two_opt(graph, close_tour=close_tour)

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