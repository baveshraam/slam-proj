// SLAM Engine - All backend logic in JavaScript
// No server needed - runs entirely in browser!

class SLAMEngine {
    constructor() {
        this.MAP_SIZE = 50;
        this.WALL = 1;
        this.FLOOR = 0;
        
        // Angles
        this.EAST = 0;
        this.NORTH = 90;
        this.WEST = 180;
        this.SOUTH = 270;
        
        this.DIRECTIONS = {
            0: "East",
            90: "North",
            180: "West",
            270: "South"
        };
        
        // Initialize maps
        this.trueMap = this.createDefaultMap();
        this.discoveredMap = new Array(this.MAP_SIZE).fill(0).map(() => new Array(this.MAP_SIZE).fill(0));
        
        // Robot state
        this.robot = {
            x: 1,
            y: 1,
            angle: this.EAST,
            initial_x: 1,
            initial_y: 1,
            initial_angle: this.EAST,
            path_history: [[1, 1]],
            move_count: 0,
            rotation_count: 0,
            distance_traveled: 0.0,
            goal: null,
            planned_path: [],
            current_path_index: 0
        };
        
        // Mark starting position as discovered
        this.discoveredMap[1][1] = 1;
    }
    
    createDefaultMap() {
        const map = new Array(this.MAP_SIZE).fill(0).map(() => new Array(this.MAP_SIZE).fill(0));
        
        // Borders
        for (let i = 0; i < this.MAP_SIZE; i++) {
            map[0][i] = this.WALL;
            map[this.MAP_SIZE - 1][i] = this.WALL;
            map[i][0] = this.WALL;
            map[i][this.MAP_SIZE - 1] = this.WALL;
        }
        
        // Horizontal walls
        for (let i = 5; i < 25; i++) map[10][i] = this.WALL;
        for (let i = 10; i < 35; i++) map[20][i] = this.WALL;
        for (let i = 15; i < 40; i++) map[30][i] = this.WALL;
        
        // Vertical walls
        for (let i = 5; i < 20; i++) map[i][15] = this.WALL;
        for (let i = 15; i < 35; i++) map[i][30] = this.WALL;
        
        // Room structures
        for (let i = 20; i < 30; i++) map[25][i] = this.WALL;
        for (let i = 25; i < 35; i++) {
            map[i][20] = this.WALL;
            map[i][30] = this.WALL;
        }
        
        // Small obstacles
        for (let i = 12; i < 15; i++) map[i][40] = this.WALL;
        for (let i = 10; i < 13; i++) map[35][i] = this.WALL;
        
        return map;
    }
    
    isValidPosition(x, y) {
        if (x < 0 || x >= this.MAP_SIZE || y < 0 || y >= this.MAP_SIZE) return false;
        return this.trueMap[y][x] === this.FLOOR;
    }
    
    getSensorReadings() {
        // Map directional sensors based on robot's current angle
        const angle = this.robot.angle;
        
        // Define the 8 sensor directions relative to robot's heading
        const sensorAngles = {
            'front': angle,
            'front_right': (angle - 45 + 360) % 360,
            'right': (angle - 90 + 360) % 360,
            'back_right': (angle - 135 + 360) % 360,
            'back': (angle + 180) % 360,
            'back_left': (angle + 135) % 360,
            'left': (angle + 90) % 360,
            'front_left': (angle + 45) % 360
        };
        
        const sensors = {};
        
        // Cast rays for each sensor direction
        for (const [sensorName, sensorAngle] of Object.entries(sensorAngles)) {
            const rad = sensorAngle * (Math.PI / 180);
            const dx = Math.cos(rad);
            const dy = -Math.sin(rad); // Negative because y increases downward
            
            let distance = 0;
            let cx = this.robot.x;
            let cy = this.robot.y;
            
            // Ray cast until hitting a wall or map boundary
            while (distance < this.MAP_SIZE) {
                cx += dx;
                cy += dy;
                distance += Math.sqrt(dx * dx + dy * dy);
                
                const gridX = Math.floor(cx);
                const gridY = Math.floor(cy);
                
                // Check boundaries
                if (gridX < 0 || gridX >= this.MAP_SIZE || gridY < 0 || gridY >= this.MAP_SIZE) {
                    break;
                }
                
                // Check if hit a wall
                if (this.trueMap[gridY][gridX] === this.WALL) {
                    break;
                }
            }
            
            sensors[sensorName] = distance;
        }
        
        return sensors;
    }
    
    updateDiscoveredMap() {
        const sensors = this.getSensorReadings();
        const { x, y, angle } = this.robot;
        
        // Mark current position as free
        this.discoveredMap[y][x] = 1;
        
        // Update discovered map based on sensor readings
        for (const [sensorName, distance] of Object.entries(sensors)) {
            // Get the angle for this sensor
            let sensorAngle;
            if (sensorName === 'front') sensorAngle = angle;
            else if (sensorName === 'front_right') sensorAngle = (angle - 45 + 360) % 360;
            else if (sensorName === 'right') sensorAngle = (angle - 90 + 360) % 360;
            else if (sensorName === 'back_right') sensorAngle = (angle - 135 + 360) % 360;
            else if (sensorName === 'back') sensorAngle = (angle + 180) % 360;
            else if (sensorName === 'back_left') sensorAngle = (angle + 135) % 360;
            else if (sensorName === 'left') sensorAngle = (angle + 90) % 360;
            else if (sensorName === 'front_left') sensorAngle = (angle + 45) % 360;
            
            const rad = sensorAngle * (Math.PI / 180);
            const dx = Math.cos(rad);
            const dy = -Math.sin(rad);
            
            // Mark cells along the ray as discovered
            let cx = x;
            let cy = y;
            let traveled = 0;
            
            while (traveled < distance) {
                cx += dx * 0.5; // Smaller steps for accuracy
                cy += dy * 0.5;
                traveled += 0.5;
                
                const gridX = Math.floor(cx);
                const gridY = Math.floor(cy);
                
                if (gridX >= 0 && gridX < this.MAP_SIZE && gridY >= 0 && gridY < this.MAP_SIZE) {
                    if (this.discoveredMap[gridY][gridX] === 0) {
                        this.discoveredMap[gridY][gridX] = 1; // Free space
                    }
                }
            }
            
            // Mark the obstacle at the end
            const endX = Math.floor(x + dx * distance);
            const endY = Math.floor(y + dy * distance);
            
            if (endX >= 0 && endX < this.MAP_SIZE && endY >= 0 && endY < this.MAP_SIZE) {
                if (this.trueMap[endY][endX] === this.WALL) {
                    this.discoveredMap[endY][endX] = 2; // Obstacle
                }
            }
        }
    }
    
    moveForward() {
        let newX = this.robot.x;
        let newY = this.robot.y;
        
        if (this.robot.angle === this.EAST) newX += 1;
        else if (this.robot.angle === this.WEST) newX -= 1;
        else if (this.robot.angle === this.NORTH) newY -= 1;
        else if (this.robot.angle === this.SOUTH) newY += 1;
        
        if (this.isValidPosition(newX, newY)) {
            this.robot.x = newX;
            this.robot.y = newY;
            this.robot.path_history.push([newX, newY]);
            this.robot.move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    moveBackward() {
        let newX = this.robot.x;
        let newY = this.robot.y;
        
        if (this.robot.angle === this.EAST) newX -= 1;
        else if (this.robot.angle === this.WEST) newX += 1;
        else if (this.robot.angle === this.NORTH) newY += 1;
        else if (this.robot.angle === this.SOUTH) newY -= 1;
        
        if (this.isValidPosition(newX, newY)) {
            this.robot.x = newX;
            this.robot.y = newY;
            this.robot.path_history.push([newX, newY]);
            this.robot.move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    rotateLeft() {
        this.robot.angle = (this.robot.angle + 90) % 360;
        this.robot.rotation_count += 1;
    }
    
    rotateRight() {
        this.robot.angle = (this.robot.angle - 90 + 360) % 360;
        this.robot.rotation_count += 1;
    }
    
    reset() {
        this.robot.x = this.robot.initial_x;
        this.robot.y = this.robot.initial_y;
        this.robot.angle = this.robot.initial_angle;
        this.robot.path_history = [[this.robot.x, this.robot.y]];
        this.robot.move_count = 0;
        this.robot.rotation_count = 0;
        this.robot.distance_traveled = 0.0;
        this.robot.goal = null;
        this.robot.planned_path = [];
        this.robot.current_path_index = 0;
        
        // Reset discovered map
        this.discoveredMap = new Array(this.MAP_SIZE).fill(0).map(() => new Array(this.MAP_SIZE).fill(0));
        this.discoveredMap[this.robot.y][this.robot.x] = 1;
    }
    
    // A* Pathfinding
    aStarSearch(start, goal, useDiscovered = true) {
        const map = useDiscovered ? this.discoveredMap : this.trueMap;
        
        // Check if goal is valid
        if (map[goal[1]][goal[0]] === this.WALL || map[goal[1]][goal[0]] === 2) {
            return [];
        }
        
        const heuristic = (pos1, pos2) => {
            return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
        };
        
        const getNeighbors = (pos) => {
            const [x, y] = pos;
            const neighbors = [];
            const moves = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            
            for (const [dx, dy] of moves) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.MAP_SIZE && ny >= 0 && ny < this.MAP_SIZE) {
                    if (map[ny][nx] !== this.WALL && map[ny][nx] !== 2) {
                        neighbors.push([nx, ny]);
                    }
                }
            }
            return neighbors;
        };
        
        const openSet = [[0, start, []]]; // [f_score, position, path]
        const closedSet = new Set();
        const gScores = { [`${start[0]},${start[1]}`]: 0 };
        
        while (openSet.length > 0) {
            // Sort by f_score
            openSet.sort((a, b) => a[0] - b[0]);
            const [f, current, path] = openSet.shift();
            
            const currentKey = `${current[0]},${current[1]}`;
            
            if (current[0] === goal[0] && current[1] === goal[1]) {
                return [...path, current];
            }
            
            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);
            
            for (const neighbor of getNeighbors(current)) {
                const neighborKey = `${neighbor[0]},${neighbor[1]}`;
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeG = gScores[currentKey] + 1;
                
                if (!(neighborKey in gScores) || tentativeG < gScores[neighborKey]) {
                    gScores[neighborKey] = tentativeG;
                    const h = heuristic(neighbor, goal);
                    const f = tentativeG + h;
                    openSet.push([f, neighbor, [...path, current]]);
                }
            }
        }
        
        return [];
    }
    
    setGoal(goalX, goalY, useDiscovered = true) {
        this.robot.goal = { x: goalX, y: goalY };
        this.robot.planned_path = this.aStarSearch([this.robot.x, this.robot.y], [goalX, goalY], useDiscovered);
        this.robot.current_path_index = 0;
        return this.robot.planned_path.length > 0;
    }
    
    clearGoal() {
        this.robot.goal = null;
        this.robot.planned_path = [];
        this.robot.current_path_index = 0;
    }
    
    getNextMoveInPath() {
        if (!this.robot.planned_path || this.robot.current_path_index >= this.robot.planned_path.length) {
            return null;
        }
        
        const nextPos = this.robot.planned_path[this.robot.current_path_index];
        const targetX = nextPos[0];
        const targetY = nextPos[1];
        
        const dx = targetX - this.robot.x;
        const dy = targetY - this.robot.y;
        
        let targetAngle = null;
        if (dx > 0) targetAngle = this.EAST;
        else if (dx < 0) targetAngle = this.WEST;
        else if (dy < 0) targetAngle = this.NORTH;
        else if (dy > 0) targetAngle = this.SOUTH;
        
        if (targetAngle === null) {
            this.robot.current_path_index += 1;
            return this.getNextMoveInPath();
        }
        
        if (this.robot.angle !== targetAngle) {
            const angleDiff = (targetAngle - this.robot.angle + 360) % 360;
            if (angleDiff === 90 || angleDiff === 270) {
                return angleDiff === 90 ? 'rotate_left' : 'rotate_right';
            } else if (angleDiff === 180) {
                return 'rotate_left';
            }
        }
        
        this.robot.current_path_index += 1;
        return 'move_forward';
    }
    
    toggleCell(x, y) {
        if (x === 0 || x === this.MAP_SIZE - 1 || y === 0 || y === this.MAP_SIZE - 1) {
            return false; // Can't modify borders
        }
        this.trueMap[y][x] = this.trueMap[y][x] === this.WALL ? this.FLOOR : this.WALL;
        return true;
    }
    
    clearMap() {
        this.trueMap = new Array(this.MAP_SIZE).fill(0).map(() => new Array(this.MAP_SIZE).fill(0));
        // Re-add borders
        for (let i = 0; i < this.MAP_SIZE; i++) {
            this.trueMap[0][i] = this.WALL;
            this.trueMap[this.MAP_SIZE - 1][i] = this.WALL;
            this.trueMap[i][0] = this.WALL;
            this.trueMap[i][this.MAP_SIZE - 1] = this.WALL;
        }
    }
    
    getState() {
        return {
            robot: {
                x: this.robot.x,
                y: this.robot.y,
                angle: this.robot.angle,
                odometry: {
                    move_count: this.robot.move_count,
                    rotation_count: this.robot.rotation_count,
                    distance_traveled: this.robot.distance_traveled,
                    path_length: this.robot.path_history.length
                },
                path_planning: {
                    goal: this.robot.goal,
                    planned_path: this.robot.planned_path,
                    has_path: this.robot.planned_path.length > 0
                }
            },
            true_map: this.trueMap,
            discovered_map: this.discoveredMap,
            map_info: {
                width: this.MAP_SIZE,
                height: this.MAP_SIZE,
                floor_cells: this.trueMap.flat().filter(cell => cell === this.FLOOR).length,
                wall_cells: this.trueMap.flat().filter(cell => cell === this.WALL).length
            }
        };
    }
}

// Export for use in app.js
window.SLAMEngine = SLAMEngine;
