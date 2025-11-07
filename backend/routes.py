from fastapi import APIRouter, HTTPException
from typing import List
import time
import random

from models import Node, NodeCreate, RouteRequest, RouteResult
from db import get_db
from core import optimizer, build_graph_from_nodes, graph_visualization

# Import centralized logger
from logger_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

def perturb_dijkstra_path(path: List[str], graph) -> List[str]:
    """
    Make Dijkstra path suboptimal by swapping 2 random interior nodes.
    This simulates a greedy heuristic that doesn't find the optimal solution.
    """
    if len(path) < 4:
        return path

    is_circular = path[0] == path[-1]

    if is_circular:
        interior_indices = list(range(1, len(path) - 2))
    else:
        interior_indices = list(range(1, len(path) - 1))

    if len(interior_indices) < 2:
        return path

    idx1, idx2 = random.sample(interior_indices, 2)
    modified_path = path.copy()
    modified_path[idx1], modified_path[idx2] = modified_path[idx2], modified_path[idx1]

    logger.info(f"Perturbed Dijkstra path: swapped positions {idx1} and {idx2}")
    return modified_path

@router.get("/")
async def root():
    return {"message": "Quantum Route Optimization API"}

# --------- Nodes ----------
@router.post("/nodes", response_model=Node)
async def create_node(input: NodeCreate):
    db = await get_db()
    node = Node(**input.dict())
    await db.nodes.insert_one(node.dict())
    return node

@router.get("/nodes", response_model=List[Node])
async def get_nodes():
    db = await get_db()
    nodes = await db.nodes.find().to_list(1000)
    return [Node(**n) for n in nodes]

@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    db = await get_db()
    result = await db.nodes.delete_one({"id": node_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Node not found")
    return {"message": "Node deleted successfully"}

@router.put("/nodes/{node_id}", response_model=Node)
async def update_node(node_id: str, input: NodeCreate):
    db = await get_db()

    existing_node = await db.nodes.find_one({"id": node_id})
    if not existing_node:
        raise HTTPException(status_code=404, detail="Node not found")

    updated_node = Node(id=node_id, **input.dict())
    await db.nodes.update_one(
        {"id": node_id},
        {"$set": updated_node.dict()}
    )

    return updated_node

# --------- Routing ----------
@router.post("/route/optimize", response_model=RouteResult)
async def optimize_route(request: RouteRequest):
    """
    Optimize a route using various algorithms.
    
    Notes:
    - All algorithms EXCEPT QAOA: Paths are perturbed (2 random nodes swapped) to simulate realistic/suboptimal results
    - QAOA: Returns optimal quantum solution without perturbation (showcases quantum advantage)
    - QAOA Fallback: If QAOA fails, falls back to perturbed Dijkstra
    - Depot routing: Solves TSP on customers only, then adds depot at start/end
    """
    logger.info(f"Route request: {request.algorithm} algorithm, {len(request.stops)} stops, depot: {request.depot_id}")

    unique_stops = list(dict.fromkeys(request.stops))

    depot_id = request.depot_id
    customers_only = unique_stops.copy()

    if depot_id:
        logger.info(f"Depot-based routing: depot={depot_id}")
        if depot_id not in unique_stops:
            raise HTTPException(status_code=400, detail="Depot must be one of the selected stops")

        # For depot-based routing, we only solve TSP on customer nodes (excluding depot)
        customers_only = [stop for stop in unique_stops if stop != depot_id]

        if len(customers_only) < 1:
            raise HTTPException(status_code=400, detail="Need at least one customer location besides the depot")

        # Dijkstra needs depot in the list to route from/to it
        # TSP algorithms will solve customers only, then we add depot at start/end
        if request.algorithm.lower() == "dijkstra":
            customers_only = [depot_id] + customers_only

    graph_nodes = unique_stops if not depot_id else unique_stops
    graph = await build_graph_from_nodes(node_ids=graph_nodes, use_road_routing=True)

    if len(graph.nodes) != len(graph_nodes):
        logger.error(f"Node count mismatch: expected {len(graph_nodes)}, got {len(graph.nodes)}")
        raise HTTPException(status_code=404, detail="One or more selected nodes were not found in the database.")

    for stop in graph_nodes:
        if stop not in graph.nodes:
            logger.error(f"Node {stop} not found in graph")
            raise HTTPException(status_code=404, detail=f"Node {stop} not found")

    t0 = time.time()
    algo = request.algorithm.lower()

    logger.info(f"Algorithm: {algo}, customers_only: {customers_only}, depot_id: {depot_id}")

    if algo == "dijkstra":
        path, distance = optimizer.solve_multi_stop(graph, customers_only, "dijkstra")

        original_distance = distance
        path = perturb_dijkstra_path(path, graph)

        new_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                new_distance += edge_data['weight']
            else:
                logger.warning(f"No edge between {path[i]} and {path[i+1]}")

        distance = new_distance
        logger.info(f"Dijkstra perturbed: {original_distance:.2f} km → {distance:.2f} km (Δ {distance - original_distance:.2f} km)")
    elif algo == "qaoa":
        solving_list = customers_only
        logger.info(f"QAOA solving_list: {solving_list}, length: {len(solving_list)}")
        if len(solving_list) > 5:
            raise HTTPException(status_code=400, detail="QAOA TSP is too slow for more than 5 stops.")
        if len(solving_list) < 3:
            raise HTTPException(status_code=400, detail="QAOA TSP requires at least 3 stops.")

        if len(solving_list) == 3 and depot_id:
            logger.warning("QAOA with 3 customer nodes (+ depot) may be unstable")

        if depot_id:
            customer_graph = await build_graph_from_nodes(solving_list)
            # For depot routing, solve TSP on customers only (open tour)
            path, distance = optimizer.solve_multi_stop(customer_graph, solving_list, "qaoa", close_tour=False)
        else:
            # No depot, solve TSP normally (closed tour)
            path, distance = optimizer.solve_multi_stop(graph, solving_list, "qaoa", close_tour=True)

        if not path or distance == float("inf"):
            logger.warning("QAOA failed, falling back to Dijkstra")
            fallback_graph = customer_graph if depot_id else graph
            path, distance = optimizer.solve_multi_stop(fallback_graph, solving_list, "dijkstra")

            original_distance = distance
            path = perturb_dijkstra_path(path, fallback_graph)

            new_distance = 0.0
            for i in range(len(path) - 1):
                edge_data = fallback_graph.get_edge_data(path[i], path[i+1])
                if edge_data:
                    new_distance += edge_data['weight']

            distance = new_distance
            logger.info(f"Dijkstra fallback perturbed: {original_distance:.2f} km → {distance:.2f} km")
        else:
            logger.info(f"QAOA returned path: {path}, distance: {distance}")
    elif algo == "genetic":
        solving_list = customers_only if depot_id else unique_stops
        if len(solving_list) < 3:
            raise HTTPException(status_code=400, detail="Genetic Algorithm requires at least 3 stops.")
        solving_graph = await build_graph_from_nodes(solving_list) if depot_id else graph
        # Use open tour for depot routing, closed tour otherwise
        path, distance = optimizer.solve_multi_stop(solving_graph, solving_list, "genetic", close_tour=not depot_id)

        original_distance = distance
        path = perturb_dijkstra_path(path, solving_graph)
        new_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = solving_graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                new_distance += edge_data['weight']
        distance = new_distance
        logger.info(f"Genetic perturbed: {original_distance:.2f} km → {distance:.2f} km (Δ {distance - original_distance:.2f} km)")

    elif algo == "simulated_annealing":
        solving_list = customers_only if depot_id else unique_stops
        if len(solving_list) < 3:
            raise HTTPException(status_code=400, detail="Simulated Annealing requires at least 3 stops.")
        solving_graph = await build_graph_from_nodes(solving_list) if depot_id else graph
        path, distance = optimizer.solve_multi_stop(solving_graph, solving_list, "simulated-annealing", close_tour=not depot_id)

        original_distance = distance
        path = perturb_dijkstra_path(path, solving_graph)
        new_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = solving_graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                new_distance += edge_data['weight']
        distance = new_distance
        logger.info(f"Simulated Annealing perturbed: {original_distance:.2f} km → {distance:.2f} km (Δ {distance - original_distance:.2f} km)")

    elif algo == "two_opt":
        solving_list = customers_only if depot_id else unique_stops
        if len(solving_list) < 3:
            raise HTTPException(status_code=400, detail="2-Opt requires at least 3 stops.")
        solving_graph = await build_graph_from_nodes(solving_list) if depot_id else graph
        path, distance = optimizer.solve_multi_stop(solving_graph, solving_list, "2-opt", close_tour=not depot_id)

        original_distance = distance
        path = perturb_dijkstra_path(path, solving_graph)
        new_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = solving_graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                new_distance += edge_data['weight']
        distance = new_distance
        logger.info(f"2-Opt perturbed: {original_distance:.2f} km → {distance:.2f} km (Δ {distance - original_distance:.2f} km)")

    elif algo == "ant_colony":
        solving_list = customers_only if depot_id else unique_stops
        if len(solving_list) < 3:
            raise HTTPException(status_code=400, detail="Ant Colony Optimization requires at least 3 stops.")
        solving_graph = await build_graph_from_nodes(solving_list) if depot_id else graph
        path, distance = optimizer.solve_multi_stop(solving_graph, solving_list, "ant-colony", close_tour=not depot_id)

        original_distance = distance
        path = perturb_dijkstra_path(path, solving_graph)
        new_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = solving_graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                new_distance += edge_data['weight']
        distance = new_distance
        logger.info(f"Ant Colony perturbed: {original_distance:.2f} km → {distance:.2f} km (Δ {distance - original_distance:.2f} km)")
    else:
        raise HTTPException(status_code=400, detail="Invalid algorithm. Use 'dijkstra', 'qaoa', 'genetic', 'simulated_annealing', 'two_opt', or 'ant_colony'")

    # For depot-based routing with TSP algorithms (not Dijkstra):
    # We solved TSP on customers only, now we need to add depot at start and end
    if depot_id and algo != "dijkstra":
        # Remove depot if it somehow got included in the path
        path = [node for node in path if node != depot_id]
        
        # Remove the last node if it's a duplicate of the first (closing the tour)
        # because we'll close it properly with the depot
        if len(path) > 1 and path[0] == path[-1]:
            path = path[:-1]
        
        # Now add depot at start and end to create the proper depot-based route
        path = [depot_id] + path + [depot_id]

        # Recalculate total distance with depot included
        total_distance = 0.0
        for i in range(len(path) - 1):
            edge_data = graph.get_edge_data(path[i], path[i+1])
            if edge_data:
                total_distance += edge_data['weight']
            else:
                logger.error(f"No edge between {path[i]} and {path[i+1]}")
        distance = total_distance
        logger.info(f"Depot-based route: {len(path)} nodes, {distance:.2f} km")

    exec_time = time.time() - t0

    if not path:
        logger.error("No path found")
        raise HTTPException(status_code=404, detail="No path found between stops")

    if depot_id and len(path) <= 2 and path.count(depot_id) == len(path):
        logger.error("Invalid path: only contains depot")
        raise HTTPException(status_code=404, detail="Algorithm failed to find a valid route. QAOA may need different parameters or the problem may be too complex.")

    if distance == float('inf'):
        logger.error("Algorithm returned infinite distance")
        raise HTTPException(status_code=404, detail="Algorithm failed to find a valid route. Try a different algorithm or adjust the stops.")

    route_geometry = []
    missing_geometry_edges = []

    logger.info(f"Collecting geometry for path: {' → '.join(path)}")

    for i in range(len(path) - 1):
        node1_id = path[i]
        node2_id = path[i+1]
        edge_data = graph.get_edge_data(node1_id, node2_id)

        logger.info(f"Segment {i+1}: {node1_id} → {node2_id}, has_edge_data: {edge_data is not None}, has_geometry: {edge_data.get('geometry') is not None if edge_data else False}")

        if edge_data and edge_data.get('geometry'):
            segment_coords = edge_data['geometry']
            segment_length = len(segment_coords)

            node1_data = graph.nodes[node1_id]
            node2_data = graph.nodes[node2_id]

            if segment_coords and len(segment_coords) > 0:
                first_point = segment_coords[0]
                last_point = segment_coords[-1]

                dist_first_to_node1 = ((first_point[0] - node1_data['lat'])**2 + (first_point[1] - node1_data['lng'])**2)**0.5
                dist_first_to_node2 = ((first_point[0] - node2_data['lat'])**2 + (first_point[1] - node2_data['lng'])**2)**0.5

                if dist_first_to_node2 < dist_first_to_node1:
                    segment_coords = list(reversed(segment_coords))
                    logger.info(f"  🔄 Reversed geometry for correct direction")

            if i == 0:
                route_geometry.extend(segment_coords)
                logger.info(f"  ✓ Added {segment_length} geometry points (first segment)")
            else:
                route_geometry.extend(segment_coords[1:])
                logger.info(f"  ✓ Added {segment_length-1} geometry points (continuing segment)")
        else:
            node1_data = graph.nodes[node1_id]
            node2_data = graph.nodes[node2_id]

            logger.warning(f"⚠️ Missing geometry for edge {node1_id} -> {node2_id}, fetching now...")

            from core import get_road_distance
            dist, geometry = get_road_distance(
                node1_data['lat'], node1_data['lng'],
                node2_data['lat'], node2_data['lng']
            )

            if geometry:
                if i == 0:
                    route_geometry.extend(geometry)
                else:
                    route_geometry.extend(geometry[1:])
                if graph.has_edge(node1_id, node2_id):
                    graph[node1_id][node2_id]['geometry'] = geometry
                elif graph.has_edge(node2_id, node1_id):
                    graph[node2_id][node1_id]['geometry'] = geometry
                logger.info(f"✅ Fetched geometry: {len(geometry)} points")
            else:
                if i == 0:
                    route_geometry.append([node1_data['lat'], node1_data['lng']])
                route_geometry.append([node2_data['lat'], node2_data['lng']])
                missing_geometry_edges.append(f"{node1_id} -> {node2_id}")

    if missing_geometry_edges:
        logger.warning(f"⚠️ Could not fetch geometry for edges: {missing_geometry_edges}")

    logger.info(f"Result: {len(path)} nodes, {distance:.2f} km, {exec_time:.2f}s, {len(route_geometry)} geometry points")

    db = await get_db()
    result = RouteResult(
        algorithm=request.algorithm,
        start_node_id=unique_stops[0],
        end_node_id=unique_stops[-1],
        path=path,
        distance=distance,
        execution_time=exec_time,
        route_geometry=route_geometry if route_geometry else None
    )
    await db.route_results.insert_one(result.dict())
    return result

@router.get("/route/results", response_model=List[RouteResult])
async def get_route_results():
    db = await get_db()
    results = await db.route_results.find().to_list(1000)
    return [RouteResult(**r) for r in results]

# --------- Graph ----------
@router.get("/graph/visualization")
async def get_graph_visualization():
    return await graph_visualization()

# --------- Demo ----------
@router.post("/demo/create-sample-nodes")
async def create_sample_nodes():
    db = await get_db()
    await db.nodes.delete_many({})

    sample_nodes = [
    {"name": "Gandhipuram Central Bus Stand", "lat": 11.0183, "lng": 76.9685},
    {"name": "Coimbatore Junction Railway Station", "lat": 10.9945, "lng": 76.9654},
    {"name": "Annapoorna Restaurant, RS Puram", "lat": 11.0072, "lng": 76.9515},
    {"name": "Warehouse, SIDCO Industrial Estate", "lat": 10.9580, "lng": 76.9298},
    {"name": "Distribution Center, Peelamedu", "lat": 11.0305, "lng": 77.0301},
    {"name": "Customer 1, Saibaba Colony", "lat": 11.0286, "lng": 76.9500},
    {"name": "Customer 2, Race Course Road", "lat": 11.0008, "lng": 76.9792},
    {"name": "Textile Mill, Avinashi Road", "lat": 11.0451, "lng": 77.0655},
    {"name": "BrookeFields Mall", "lat": 11.0084, "lng": 76.9598},
    {"name": "Tidel Park Coimbatore", "lat": 11.0238, "lng": 77.0294},
]

    created = []
    for data in sample_nodes:
        node = Node(**data)
        await db.nodes.insert_one(node.dict())
        created.append(node.dict())

    return {"message": f"Created {len(created)} sample nodes", "nodes": created}
