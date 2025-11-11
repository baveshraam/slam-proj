from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import numpy as np
from typing import Tuple, Dict, Any
import os
import json

# Configuration
MAP_SIZE = 15
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

# Define the true map: 15x15 grid (1 = wall, 0 = floor)
TRUE_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
# Set outer borders as walls
TRUE_MAP[0, :] = WALL
TRUE_MAP[-1, :] = WALL
TRUE_MAP[:, 0] = WALL
TRUE_MAP[:, -1] = WALL

# Add some internal walls for interest
# Horizontal wall segment
TRUE_MAP[5, 3:12] = WALL
# Vertical wall segment
TRUE_MAP[2:11, 7] = WALL
# Small room structure
TRUE_MAP[9, 10] = WALL
TRUE_MAP[8, 10] = WALL
TRUE_MAP[10, 9:12] = WALL


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
    
    def reset(self) -> None:
        """Reset robot to initial position and angle."""
        self.x = self.initial_x
        self.y = self.initial_y
        self.angle = self.initial_angle
    
    def rotate_left(self) -> None:
        """Rotate robot 90 degrees counter-clockwise."""
        self.angle = (self.angle + 90) % 360
    
    def rotate_right(self) -> None:
        """Rotate robot 90 degrees clockwise."""
        self.angle = (self.angle - 90) % 360
    
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
            self.x = next_x
            self.y = next_y
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
            self.x = next_x
            self.y = next_y
            return True
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert robot state to dictionary."""
        return {
            "x": self.x,
            "y": self.y,
            "angle": self.angle
        }


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
    state = {
        "robot": robot.to_dict(),
        "true_map": map_as_list,
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


@app.route('/api/move', methods=['POST'])
def handle_move():
    """API endpoint to handle all movement commands."""
    try:
        data = request.json
        command = data.get('command')
        
        if command == 'move_forward':
            success = robot.move_forward()
            if not success:
                # Return current state even on failure
                return jsonify(get_game_state()), 200
        elif command == 'move_backward':
            success = robot.move_backward()
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
        robot.reset()
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
