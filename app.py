from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import numpy as np
from typing import Tuple, Dict, Any
import os
import json

# Configuration
MAP_SIZE = 50  # Expanded from 15 to 50 for larger environment
WALL = 1
FLOOR = 0
DEFAULT_PORT = int(os.environ.get('PORT', 5000))

# Angle constants (in degrees)
EAST = 0
NORTH = 90
WEST = 180
SOUTH = 270

app = Flask(__name__)
CORS(app)

# Define the true map: 50x50 grid (1 = wall, 0 = floor)
TRUE_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
# Set outer borders as walls
TRUE_MAP[0, :] = WALL
TRUE_MAP[-1, :] = WALL
TRUE_MAP[:, 0] = WALL
TRUE_MAP[:, -1] = WALL

# Add some internal walls for a more complex environment
# Horizontal wall segments
TRUE_MAP[10, 5:25] = WALL
TRUE_MAP[20, 10:35] = WALL
TRUE_MAP[30, 15:40] = WALL
# Vertical wall segments
TRUE_MAP[5:20, 15] = WALL
TRUE_MAP[15:35, 30] = WALL
# Room structures
TRUE_MAP[25, 20:30] = WALL
TRUE_MAP[25:35, 20] = WALL
TRUE_MAP[25:35, 30] = WALL
# Small obstacles
TRUE_MAP[12:15, 40] = WALL
TRUE_MAP[35, 10:13] = WALL

# Discovered map: 50x50 grid (0 = unknown, 1 = floor/free, 2 = wall/obstacle)
# Robot starts knowing nothing about the environment
DISCOVERED_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)


# A* Path Planning Implementation
import heapq

class AStarNode:
    """Node for A* pathfinding algorithm."""
    def __init__(self, position: Tuple[int, int], g: float, h: float, parent=None):
        self.position = position
        self.g = g  # Cost from start to current node
        self.h = h  # Heuristic cost from current to goal
        self.f = g + h  # Total cost
        self.parent = parent
    
    def __lt__(self, other):
        return self.f < other.f


def heuristic(pos1: Tuple[int, int], pos2: Tuple[int, int]) -> float:
    """Calculate Manhattan distance heuristic."""
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])


def get_neighbors(pos: Tuple[int, int], use_discovered: bool = False) -> list:
    """Get valid neighboring positions (4-directional movement)."""
    x, y = pos
    neighbors = []
    
    # 4-directional movement (up, down, left, right)
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = x + dx, y + dy
        
        # Check bounds
        if 0 <= nx < MAP_SIZE and 0 <= ny < MAP_SIZE:
            if use_discovered:
                # Use discovered map (0=unknown treated as obstacle, 1=free, 2=obstacle)
                if DISCOVERED_MAP[ny, nx] == 1:
                    neighbors.append((nx, ny))
            else:
                # Use true map
                if TRUE_MAP[ny, nx] == FLOOR:
                    neighbors.append((nx, ny))
    
    return neighbors


def a_star_search(start: Tuple[int, int], goal: Tuple[int, int], use_discovered: bool = False) -> list:
    """
    A* pathfinding algorithm.
    
    Args:
        start: Starting position (x, y)
        goal: Goal position (x, y)
        use_discovered: If True, use discovered map; otherwise use true map
    
    Returns:
        List of positions forming the path from start to goal, or empty list if no path
    """
    # Check if start and goal are valid
    if use_discovered:
        if DISCOVERED_MAP[start[1], start[0]] != 1 or DISCOVERED_MAP[goal[1], goal[0]] != 1:
            return []
    else:
        if not is_valid_position(start[0], start[1]) or not is_valid_position(goal[0], goal[1]):
            return []
    
    # Initialize open and closed sets
    open_set = []
    closed_set = set()
    
    # Create start node
    start_node = AStarNode(start, 0, heuristic(start, goal))
    heapq.heappush(open_set, start_node)
    
    # Track best g-score for each position
    g_scores = {start: 0}
    
    while open_set:
        # Get node with lowest f-score
        current = heapq.heappop(open_set)
        
        # Check if we reached the goal
        if current.position == goal:
            # Reconstruct path
            path = []
            node = current
            while node:
                path.append(node.position)
                node = node.parent
            return path[::-1]  # Reverse to get path from start to goal
        
        # Mark as visited
        closed_set.add(current.position)
        
        # Check neighbors
        for neighbor_pos in get_neighbors(current.position, use_discovered):
            if neighbor_pos in closed_set:
                continue
            
            # Calculate tentative g-score
            tentative_g = current.g + 1  # Cost of 1 for each step
            
            # Check if this path is better
            if neighbor_pos not in g_scores or tentative_g < g_scores[neighbor_pos]:
                g_scores[neighbor_pos] = tentative_g
                h = heuristic(neighbor_pos, goal)
                neighbor_node = AStarNode(neighbor_pos, tentative_g, h, current)
                heapq.heappush(open_set, neighbor_node)
    
    # No path found
    return []


class Robot:
    """Represents a robot in the SLAM simulation with position and orientation."""
    
    def __init__(self, x: int = 1, y: int = 1, angle: int = EAST):
        """
        Initialize robot at starting position.
        
        Args:
            x: Starting grid X coordinate (default: 1)
            y: Starting grid Y coordinate (default: 1)
            angle: Starting angle in degrees (default: 0/EAST)
        """
        self.initial_x = x
        self.initial_y = y
        self.initial_angle = angle
        self.x = x
        self.y = y
        self.angle = angle
        
        # Odometry tracking
        self.path_history = [(x, y)]  # List of (x, y) positions
        self.move_count = 0  # Total successful moves
        self.rotation_count = 0  # Total rotations
        self.distance_traveled = 0.0  # Total distance in grid units
        
        # Path planning
        self.goal = None  # Goal position (x, y)
        self.planned_path = []  # Planned path from A*
        self.current_path_index = 0  # Current position in planned path
        
        # Mark starting position as discovered
        DISCOVERED_MAP[y, x] = 1  # Mark as free space
    
    def reset(self) -> None:
        """Reset robot to initial position and angle."""
        self.x = self.initial_x
        self.y = self.initial_y
        self.angle = self.initial_angle
        
        # Reset odometry
        self.path_history = [(self.x, self.y)]
        self.move_count = 0
        self.rotation_count = 0
        self.distance_traveled = 0.0
        
        # Reset path planning
        self.goal = None
        self.planned_path = []
        self.current_path_index = 0
    
    def rotate_left(self) -> None:
        """Rotate robot 90 degrees counter-clockwise."""
        self.angle = (self.angle + 90) % 360
        self.rotation_count += 1
    
    def rotate_right(self) -> None:
        """Rotate robot 90 degrees clockwise."""
        self.angle = (self.angle - 90) % 360
        self.rotation_count += 1
    
    def get_next_position(self) -> Tuple[int, int]:
        """
        Calculate the next position based on current angle without moving.
        
        Returns:
            Tuple of (next_x, next_y)
        """
        next_x, next_y = self.x, self.y
        
        if self.angle == EAST:
            next_x += 1
        elif self.angle == WEST:
            next_x -= 1
        elif self.angle == NORTH:
            next_y -= 1
        elif self.angle == SOUTH:
            next_y += 1
        
        return next_x, next_y
    
    def move_forward(self) -> bool:
        """
        Move robot forward one step in current direction.
        
        Returns:
            True if move successful, False if blocked by wall
        """
        next_x, next_y = self.get_next_position()
        
        # Check if move is valid
        if is_valid_position(next_x, next_y):
            # Calculate distance (Euclidean distance for accuracy)
            distance = ((next_x - self.x) ** 2 + (next_y - self.y) ** 2) ** 0.5
            
            self.x = next_x
            self.y = next_y
            
            # Update odometry
            self.path_history.append((self.x, self.y))
            self.move_count += 1
            self.distance_traveled += distance
            
            return True
        return False
    
    def move_backward(self) -> bool:
        """
        Move robot backward one step (opposite of current direction).
        
        Returns:
            True if move successful, False if blocked by wall
        """
        # Calculate backward position (opposite direction)
        next_x, next_y = self.x, self.y
        
        if self.angle == EAST:
            next_x -= 1  # Move West
        elif self.angle == WEST:
            next_x += 1  # Move East
        elif self.angle == NORTH:
            next_y += 1  # Move South
        elif self.angle == SOUTH:
            next_y -= 1  # Move North
        
        # Check if move is valid
        if is_valid_position(next_x, next_y):
            # Calculate distance
            distance = ((next_x - self.x) ** 2 + (next_y - self.y) ** 2) ** 0.5
            
            self.x = next_x
            self.y = next_y
            
            # Update odometry
            self.path_history.append((self.x, self.y))
            self.move_count += 1
            self.distance_traveled += distance
            
            return True
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert robot state to dictionary."""
        return {
            "x": self.x,
            "y": self.y,
            "angle": self.angle,
            "odometry": {
                "move_count": self.move_count,
                "rotation_count": self.rotation_count,
                "distance_traveled": round(self.distance_traveled, 2),
                "path_length": len(self.path_history)
            },
            "path_planning": {
                "goal": {"x": self.goal[0], "y": self.goal[1]} if self.goal else None,
                "planned_path": self.planned_path,
                "has_path": len(self.planned_path) > 0
            }
        }
    
    def set_goal(self, goal_x: int, goal_y: int, use_discovered: bool = True) -> bool:
        """
        Set a goal position and compute path using A*.
        
        Args:
            goal_x: Goal X coordinate
            goal_y: Goal Y coordinate
            use_discovered: If True, plan using discovered map; else use true map
        
        Returns:
            True if path found, False otherwise
        """
        self.goal = (goal_x, goal_y)
        
        # Compute path using A*
        self.planned_path = a_star_search((self.x, self.y), self.goal, use_discovered)
        self.current_path_index = 0
        
        return len(self.planned_path) > 0
    
    def clear_goal(self) -> None:
        """Clear the current goal and planned path."""
        self.goal = None
        self.planned_path = []
        self.current_path_index = 0
    
    def get_next_move_in_path(self) -> str:
        """
        Get the next movement command to follow the planned path.
        
        Returns:
            Movement command string or empty string if no path
        """
        if not self.planned_path or self.current_path_index >= len(self.planned_path):
            return ""
        
        # Get next position in path
        next_pos = self.planned_path[self.current_path_index]
        target_x, target_y = next_pos
        
        # Calculate required direction
        dx = target_x - self.x
        dy = target_y - self.y
        
        # Determine target angle
        target_angle = None
        if dx > 0:
            target_angle = EAST
        elif dx < 0:
            target_angle = WEST
        elif dy < 0:
            target_angle = NORTH
        elif dy > 0:
            target_angle = SOUTH
        
        if target_angle is None:
            # Already at target, move to next waypoint
            self.current_path_index += 1
            return self.get_next_move_in_path()
        
        # Check if we need to rotate
        if self.angle != target_angle:
            # Calculate shortest rotation
            angle_diff = (target_angle - self.angle) % 360
            if angle_diff == 90 or angle_diff == 270:
                return 'rotate_left' if angle_diff == 90 else 'rotate_right'
            elif angle_diff == 180:
                return 'rotate_left'  # Arbitrary choice for 180
        
        # We're facing the right direction, move forward
        self.current_path_index += 1
        return 'move_forward'
    
    def get_sensor_readings(self) -> Dict[str, int]:
        """
        Get distance sensor readings in 8 directions using ray-casting.
        
        Returns:
            Dictionary with distance readings for each sensor:
            - front, back, left, right (cardinal directions relative to robot)
            - front_left, front_right, back_left, back_right (diagonals)
        """
        sensors = {}
        
        # Define 8 directions relative to robot's current angle
        # Angles are in degrees: 0=East, 90=North, 180=West, 270=South
        directions = {
            'front': self.angle,
            'right': (self.angle - 90) % 360,
            'back': (self.angle + 180) % 360,
            'left': (self.angle + 90) % 360,
            'front_right': (self.angle - 45) % 360,
            'front_left': (self.angle + 45) % 360,
            'back_right': (self.angle - 135) % 360,
            'back_left': (self.angle + 135) % 360
        }
        
        # Cast ray in each direction
        for sensor_name, angle in directions.items():
            distance = self._cast_ray(angle)
            sensors[sensor_name] = distance
        
        return sensors
    
    def update_discovered_map(self) -> None:
        """
        Update the discovered map based on current sensor readings.
        Uses ray-casting to mark cells as free (1) or obstacle (2).
        """
        global DISCOVERED_MAP
        
        # Mark robot's current position as free
        DISCOVERED_MAP[self.y, self.x] = 1
        
        # Get sensor readings
        sensors = self.get_sensor_readings()
        
        # Define 8 directions with angles
        directions = {
            'front': self.angle,
            'right': (self.angle - 90) % 360,
            'back': (self.angle + 180) % 360,
            'left': (self.angle + 90) % 360,
            'front_right': (self.angle - 45) % 360,
            'front_left': (self.angle + 45) % 360,
            'back_right': (self.angle - 135) % 360,
            'back_left': (self.angle + 135) % 360
        }
        
        # Update discovered map for each sensor direction
        for sensor_name, angle in directions.items():
            distance = sensors[sensor_name]
            
            # Get direction deltas
            if angle == 0:  # East
                dx, dy = 1, 0
            elif angle == 45:  # Northeast
                dx, dy = 1, -1
            elif angle == 90:  # North
                dx, dy = 0, -1
            elif angle == 135:  # Northwest
                dx, dy = -1, -1
            elif angle == 180:  # West
                dx, dy = -1, 0
            elif angle == 225:  # Southwest
                dx, dy = -1, 1
            elif angle == 270:  # South
                dx, dy = 0, 1
            elif angle == 315:  # Southeast
                dx, dy = 1, 1
            else:
                continue
            
            # Mark all cells along the ray as free (1)
            current_x, current_y = self.x, self.y
            for step in range(1, distance + 1):
                current_x += dx
                current_y += dy
                
                # Check bounds
                if 0 <= current_x < MAP_SIZE and 0 <= current_y < MAP_SIZE:
                    # Mark as free if not already marked as obstacle
                    if DISCOVERED_MAP[current_y, current_x] != 2:
                        DISCOVERED_MAP[current_y, current_x] = 1
            
            # Mark the cell at the end of the ray as obstacle (2)
            # This is where the sensor detected a wall
            final_x = self.x + dx * (distance + 1)
            final_y = self.y + dy * (distance + 1)
            if 0 <= final_x < MAP_SIZE and 0 <= final_y < MAP_SIZE:
                DISCOVERED_MAP[final_y, final_x] = 2
    
    def _cast_ray(self, angle: int) -> int:
        """
        Cast a ray from robot position in given angle until hitting a wall.
        
        Args:
            angle: Direction in degrees (0=East, 90=North, 180=West, 270=South)
        
        Returns:
            Distance to nearest wall (number of free cells)
        """
        # Direction vectors for each angle
        dx, dy = 0, 0
        
        if angle == 0:  # East
            dx, dy = 1, 0
        elif angle == 45:  # Northeast
            dx, dy = 1, -1
        elif angle == 90:  # North
            dx, dy = 0, -1
        elif angle == 135:  # Northwest
            dx, dy = -1, -1
        elif angle == 180:  # West
            dx, dy = -1, 0
        elif angle == 225:  # Southwest
            dx, dy = -1, 1
        elif angle == 270:  # South
            dx, dy = 0, 1
        elif angle == 315:  # Southeast
            dx, dy = 1, 1
        
        # Cast ray until hitting wall or boundary
        distance = 0
        current_x, current_y = self.x, self.y
        
        while True:
            current_x += dx
            current_y += dy
            
            # Check if hit boundary or wall
            if not is_valid_position(current_x, current_y):
                break
            
            distance += 1
            
            # Safety limit to prevent infinite loops
            if distance > MAP_SIZE * 2:
                break
        
        return distance


# Single robot instance for the simulation
robot = Robot()


# Helper functions
def is_valid_position(x: int, y: int) -> bool:
    """
    Check if a position is valid (within bounds and not a wall).
    
    Args:
        x: X coordinate
        y: Y coordinate
    
    Returns:
        True if position is valid, False otherwise
    """
    if x < 0 or x >= MAP_SIZE or y < 0 or y >= MAP_SIZE:
        return False
    return TRUE_MAP[y, x] == FLOOR


def get_map_info() -> Dict[str, Any]:
    """Get information about the map."""
    return {
        "width": MAP_SIZE,
        "height": MAP_SIZE,
        "total_cells": MAP_SIZE * MAP_SIZE,
        "wall_cells": int(np.sum(TRUE_MAP)),
        "floor_cells": int(MAP_SIZE * MAP_SIZE - np.sum(TRUE_MAP))
    }


def get_game_state() -> Dict[str, Any]:
    """Collect the current simulation state and return as a dict."""
    map_as_list = TRUE_MAP.tolist()
    discovered_as_list = DISCOVERED_MAP.tolist()
    state = {
        "robot": robot.to_dict(),
        "true_map": map_as_list,
        "discovered_map": discovered_as_list,
        "map_info": get_map_info()
    }
    return state


# API Endpoints
@app.route('/api/get_state', methods=['GET'])
def send_state():
    """API endpoint to return current map and robot position."""
    try:
        state = get_game_state()
        return jsonify({"success": True, "data": state}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """API endpoint to get current sensor readings."""
    try:
        # Update discovered map based on current sensor readings
        robot.update_discovered_map()
        
        sensors = robot.get_sensor_readings()
        return jsonify({
            "success": True,
            "data": {
                "sensors": sensors,
                "robot": robot.to_dict()
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/discovered_map', methods=['GET'])
def get_discovered_map():
    """API endpoint to get the discovered map."""
    try:
        discovered_as_list = DISCOVERED_MAP.tolist()
        return jsonify({
            "success": True,
            "data": {
                "discovered_map": discovered_as_list,
                "robot": robot.to_dict()
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/odometry', methods=['GET'])
def get_odometry():
    """API endpoint to get odometry data and path history."""
    try:
        return jsonify({
            "success": True,
            "data": {
                "path_history": robot.path_history,
                "move_count": robot.move_count,
                "rotation_count": robot.rotation_count,
                "distance_traveled": round(robot.distance_traveled, 2),
                "robot": robot.to_dict()
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/set_goal', methods=['POST'])
def set_goal():
    """API endpoint to set a goal and compute path."""
    try:
        data = request.json
        goal_x = data.get('x')
        goal_y = data.get('y')
        use_discovered = data.get('use_discovered', True)
        
        if goal_x is None or goal_y is None:
            return jsonify({"success": False, "error": "Missing x or y coordinate"}), 400
        
        # Set goal and compute path
        success = robot.set_goal(goal_x, goal_y, use_discovered)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Path computed successfully",
                "data": {
                    "goal": {"x": robot.goal[0], "y": robot.goal[1]},
                    "planned_path": robot.planned_path,
                    "path_length": len(robot.planned_path),
                    "robot": robot.to_dict()
                }
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "No path found to goal",
                "data": {
                    "goal": {"x": robot.goal[0], "y": robot.goal[1]} if robot.goal else None,
                    "robot": robot.to_dict()
                }
            }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/clear_goal', methods=['POST'])
def clear_goal():
    """API endpoint to clear the current goal."""
    try:
        robot.clear_goal()
        return jsonify({
            "success": True,
            "message": "Goal cleared",
            "data": robot.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/next_move', methods=['GET'])
def get_next_move():
    """API endpoint to get next move in planned path."""
    try:
        next_move = robot.get_next_move_in_path()
        return jsonify({
            "success": True,
            "data": {
                "next_move": next_move,
                "has_more": next_move != "",
                "robot": robot.to_dict()
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/follow_path', methods=['POST'])
def follow_path():
    """API endpoint to execute one step of the planned path."""
    try:
        next_move = robot.get_next_move_in_path()
        
        if not next_move:
            return jsonify({
                "success": True,
                "message": "Path complete or no path",
                "data": get_game_state()
            }), 200
        
        # Execute the move
        moved = False
        if next_move == 'move_forward':
            moved = robot.move_forward()
        elif next_move == 'move_backward':
            moved = robot.move_backward()
        elif next_move == 'rotate_left':
            robot.rotate_left()
        elif next_move == 'rotate_right':
            robot.rotate_right()
        
        # Update discovered map after successful movement
        if moved:
            robot.update_discovered_map()
        
        return jsonify({
            "success": True,
            "message": f"Executed: {next_move}",
            "data": get_game_state()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/move', methods=['POST'])
def handle_move():
    """API endpoint to handle all movement commands."""
    try:
        data = request.json
        command = data.get('command')
        
        if command == 'move_forward':
            success = robot.move_forward()
            if success:
                robot.update_discovered_map()  # Update discovered map after movement
            if not success:
                # Return current state even on failure
                return jsonify(get_game_state()), 200
        elif command == 'move_backward':
            success = robot.move_backward()
            if success:
                robot.update_discovered_map()  # Update discovered map after movement
            if not success:
                # Return current state even on failure
                return jsonify(get_game_state()), 200
        elif command == 'rotate_left':
            robot.rotate_left()
        elif command == 'rotate_right':
            robot.rotate_right()
        else:
            return jsonify({"status": "error", "message": "Invalid command"}), 400
        
        # Return the new game state
        return jsonify(get_game_state()), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/move_forward', methods=['POST'])
def move_robot():
    """API endpoint to move robot forward (legacy)."""
    try:
        success = robot.move_forward()
        if success:
            return jsonify({
                "success": True,
                "message": "Robot moved forward",
                "data": robot.to_dict()
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "Cannot move - wall or boundary ahead",
                "data": robot.to_dict()
            }), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rotate_left', methods=['POST'])
def rotate_left_endpoint():
    """API endpoint to rotate robot left (counter-clockwise)."""
    try:
        robot.rotate_left()
        return jsonify({
            "success": True,
            "message": "Robot rotated left",
            "data": robot.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rotate_right', methods=['POST'])
def rotate_right_endpoint():
    """API endpoint to rotate robot right (clockwise)."""
    try:
        robot.rotate_right()
        return jsonify({
            "success": True,
            "message": "Robot rotated right",
            "data": robot.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/reset', methods=['POST'])
def reset_robot():
    """API endpoint to reset robot to initial position."""
    try:
        global DISCOVERED_MAP
        robot.reset()
        # Reset discovered map to all unknown
        DISCOVERED_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
        # Mark starting position as discovered
        DISCOVERED_MAP[robot.y, robot.x] = 1
        return jsonify({
            "success": True,
            "message": "Robot reset to initial position",
            "data": robot.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/map_info', methods=['GET'])
def map_info():
    """API endpoint to get map information."""
    try:
        info = get_map_info()
        return jsonify({"success": True, "data": info}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/toggle_cell', methods=['POST'])
def toggle_cell():
    """API endpoint to toggle a cell between wall and floor."""
    try:
        data = request.json
        x = data.get('x')
        y = data.get('y')
        
        if x is None or y is None:
            return jsonify({"success": False, "message": "Missing x or y coordinate"}), 400
        
        # Validate coordinates
        if x < 0 or x >= MAP_SIZE or y < 0 or y >= MAP_SIZE:
            return jsonify({"success": False, "message": "Coordinates out of bounds"}), 400
        
        # Don't allow toggling border walls
        if x == 0 or x == MAP_SIZE-1 or y == 0 or y == MAP_SIZE-1:
            return jsonify({"success": False, "message": "Cannot modify border walls"}), 400
        
        # Toggle the cell
        TRUE_MAP[y, x] = FLOOR if TRUE_MAP[y, x] == WALL else WALL
        
        return jsonify({
            "success": True,
            "message": f"Cell ({x}, {y}) toggled",
            "new_value": int(TRUE_MAP[y, x]),
            "data": get_game_state()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/save_map', methods=['POST'])
def save_map():
    """API endpoint to save current map to a JSON file."""
    try:
        data = request.json
        filename = data.get('filename', 'map_config.json')
        
        # Ensure filename has .json extension
        if not filename.endswith('.json'):
            filename += '.json'
        
        # Create maps directory if it doesn't exist
        maps_dir = os.path.join(os.path.dirname(__file__), 'maps')
        os.makedirs(maps_dir, exist_ok=True)
        
        filepath = os.path.join(maps_dir, filename)
        
        # Save map as JSON
        map_data = {
            "size": MAP_SIZE,
            "map": TRUE_MAP.tolist(),
            "robot_start": {
                "x": robot.initial_x,
                "y": robot.initial_y,
                "angle": robot.initial_angle
            }
        }
        
        with open(filepath, 'w') as f:
            json.dump(map_data, f, indent=2)
        
        return jsonify({
            "success": True,
            "message": f"Map saved to {filename}",
            "filepath": filepath
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/load_map', methods=['POST'])
def load_map():
    """API endpoint to load map from a JSON file."""
    try:
        global TRUE_MAP
        data = request.json
        filename = data.get('filename', 'map_config.json')
        
        # Ensure filename has .json extension
        if not filename.endswith('.json'):
            filename += '.json'
        
        maps_dir = os.path.join(os.path.dirname(__file__), 'maps')
        filepath = os.path.join(maps_dir, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": f"File {filename} not found"}), 404
        
        # Load map from JSON
        with open(filepath, 'r') as f:
            map_data = json.load(f)
        
        # Update map
        TRUE_MAP = np.array(map_data['map'], dtype=int)
        
        # Reset robot to saved starting position
        if 'robot_start' in map_data:
            robot.initial_x = map_data['robot_start']['x']
            robot.initial_y = map_data['robot_start']['y']
            robot.initial_angle = map_data['robot_start']['angle']
            robot.reset()
        
        return jsonify({
            "success": True,
            "message": f"Map loaded from {filename}",
            "data": get_game_state()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/list_maps', methods=['GET'])
def list_maps():
    """API endpoint to list available map files."""
    try:
        maps_dir = os.path.join(os.path.dirname(__file__), 'maps')
        
        if not os.path.exists(maps_dir):
            return jsonify({"success": True, "maps": []}), 200
        
        map_files = [f for f in os.listdir(maps_dir) if f.endswith('.json')]
        
        return jsonify({
            "success": True,
            "maps": map_files,
            "count": len(map_files)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/clear_map', methods=['POST'])
def clear_map():
    """API endpoint to clear all internal walls (keep borders)."""
    try:
        global TRUE_MAP
        
        # Reset map to all floors
        TRUE_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
        
        # Re-add borders
        TRUE_MAP[0, :] = WALL
        TRUE_MAP[-1, :] = WALL
        TRUE_MAP[:, 0] = WALL
        TRUE_MAP[:, -1] = WALL
        
        return jsonify({
            "success": True,
            "message": "Map cleared (borders preserved)",
            "data": get_game_state()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "SLAM Simulation Backend"
    }), 200


# Serve static files (for local hosting)
@app.route('/')
def serve_index():
    """Serve the main HTML file."""
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, etc.)."""
    return send_from_directory('.', filename)


if __name__ == "__main__":
    # Get debug mode from environment
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting SLAM Simulation Backend on port {DEFAULT_PORT}")
    print(f"Debug mode: {debug_mode}")
    print(f"Map size: {MAP_SIZE}x{MAP_SIZE}")
    print(f"Robot starting position: ({robot.x}, {robot.y}), angle: {robot.angle}°")
    print("\nAvailable endpoints:")
    print("  GET  /                - Main web interface")
    print("  GET  /api/get_state   - Get current simulation state")
    print("  GET  /api/sensors     - Get distance sensor readings")
    print("  GET  /api/discovered_map - Get discovered map")
    print("  GET  /api/odometry    - Get odometry and path history")
    print("  POST /api/set_goal    - Set goal and compute A* path")
    print("  POST /api/clear_goal  - Clear current goal")
    print("  GET  /api/next_move   - Get next move in path")
    print("  POST /api/follow_path - Execute one step of path")
    print("  POST /api/move        - Move robot with commands")
    print("  POST /api/rotate_left - Rotate robot left")
    print("  POST /api/rotate_right- Rotate robot right")
    print("  POST /api/reset       - Reset robot to start")
    print("  GET  /api/map_info    - Get map information")
    print("  POST /api/toggle_cell - Toggle wall/floor")
    print("  POST /api/save_map    - Save map configuration")
    print("  POST /api/load_map    - Load map configuration")
    print("  GET  /api/list_maps   - List saved maps")
    print("  POST /api/clear_map   - Clear all internal walls")
    print("  GET  /health          - Health check")
    print("\n🌐 Open browser to: http://localhost:5000")
    
    app.run(debug=debug_mode, port=DEFAULT_PORT, host='0.0.0.0')
