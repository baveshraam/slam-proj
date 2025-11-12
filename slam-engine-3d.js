// 3D SLAM Engine - Full 6-DOF Robot with Voxel-Based Environment
// True 3D space exploration with Roll, Pitch, Yaw orientation and gravity physics

class SLAM3DEngine {
    constructor(mapWidth = 50, mapDepth = 50, mapHeight = 20, sensorRange = Infinity) {
        // 3D Map dimensions
        this.MAP_WIDTH = mapWidth;   // X-axis (left-right)
        this.MAP_DEPTH = mapDepth;   // Y-axis (forward-backward)
        this.MAP_HEIGHT = mapHeight; // Z-axis (up-down, altitude)
        this.MAX_Z = mapHeight;      // Alias for UI compatibility
        this.SENSOR_RANGE = sensorRange;
        
        // Voxel states
        this.EMPTY = 0;      // Air/traversable space
        this.SOLID = 1;      // Wall/obstacle
        this.UNKNOWN = 2;    // Unexplored
        
        // 3D Sensor configuration (11 sensors: 8 horizontal + 3 vertical)
        this.sensorConfig = {
            // 8 Horizontal sensors (at eye level)
            front: { enabled: true, range: Infinity, azimuth: 0, elevation: 0 },
            front_right: { enabled: true, range: Infinity, azimuth: -45, elevation: 0 },
            right: { enabled: true, range: Infinity, azimuth: -90, elevation: 0 },
            back_right: { enabled: true, range: Infinity, azimuth: -135, elevation: 0 },
            back: { enabled: true, range: Infinity, azimuth: 180, elevation: 0 },
            back_left: { enabled: true, range: Infinity, azimuth: 135, elevation: 0 },
            left: { enabled: true, range: Infinity, azimuth: 90, elevation: 0 },
            front_left: { enabled: true, range: Infinity, azimuth: 45, elevation: 0 },
            
            // 3 Vertical sensors (optional, disabled by default for performance)
            straight_up: { enabled: false, range: Infinity, azimuth: 0, elevation: 90 },
            straight_down: { enabled: false, range: Infinity, azimuth: 0, elevation: -90 },
            forward_up: { enabled: false, range: Infinity, azimuth: 0, elevation: 45 }
        };
        
        this.visionMode = '360';
        
        // Cardinal yaw angles (4 directions, same as 2D)
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
        
        // Robot state with 6-DOF (6 Degrees of Freedom)
        this.robot = {
            // 3D Position
            x: 2,
            y: 2,
            z: 1,  // Z=1 means standing on ground (ground is Z=0)
            
            // 3D Orientation (Euler angles)
            roll: 0,   // Rotation around X-axis (-180 to 180°), tilt left/right
            pitch: 0,  // Rotation around Y-axis (-90 to 90°), tilt up/down
            yaw: this.EAST,  // Rotation around Z-axis (0 to 360°), heading
            
            // Initial state (for reset)
            initial_x: 2,
            initial_y: 2,
            initial_z: 1,
            initial_roll: 0,
            initial_pitch: 0,
            initial_yaw: this.EAST,
            
            // Odometry (movement tracking)
            path_history: [[2, 2, 1]],
            move_count: 0,
            rotation_count: 0,
            vertical_move_count: 0,  // New: track up/down movements
            distance_traveled: 0.0,
            altitude_max_reached: 1,  // Highest Z reached
            
            // Odometry object for UI
            odometry: {
                move_count: 0,
                rotation_count: 0,
                vertical_move_count: 0,
                distance_traveled: 0.0,
                path_length: 1
            },
            
            // Path planning (3D)
            goal: null,
            planned_path: [],
            current_path_index: 0,
            
            // Path planning object for UI
            path_planning: {
                goal: null,
                planned_path: [],
                has_path: false
            }
        };
        
        // Initialize maps
        this.trueMap = this.createDefaultMap();
        this.discoveredMap = this.createUnknownMap();
        
        // Mark starting position as discovered
        this.markVoxelDiscovered(this.robot.x, this.robot.y, this.robot.z, this.EMPTY);
        
        // Run initial sensor scan to discover surroundings
        this.updateDiscoveredMap();
        
        // Current viewing level (for UI, which Z-level to display)
        this.currentViewLevel = 1;  // Start at Z=1 where robot is, not Z=0 (floor)
    }
    
    /**
     * Create default 3D map with walls, obstacles, and multi-level structures
     * Z=0 is ground/floor, Z>0 is elevated
     */
    createDefaultMap() {
        // Initialize 3D array: [z][y][x]
        const map = Array(this.MAP_HEIGHT).fill(0).map(() =>
            Array(this.MAP_DEPTH).fill(0).map(() =>
                Array(this.MAP_WIDTH).fill(this.EMPTY)
            )
        );
        
        // Create HOUSE/ROOM layout
        // Z=0 is the floor (solid everywhere)
        for (let y = 0; y < this.MAP_DEPTH; y++) {
            for (let x = 0; x < this.MAP_WIDTH; x++) {
                map[0][y][x] = this.SOLID;  // Floor
            }
        }
        
        // Create OUTER WALLS of the house (perimeter walls going up to height 8)
        const wallHeight = 8;
        for (let y = 0; y < this.MAP_DEPTH; y++) {
            for (let x = 0; x < this.MAP_WIDTH; x++) {
                if (x === 0 || x === this.MAP_WIDTH - 1 || 
                    y === 0 || y === this.MAP_DEPTH - 1) {
                    for (let z = 1; z <= wallHeight; z++) {
                        if (z < this.MAP_HEIGHT) {
                            map[z][y][x] = this.SOLID;
                        }
                    }
                }
            }
        }
        
        // Create DOORWAYS in the outer walls (openings)
        // Front door (south wall, middle)
        for (let z = 1; z <= 3; z++) {
            for (let x = 23; x <= 27; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][0][x] = this.EMPTY;
                }
            }
        }
        
        // Back door (north wall, middle)
        for (let z = 1; z <= 3; z++) {
            for (let x = 23; x <= 27; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][this.MAP_DEPTH - 1][x] = this.EMPTY;
                }
            }
        }
        
        // === INTERIOR ROOMS ===
        
        // LIVING ROOM - Large open space (bottom-left quadrant)
        // No walls needed, it's open
        
        // KITCHEN - Horizontal wall separator with doorway (middle-left)
        for (let z = 1; z <= 3; z++) {
            for (let x = 5; x <= 22; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][15][x] = this.SOLID;
                }
            }
        }
        // Kitchen doorway
        for (let z = 1; z <= 3; z++) {
            for (let x = 12; x <= 15; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][15][x] = this.EMPTY;
                }
            }
        }
        
        // BEDROOM 1 - Vertical wall separator (middle-right)
        for (let z = 1; z <= 3; z++) {
            for (let y = 5; y <= 25; y++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][y][30] = this.SOLID;
                }
            }
        }
        // Bedroom 1 doorway
        for (let z = 1; z <= 3; z++) {
            for (let y = 12; y <= 15; y++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][y][30] = this.EMPTY;
                }
            }
        }
        
        // BEDROOM 2 - Horizontal wall (top-right)
        for (let z = 1; z <= 3; z++) {
            for (let x = 30; x <= 45; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][25][x] = this.SOLID;
                }
            }
        }
        // Bedroom 2 doorway
        for (let z = 1; z <= 3; z++) {
            for (let x = 36; x <= 39; x++) {
                if (z < this.MAP_HEIGHT) {
                    map[z][25][x] = this.EMPTY;
                }
            }
        }
        
        // === FURNITURE / OBSTACLES ===
        
        // Kitchen counter (small rectangle)
        for (let z = 1; z <= 2; z++) {
            for (let y = 17; y <= 20; y++) {
                for (let x = 8; x <= 12; x++) {
                    if (z < this.MAP_HEIGHT) {
                        map[z][y][x] = this.SOLID;
                    }
                }
            }
        }
        
        // Dining table (center-left)
        for (let z = 1; z <= 2; z++) {
            for (let y = 7; y <= 10; y++) {
                for (let x = 10; x <= 14; x++) {
                    if (z < this.MAP_HEIGHT) {
                        map[z][y][x] = this.SOLID;
                    }
                }
            }
        }
        
        // Bed in bedroom 1 (rectangular)
        for (let z = 1; z <= 2; z++) {
            for (let y = 8; y <= 12; y++) {
                for (let x = 35; x <= 40; x++) {
                    if (z < this.MAP_HEIGHT) {
                        map[z][y][x] = this.SOLID;
                    }
                }
            }
        }
        
        // Wardrobe in bedroom 2 (tall obstacle)
        for (let z = 1; z <= 4; z++) {
            for (let y = 28; y <= 31; y++) {
                for (let x = 35; x <= 38; x++) {
                    if (z < this.MAP_HEIGHT) {
                        map[z][y][x] = this.SOLID;
                    }
                }
            }
        }
        
        // === STAIRS (ascending from Z=1 to Z=5) ===
        for (let step = 0; step < 5; step++) {
            const stepZ = 1 + step;
            const stepY = 35 + step;
            for (let x = 15; x <= 20; x++) {
                if (stepZ < this.MAP_HEIGHT && stepY < this.MAP_DEPTH) {
                    map[stepZ][stepY][x] = this.SOLID;
                }
            }
        }
        
        // === SECOND FLOOR (platform at Z=5) ===
        for (let y = 40; y < 48; y++) {
            for (let x = 10; x < 25; x++) {
                if (5 < this.MAP_HEIGHT && y < this.MAP_DEPTH && x < this.MAP_WIDTH) {
                    map[5][y][x] = this.SOLID;
                }
            }
        }
        
        // Railing around second floor
        for (let y = 40; y < 48; y++) {
            if (6 < this.MAP_HEIGHT) {
                map[6][y][10] = this.SOLID;  // Left railing
                map[6][y][24] = this.SOLID;  // Right railing
            }
        }
        for (let x = 10; x < 25; x++) {
            if (6 < this.MAP_HEIGHT) {
                map[6][40][x] = this.SOLID;  // Front railing
                map[6][47][x] = this.SOLID;  // Back railing (if in bounds)
            }
        }
        
        // === CEILING (partial, over some rooms) ===
        // Ceiling over living room area
        const ceilingZ = wallHeight;
        for (let y = 5; y < 20; y++) {
            for (let x = 5; x < 25; x++) {
                if (ceilingZ < this.MAP_HEIGHT) {
                    map[ceilingZ][y][x] = this.SOLID;
                }
            }
        }
        
        return map;
    }
    
    /**
     * Create 3D grid filled with UNKNOWN voxels (for discovered map)
     */
    createUnknownMap() {
        return Array(this.MAP_HEIGHT).fill(0).map(() =>
            Array(this.MAP_DEPTH).fill(0).map(() =>
                Array(this.MAP_WIDTH).fill(this.UNKNOWN)
            )
        );
    }
    
    /**
     * Check if 3D position is valid and traversable
     */
    isValidPosition(x, y, z) {
        // Boundary check
        if (x < 0 || x >= this.MAP_WIDTH) return false;
        if (y < 0 || y >= this.MAP_DEPTH) return false;
        if (z < 0 || z >= this.MAP_HEIGHT) return false;
        
        // Cell must not be solid
        if (this.trueMap[z][y][x] === this.SOLID) return false;
        
        // Must have ground beneath (robot can't float)
        if (z > 0 && this.trueMap[z - 1][y][x] === this.EMPTY) {
            return false; // No ground support
        }
        
        return true;
    }
    
    /**
     * Check if there's ground/floor beneath a position (gravity constraint)
     */
    hasGround(x, y, z) {
        if (z === 0) return true; // Already at ground level
        if (z - 1 < 0) return false;
        return this.trueMap[z - 1][y][x] === this.SOLID;
    }
    
    /**
     * Check head clearance (no ceiling collision above)
     */
    hasHeadroom(x, y, z) {
        if (z + 1 >= this.MAP_HEIGHT) return false; // Hitting ceiling
        return this.trueMap[z + 1][y][x] === this.EMPTY;
    }
    
    /**
     * Convert Euler angles to 3D direction vector
     * Used for sensor ray-casting
     */
    eulerToDirection(yaw, pitch, roll) {
        const yawRad = yaw * (Math.PI / 180);
        const pitchRad = pitch * (Math.PI / 180);
        
        // Calculate 3D direction (roll doesn't affect direction vector much)
        const dx = Math.cos(yawRad) * Math.cos(pitchRad);
        const dy = Math.sin(yawRad) * Math.cos(pitchRad);
        const dz = Math.sin(pitchRad);
        
        // Normalize vector
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return {
            x: dx / length,
            y: dy / length,
            z: dz / length
        };
    }
    
    /**
     * 3D Ray-casting for sensor readings
     * Casts rays in 3D space considering azimuth and elevation angles
     */
    castRay3D(startX, startY, startZ, azimuth, elevation, maxDistance) {
        const azRad = azimuth * (Math.PI / 180);
        const elRad = elevation * (Math.PI / 180);
        
        // Calculate 3D ray direction
        const dx = Math.cos(elRad) * Math.cos(azRad);
        const dy = Math.cos(elRad) * Math.sin(azRad);
        const dz = Math.sin(elRad);
        
        let distance = 0;
        let cx = startX;
        let cy = startY;
        let cz = startZ;
        
        const step = 0.1; // Small step size for accuracy
        const maxDist = Math.min(maxDistance, Math.max(this.MAP_WIDTH, this.MAP_DEPTH, this.MAP_HEIGHT));
        
        while (distance < maxDist) {
            cx += dx * step;
            cy += dy * step;
            cz += dz * step;
            distance += step;
            
            const gridX = Math.floor(cx);
            const gridY = Math.floor(cy);
            const gridZ = Math.floor(cz);
            
            // Check boundaries
            if (gridX < 0 || gridX >= this.MAP_WIDTH ||
                gridY < 0 || gridY >= this.MAP_DEPTH ||
                gridZ < 0 || gridZ >= this.MAP_HEIGHT) {
                break;
            }
            
            // Check if hit obstacle
            if (this.trueMap[gridZ][gridY][gridX] === this.SOLID) {
                return distance;
            }
        }
        
        return Math.min(distance, maxDistance);
    }
    
    /**
     * Get sensor readings for all enabled sensors
     */
    getSensorReadings() {
        const sensors = {};
        
        for (const [sensorName, config] of Object.entries(this.sensorConfig)) {
            if (!config.enabled) {
                sensors[sensorName] = null;
                continue;
            }
            
            // Calculate sensor's global orientation (robot yaw + sensor offset)
            const globalAzimuth = (this.robot.yaw + config.azimuth + 360) % 360;
            const globalElevation = this.robot.pitch + config.elevation;
            
            // Cast ray in 3D space
            const distance = this.castRay3D(
                this.robot.x,
                this.robot.y,
                this.robot.z,
                globalAzimuth,
                globalElevation,
                config.range
            );
            
            sensors[sensorName] = distance;
        }
        
        return sensors;
    }
    
    /**
     * Mark a voxel as discovered in the discovered map
     */
    markVoxelDiscovered(x, y, z, state) {
        if (x >= 0 && x < this.MAP_WIDTH &&
            y >= 0 && y < this.MAP_DEPTH &&
            z >= 0 && z < this.MAP_HEIGHT) {
            this.discoveredMap[z][y][x] = state;
        }
    }
    
    /**
     * Update discovered map based on current sensor readings
     */
    updateDiscoveredMap() {
        const sensors = this.getSensorReadings();
        
        // Mark current position as discovered
        this.markVoxelDiscovered(this.robot.x, this.robot.y, this.robot.z, this.EMPTY);
        
        for (const [sensorName, distance] of Object.entries(sensors)) {
            if (distance === null) continue;
            
            // Get sensor direction
            const config = this.sensorConfig[sensorName];
            const globalAzimuth = (this.robot.yaw + config.azimuth + 360) % 360;
            const globalElevation = this.robot.pitch + config.elevation;
            
            const azRad = globalAzimuth * (Math.PI / 180);
            const elRad = globalElevation * (Math.PI / 180);
            
            const dx = Math.cos(elRad) * Math.cos(azRad);
            const dy = Math.cos(elRad) * Math.sin(azRad);
            const dz = Math.sin(elRad);
            
            let cx = this.robot.x;
            let cy = this.robot.y;
            let cz = this.robot.z;
            let traveled = 0;
            const step = 0.5; // Larger step for discovered map (performance)
            
            // Mark cells along ray as discovered (EMPTY)
            while (traveled < distance) {
                cx += dx * step;
                cy += dy * step;
                cz += dz * step;
                traveled += step;
                
                const gridX = Math.floor(cx);
                const gridY = Math.floor(cy);
                const gridZ = Math.floor(cz);
                
                if (gridX >= 0 && gridX < this.MAP_WIDTH &&
                    gridY >= 0 && gridY < this.MAP_DEPTH &&
                    gridZ >= 0 && gridZ < this.MAP_HEIGHT) {
                    
                    if (this.discoveredMap[gridZ][gridY][gridX] === this.UNKNOWN) {
                        this.discoveredMap[gridZ][gridY][gridX] = this.EMPTY;
                    }
                }
            }
            
            // Mark obstacle at ray endpoint
            const endX = Math.floor(this.robot.x + dx * distance);
            const endY = Math.floor(this.robot.y + dy * distance);
            const endZ = Math.floor(this.robot.z + dz * distance);
            
            if (endX >= 0 && endX < this.MAP_WIDTH &&
                endY >= 0 && endY < this.MAP_DEPTH &&
                endZ >= 0 && endZ < this.MAP_HEIGHT) {
                
                if (this.trueMap[endZ][endY][endX] === this.SOLID) {
                    this.discoveredMap[endZ][endY][endX] = this.SOLID;
                }
            }
        }
    }
    
    /**
     * Move robot forward in the direction of yaw (horizontal movement)
     */
    moveForward() {
        let newX = this.robot.x;
        let newY = this.robot.y;
        
        // Calculate new position based on yaw
        if (this.robot.yaw === this.EAST) newX += 1;
        else if (this.robot.yaw === this.WEST) newX -= 1;
        else if (this.robot.yaw === this.NORTH) newY -= 1;
        else if (this.robot.yaw === this.SOUTH) newY += 1;
        
        // Check validity with gravity
        if (this.isValidPosition(newX, newY, this.robot.z)) {
            this.robot.x = newX;
            this.robot.y = newY;
            this.robot.path_history.push([this.robot.x, this.robot.y, this.robot.z]);
            this.robot.move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.updateOdometry();
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    /**
     * Move robot backward (opposite of yaw direction)
     */
    moveBackward() {
        let newX = this.robot.x;
        let newY = this.robot.y;
        
        if (this.robot.yaw === this.EAST) newX -= 1;
        else if (this.robot.yaw === this.WEST) newX += 1;
        else if (this.robot.yaw === this.NORTH) newY += 1;
        else if (this.robot.yaw === this.SOUTH) newY -= 1;
        
        if (this.isValidPosition(newX, newY, this.robot.z)) {
            this.robot.x = newX;
            this.robot.y = newY;
            this.robot.path_history.push([this.robot.x, this.robot.y, this.robot.z]);
            this.robot.move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.updateOdometry();
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    /**
     * Move robot up (climb stairs, increase altitude)
     */
    moveUp() {
        const newZ = this.robot.z + 1;
        
        // Can only move up if there's space above and robot stays on solid ground
        if (newZ < this.MAP_HEIGHT &&
            this.trueMap[newZ][this.robot.y][this.robot.x] === this.EMPTY &&
            this.hasGround(this.robot.x, this.robot.y, newZ)) {
            
            this.robot.z = newZ;
            this.robot.path_history.push([this.robot.x, this.robot.y, this.robot.z]);
            this.robot.move_count += 1;
            this.robot.vertical_move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.robot.altitude_max_reached = Math.max(this.robot.altitude_max_reached, newZ);
            this.updateOdometry();
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    /**
     * Move robot down (descend stairs, decrease altitude)
     */
    moveDown() {
        const newZ = this.robot.z - 1;
        
        // Can only move down if new position is valid
        if (newZ > 0 && this.isValidPosition(this.robot.x, this.robot.y, newZ)) {
            this.robot.z = newZ;
            this.robot.path_history.push([this.robot.x, this.robot.y, this.robot.z]);
            this.robot.move_count += 1;
            this.robot.vertical_move_count += 1;
            this.robot.distance_traveled += 1.0;
            this.updateOdometry();
            this.updateDiscoveredMap();
            return true;
        }
        return false;
    }
    
    /**
     * Rotate yaw left (counterclockwise)
     */
    rotateLeft() {
        this.robot.yaw = (this.robot.yaw + 90) % 360;
        this.robot.rotation_count += 1;
        this.updateOdometry();
    }
    
    /**
     * Rotate yaw right (clockwise)
     */
    rotateRight() {
        this.robot.yaw = (this.robot.yaw - 90 + 360) % 360;
        this.robot.rotation_count += 1;
        this.updateOdometry();
    }
    
    /**
     * Adjust pitch (tilt up/down)
     */
    adjustPitch(degrees) {
        this.robot.pitch = Math.max(-90, Math.min(90, this.robot.pitch + degrees));
    }
    
    /**
     * Adjust roll (tilt left/right)
     */
    adjustRoll(degrees) {
        this.robot.roll = (this.robot.roll + degrees + 360) % 360;
        if (this.robot.roll > 180) this.robot.roll -= 360; // Keep in -180 to 180 range
    }
    
    /**
     * Reset orientation to level (pitch=0, roll=0)
     */
    resetOrientation() {
        this.robot.pitch = 0;
        this.robot.roll = 0;
    }
    
    /**
     * Update odometry object for UI
     */
    updateOdometry() {
        this.robot.odometry = {
            move_count: this.robot.move_count,
            rotation_count: this.robot.rotation_count,
            vertical_move_count: this.robot.vertical_move_count,
            distance_traveled: this.robot.distance_traveled,
            path_length: this.robot.path_history.length
        };
    }
    
    /**
     * Reset robot to initial state
     */
    reset() {
        this.robot.x = this.robot.initial_x;
        this.robot.y = this.robot.initial_y;
        this.robot.z = this.robot.initial_z;
        this.robot.roll = this.robot.initial_roll;
        this.robot.pitch = this.robot.initial_pitch;
        this.robot.yaw = this.robot.initial_yaw;
        this.robot.path_history = [[this.robot.x, this.robot.y, this.robot.z]];
        this.robot.move_count = 0;
        this.robot.rotation_count = 0;
        this.robot.vertical_move_count = 0;
        this.robot.distance_traveled = 0.0;
        this.robot.altitude_max_reached = this.robot.initial_z;
        this.robot.goal = null;
        this.robot.planned_path = [];
        this.robot.current_path_index = 0;
        
        this.updateOdometry();
        
        this.discoveredMap = this.createUnknownMap();
        this.markVoxelDiscovered(this.robot.x, this.robot.y, this.robot.z, this.EMPTY);
    }
    
    /**
     * 3D A* Pathfinding
     * Finds shortest path in 3D voxel space
     */
    aStarSearch3D(start, goal, useDiscovered = true) {
        const map = useDiscovered ? this.discoveredMap : this.trueMap;
        
        if (!start || !goal || start.length < 3 || goal.length < 3) {
            return [];
        }
        
        const [sx, sy, sz] = start;
        const [gx, gy, gz] = goal;
        
        // Validate goal
        if (useDiscovered) {
            if (map[gz][gy][gx] === this.UNKNOWN || map[gz][gy][gx] === this.SOLID) {
                return [];
            }
        } else {
            if (map[gz][gy][gx] === this.SOLID) {
                return [];
            }
        }
        
        // 3D Manhattan distance heuristic
        const heuristic = (pos) => {
            return Math.abs(gx - pos[0]) + Math.abs(gy - pos[1]) + Math.abs(gz - pos[2]);
        };
        
        // Get neighbors in 3D (6 directions: 4 horizontal + 2 vertical)
        const getNeighbors = (pos) => {
            const [x, y, z] = pos;
            const neighbors = [];
            const moves = [
                [1, 0, 0, 1.0],  // Right
                [-1, 0, 0, 1.0], // Left
                [0, 1, 0, 1.0],  // Forward
                [0, -1, 0, 1.0], // Backward
                [0, 0, 1, 1.5],  // Up (more costly)
                [0, 0, -1, 1.5]  // Down (more costly)
            ];
            
            for (const [dx, dy, dz, cost] of moves) {
                const nx = x + dx;
                const ny = y + dy;
                const nz = z + dz;
                
                if (nx >= 0 && nx < this.MAP_WIDTH &&
                    ny >= 0 && ny < this.MAP_DEPTH &&
                    nz >= 0 && nz < this.MAP_HEIGHT) {
                    
                    const voxel = map[nz][ny][nx];
                    const isTraversable = useDiscovered ? (voxel === this.EMPTY) : (voxel === this.EMPTY);
                    
                    if (isTraversable) {
                        // Check ground constraint for horizontal moves
                        if (dz === 0) {
                            // Must have ground below
                            if (nz > 0 && map[nz - 1][ny][nx] === this.SOLID) {
                                neighbors.push([[nx, ny, nz], cost]);
                            } else if (nz === 0) {
                                neighbors.push([[nx, ny, nz], cost]);
                            }
                        } else {
                            // Vertical movement always allowed if space is empty
                            neighbors.push([[nx, ny, nz], cost]);
                        }
                    }
                }
            }
            
            return neighbors;
        };
        
        // A* algorithm
        const openSet = [[heuristic([sx, sy, sz]), 0, [sx, sy, sz], []]]; // [f, g, pos, path]
        const closedSet = new Set();
        const gScores = {};
        const startKey = `${sx},${sy},${sz}`;
        gScores[startKey] = 0;
        
        while (openSet.length > 0) {
            // Get node with lowest f score
            openSet.sort((a, b) => a[0] - b[0]);
            const [f, g, current, path] = openSet.shift();
            
            const [cx, cy, cz] = current;
            const currentKey = `${cx},${cy},${cz}`;
            
            // Goal reached
            if (cx === gx && cy === gy && cz === gz) {
                return [...path, current];
            }
            
            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);
            
            // Explore neighbors
            for (const [neighbor, moveCost] of getNeighbors(current)) {
                const neighborKey = `${neighbor[0]},${neighbor[1]},${neighbor[2]}`;
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeG = g + moveCost;
                
                if (!(neighborKey in gScores) || tentativeG < gScores[neighborKey]) {
                    gScores[neighborKey] = tentativeG;
                    const h = heuristic(neighbor);
                    const f = tentativeG + h;
                    openSet.push([f, tentativeG, neighbor, [...path, current]]);
                }
            }
        }
        
        return []; // No path found
    }
    
    /**
     * Set goal and compute 3D path
     */
    setGoal(goalX, goalY, goalZ, useDiscovered = true) {
        this.robot.goal = { x: goalX, y: goalY, z: goalZ };
        this.robot.planned_path = this.aStarSearch3D(
            [this.robot.x, this.robot.y, this.robot.z],
            [goalX, goalY, goalZ],
            useDiscovered
        );
        this.robot.current_path_index = 0;
        
        // Update path planning object for UI
        this.robot.path_planning = {
            goal: this.robot.goal,
            planned_path: this.robot.planned_path,
            has_path: this.robot.planned_path.length > 0
        };
        
        return this.robot.planned_path.length > 0;
    }
    
    /**
     * Clear current goal
     */
    clearGoal() {
        this.robot.goal = null;
        this.robot.planned_path = [];
        this.robot.current_path_index = 0;
        
        this.robot.path_planning = {
            goal: null,
            planned_path: [],
            has_path: false
        };
    }
    
    /**
     * Get next move command from planned path
     */
    getNextMoveInPath() {
        if (!this.robot.planned_path || this.robot.current_path_index >= this.robot.planned_path.length) {
            return null;
        }
        
        const nextPos = this.robot.planned_path[this.robot.current_path_index];
        const [targetX, targetY, targetZ] = nextPos;
        
        const dx = targetX - this.robot.x;
        const dy = targetY - this.robot.y;
        const dz = targetZ - this.robot.z;
        
        // Handle vertical movement first
        if (dz !== 0) {
            this.robot.current_path_index += 1;
            return dz > 0 ? 'move_up' : 'move_down';
        }
        
        // Handle horizontal movement with rotation
        let targetYaw = null;
        if (dx > 0) targetYaw = this.EAST;
        else if (dx < 0) targetYaw = this.WEST;
        else if (dy < 0) targetYaw = this.NORTH;
        else if (dy > 0) targetYaw = this.SOUTH;
        
        if (targetYaw === null) {
            this.robot.current_path_index += 1;
            return this.getNextMoveInPath();
        }
        
        // Rotate if needed
        if (this.robot.yaw !== targetYaw) {
            const angleDiff = (targetYaw - this.robot.yaw + 360) % 360;
            return (angleDiff === 90 || angleDiff === 270) ? 
                   (angleDiff === 90 ? 'rotate_left' : 'rotate_right') : 
                   'rotate_left';
        }
        
        // Move forward
        this.robot.current_path_index += 1;
        return 'move_forward';
    }
    
    /**
     * Toggle cell state (for map editing)
     */
    toggleCell(x, y, z) {
        if (x < 1 || x >= this.MAP_WIDTH - 1 ||
            y < 1 || y >= this.MAP_DEPTH - 1 ||
            z < 1) {
            return false; // Can't modify borders or ground floor
        }
        
        const current = this.trueMap[z][y][x];
        this.trueMap[z][y][x] = (current === this.SOLID) ? this.EMPTY : this.SOLID;
        return true;
    }
    
    /**
     * Clear all internal obstacles (keep borders and floor)
     */
    clearMap() {
        for (let z = 1; z < this.MAP_HEIGHT; z++) {
            for (let y = 1; y < this.MAP_DEPTH - 1; y++) {
                for (let x = 1; x < this.MAP_WIDTH - 1; x++) {
                    this.trueMap[z][y][x] = this.EMPTY;
                }
            }
        }
    }
    
    /**
     * Get 2D slice of map at specific Z level
     */
    getMapSlice(z) {
        if (z < 0 || z >= this.MAP_HEIGHT) return null;
        return this.trueMap[z];
    }
    
    /**
     * Get 2D slice of discovered map at specific Z level
     */
    getDiscoveredMapSlice(z) {
        if (z < 0 || z >= this.MAP_HEIGHT) return null;
        return this.discoveredMap[z];
    }
    
    /**
     * Set current viewing level
     */
    setViewLevel(z) {
        this.currentViewLevel = Math.max(0, Math.min(this.MAP_HEIGHT - 1, z));
    }
    
    /**
     * Get current state (for UI)
     */
    getState() {
        return {
            robot: {
                x: this.robot.x,
                y: this.robot.y,
                z: this.robot.z,
                roll: this.robot.roll,
                pitch: this.robot.pitch,
                yaw: this.robot.yaw,
                angle: this.robot.yaw, // For compatibility with 2D UI
                odometry: this.robot.odometry,
                path_planning: this.robot.path_planning
            },
            true_map: this.getMapSlice(this.currentViewLevel),
            discovered_map: this.getDiscoveredMapSlice(this.currentViewLevel),
            current_level: this.currentViewLevel,
            map_info: {
                width: this.MAP_WIDTH,
                depth: this.MAP_DEPTH,
                height: this.MAP_HEIGHT,
                current_level: this.currentViewLevel
            },
            settings: {
                map_size: this.MAP_WIDTH,
                sensor_range: this.SENSOR_RANGE,
                vision_mode: this.visionMode,
                sensor_config: this.getSensorConfig()
            }
        };
    }
    
    /**
     * Get sensor configuration
     */
    getSensorConfig() {
        return { ...this.sensorConfig };
    }
    
    /**
     * Set sensor range for all sensors
     */
    setSensorRange(range) {
        this.SENSOR_RANGE = range > 0 ? range : Infinity;
        for (const sensor in this.sensorConfig) {
            this.sensorConfig[sensor].range = this.SENSOR_RANGE;
        }
    }
    
    /**
     * Set individual sensor range
     */
    setIndividualSensorRange(sensorName, range) {
        if (this.sensorConfig[sensorName]) {
            this.sensorConfig[sensorName].range = range > 0 ? range : Infinity;
            return true;
        }
        return false;
    }
    
    /**
     * Enable/disable sensor
     */
    setSensorEnabled(sensorName, enabled) {
        if (this.sensorConfig[sensorName]) {
            this.sensorConfig[sensorName].enabled = enabled;
            return true;
        }
        return false;
    }
    
    /**
     * Set vision mode
     */
    setVisionMode(mode) {
        this.visionMode = mode;
        
        // Apply vision mode presets
        const modes = {
            '360': ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left'],
            '270': ['front', 'front_right', 'right', 'left', 'front_left'],
            '180': ['front', 'front_right', 'right', 'left', 'front_left'],
            '90': ['front', 'front_right', 'front_left']
        };
        
        if (mode in modes) {
            const enabledSensors = modes[mode];
            for (const sensor in this.sensorConfig) {
                if (sensor.startsWith('straight') || sensor.includes('forward')) continue; // Skip vertical sensors
                this.sensorConfig[sensor].enabled = enabledSensors.includes(sensor);
            }
        }
    }
    
    /**
     * Get vision mode
     */
    getVisionMode() {
        return this.visionMode;
    }
}

// Export for use in app.js
window.SLAM3DEngine = SLAM3DEngine;
