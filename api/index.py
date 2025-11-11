from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from typing import Tuple, Dict, Any, List
import json
import heapq

app = Flask(__name__)
CORS(app)

# Configuration
MAP_SIZE = 50
WALL = 1
FLOOR = 0

# Angle constants
EAST = 0
NORTH = 90
WEST = 180
SOUTH = 270

DIRECTIONS = {EAST: "East", NORTH: "North", WEST: "West", SOUTH: "South"}

# Initialize default map
def get_default_map():
    true_map = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
    true_map[0, :] = WALL
    true_map[-1, :] = WALL
    true_map[:, 0] = WALL
    true_map[:, -1] = WALL
    true_map[10, 5:25] = WALL
    true_map[20, 10:35] = WALL
    true_map[30, 15:40] = WALL
    true_map[5:20, 15] = WALL
    true_map[15:35, 30] = WALL
    true_map[25, 20:30] = WALL
    true_map[25:35, 20] = WALL
    true_map[25:35, 30] = WALL
    true_map[12:15, 40] = WALL
    true_map[35, 10:13] = WALL
    return true_map

# Helper functions
def is_valid_position(x: int, y: int, true_map) -> bool:
    if x < 0 or x >= MAP_SIZE or y < 0 or y >= MAP_SIZE:
        return False
    return true_map[y, x] == FLOOR

def get_sensor_readings(x, y, angle, true_map):
    directions = [
        (0, -1),   # N
        (1, -1),   # NE
        (1, 0),    # E
        (1, 1),    # SE
        (0, 1),    # S
        (-1, 1),   # SW
        (-1, 0),   # W
        (-1, -1)   # NW
    ]
    
    sensors = {}
    dir_names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    
    for i, (dx, dy) in enumerate(directions):
        distance = 0
        cx, cy = x, y
        
        while distance < MAP_SIZE:
            cx += dx
            cy += dy
            distance += 1
            
            if cx < 0 or cx >= MAP_SIZE or cy < 0 or cy >= MAP_SIZE:
                break
            if true_map[cy, cx] == WALL:
                break
        
        sensors[dir_names[i]] = distance
    
    return sensors

def update_discovered_map(x, y, sensors, discovered_map, true_map):
    discovered_map[y, x] = 1
    
    directions = {
        "N": (0, -1), "NE": (1, -1), "E": (1, 0), "SE": (1, 1),
        "S": (0, 1), "SW": (-1, 1), "W": (-1, 0), "NW": (-1, -1)
    }
    
    for dir_name, (dx, dy) in directions.items():
        distance = sensors.get(dir_name, 0)
        cx, cy = x, y
        
        for step in range(1, distance):
            cx += dx
            cy += dy
            if 0 <= cx < MAP_SIZE and 0 <= cy < MAP_SIZE:
                if discovered_map[cy, cx] == 0:
                    discovered_map[cy, cx] = 1
        
        obstacle_x = x + dx * distance
        obstacle_y = y + dy * distance
        if 0 <= obstacle_x < MAP_SIZE and 0 <= obstacle_y < MAP_SIZE:
            if true_map[obstacle_y, obstacle_x] == WALL:
                discovered_map[obstacle_y, obstacle_x] = 2
    
    return discovered_map

# A* Pathfinding
class AStarNode:
    def __init__(self, position: Tuple[int, int], g: float, h: float, parent=None):
        self.position = position
        self.g = g
        self.h = h
        self.f = g + h
        self.parent = parent
    
    def __lt__(self, other):
        return self.f < other.f

def heuristic(pos1: Tuple[int, int], pos2: Tuple[int, int]) -> float:
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])

def get_neighbors(pos: Tuple[int, int], map_data) -> List[Tuple[int, int]]:
    x, y = pos
    neighbors = []
    for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < MAP_SIZE and 0 <= ny < MAP_SIZE:
            if map_data[ny, nx] != WALL and map_data[ny, nx] != 2:
                neighbors.append((nx, ny))
    return neighbors

def a_star_search(start: Tuple[int, int], goal: Tuple[int, int], map_data):
    if map_data[goal[1], goal[0]] == WALL or map_data[goal[1], goal[0]] == 2:
        return []
    
    open_set = []
    start_node = AStarNode(start, 0, heuristic(start, goal))
    heapq.heappush(open_set, start_node)
    
    closed_set = set()
    g_scores = {start: 0}
    
    while open_set:
        current = heapq.heappop(open_set)
        
        if current.position == goal:
            path = []
            while current:
                path.append(current.position)
                current = current.parent
            return path[::-1]
        
        if current.position in closed_set:
            continue
        closed_set.add(current.position)
        
        for neighbor in get_neighbors(current.position, map_data):
            if neighbor in closed_set:
                continue
            
            tentative_g = current.g + 1
            
            if neighbor not in g_scores or tentative_g < g_scores[neighbor]:
                g_scores[neighbor] = tentative_g
                h = heuristic(neighbor, goal)
                neighbor_node = AStarNode(neighbor, tentative_g, h, current)
                heapq.heappush(open_set, neighbor_node)
    
    return []

# Main handler for Vercel
@app.route('/api/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def api_handler(path):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    # Get state from request or use defaults
    data = request.json if request.method == 'POST' else {}
    
    robot_x = data.get('robot_x', 1)
    robot_y = data.get('robot_y', 1)
    robot_angle = data.get('robot_angle', EAST)
    
    true_map = np.array(data.get('true_map', get_default_map().tolist()))
    discovered_map = np.array(data.get('discovered_map', np.zeros((MAP_SIZE, MAP_SIZE), dtype=int).tolist()))
    
    # Mark starting position
    if discovered_map[robot_y, robot_x] == 0:
        discovered_map[robot_y, robot_x] = 1
    
    # Handle different endpoints
    if path == 'get_state':
        sensors = get_sensor_readings(robot_x, robot_y, robot_angle, true_map)
        discovered_map = update_discovered_map(robot_x, robot_y, sensors, discovered_map, true_map)
        
        return jsonify({
            "success": True,
            "data": {
                "robot": {
                    "x": robot_x,
                    "y": robot_y,
                    "angle": robot_angle
                },
                "true_map": true_map.tolist(),
                "discovered_map": discovered_map.tolist(),
                "map_info": {
                    "width": MAP_SIZE,
                    "height": MAP_SIZE,
                    "floor_cells": int(np.sum(true_map == FLOOR)),
                    "wall_cells": int(np.sum(true_map == WALL))
                }
            }
        })
    
    elif path == 'sensors':
        sensors = get_sensor_readings(robot_x, robot_y, robot_angle, true_map)
        discovered_map = update_discovered_map(robot_x, robot_y, sensors, discovered_map, true_map)
        
        return jsonify({
            "success": True,
            "data": {
                "sensors": sensors,
                "robot": {
                    "x": robot_x,
                    "y": robot_y,
                    "angle": robot_angle,
                    "odometry": {
                        "move_count": data.get('move_count', 0),
                        "rotation_count": data.get('rotation_count', 0),
                        "distance_traveled": data.get('distance_traveled', 0.0),
                        "path_length": len(data.get('path_history', [(robot_x, robot_y)]))
                    },
                    "path_planning": {
                        "goal": data.get('goal'),
                        "planned_path": data.get('planned_path', []),
                        "has_path": len(data.get('planned_path', [])) > 0
                    }
                },
                "discovered_map": discovered_map.tolist()
            }
        })
    
    elif path == 'health':
        return jsonify({"status": "healthy", "service": "SLAM Simulation Backend"}), 200
    
    else:
        return jsonify({"success": False, "error": "Endpoint not implemented yet"}), 501

# Vercel handler
def handler(request):
    with app.request_context(request.environ):
        return app.full_dispatch_request()
