// API Configuration
const CLIENT_SIDE = window.CLIENT_SIDE_MODE || false;
const API_BASE_URL = window.BACKEND_URL || 'http://127.0.0.1:5000';

// Initialize SLAM Engine if client-side mode
let slamEngine = null;
if (CLIENT_SIDE) {
    slamEngine = new SLAMEngine();
    console.log('🚀 Client-side mode: All logic running in browser!');
}

document.addEventListener('DOMContentLoaded', () => {
    // Get canvases and contexts
    const canvas = document.getElementById('slamCanvas');
    const discoveredCanvas = document.getElementById('discoveredCanvas');
    
    if (!canvas || !discoveredCanvas) {
        console.error('Canvas elements not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const discoveredCtx = discoveredCanvas.getContext('2d');
    
    if (!ctx || !discoveredCtx) {
        console.error('Could not get canvas contexts!');
        return;
    }

    // Visual constants - Updated for 50x50 grid
    let GRID_SIZE = 50; // Changed from 15 to 50
    let CELL_SIZE = 20; // Changed from 12 to 20 (1000/50 = 20px per cell)
    const COLOR_FLOOR = '#f0f0f0';
    const COLOR_WALL = '#1a1f2e';
    const COLOR_WALL_BORDER = '#2d3548';
    const COLOR_ROBOT = '#e94560';
    const COLOR_ROBOT_GLOW = 'rgba(233, 69, 96, 0.4)';
    const COLOR_DIRECTION = '#4a90e2';
    const COLOR_GRID = 'rgba(74, 144, 226, 0.1)';
    let ROBOT_SIZE = 12; // Increased from 8 for better visibility
    
    // Function to recalculate cell size based on grid size
    function updateCellSize() {
        if (CLIENT_SIDE && slamEngine) {
            GRID_SIZE = slamEngine.MAP_SIZE;
            CELL_SIZE = canvas.width / GRID_SIZE;
            ROBOT_SIZE = Math.max(6, Math.min(12, CELL_SIZE * 0.6));
            
            // Update grid size labels
            const label1 = document.getElementById('grid-size-label-1');
            const label2 = document.getElementById('grid-size-label-2');
            if (label1) label1.textContent = `${GRID_SIZE}x${GRID_SIZE} Grid`;
            if (label2) label2.textContent = `${GRID_SIZE}x${GRID_SIZE} Grid`;
        }
    }
    
    // Discovered map colors
    const COLOR_UNKNOWN = '#0a0e14';
    const COLOR_FREE = '#2d3548';
    const COLOR_OBSTACLE = '#e94560';

    // Game state
    let robot = { x: 1, y: 1, angle: 0 };
    let trueMap = [];
    let discoveredMap = [];
    let isConnected = false;
    let editMode = false;
    let sensors = {};  // Store sensor readings
    let pathHistory = [];  // Store robot's path
    let odometry = { move_count: 0, rotation_count: 0, distance_traveled: 0, path_length: 1 };
    
    // Path planning
    let goalMode = false;  // Whether we're in goal-setting mode
    let goal = null;  // Goal position {x, y}
    let plannedPath = [];  // Planned path from A*
    let autoNavigating = false;  // Whether auto-navigation is active
    let navigationInterval = null;  // Interval for auto-navigation

    // Direction mapping
    const DIRECTIONS = {
        0: 'East →',
        90: 'North ↑',
        180: 'West ←',
        270: 'South ↓'
    };

    /**
     * Draw grid lines for better visualization
     */
    function drawGrid() {
        ctx.strokeStyle = COLOR_GRID;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= GRID_SIZE; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= GRID_SIZE; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(canvas.width, y * CELL_SIZE);
            ctx.stroke();
        }
    }

    /**
     * Draw the map with enhanced styling
     */
    function drawMap() {
        for (let y = 0; y < trueMap.length; y++) {
            for (let x = 0; x < trueMap[y].length; x++) {
                const cell = trueMap[y][x];
                
                if (cell === 1) {
                    // Draw wall with gradient
                    const gradient = ctx.createLinearGradient(
                        x * CELL_SIZE, 
                        y * CELL_SIZE, 
                        (x + 1) * CELL_SIZE, 
                        (y + 1) * CELL_SIZE
                    );
                    gradient.addColorStop(0, COLOR_WALL);
                    gradient.addColorStop(1, COLOR_WALL_BORDER);
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    
                    // Add border to walls
                    ctx.strokeStyle = COLOR_WALL_BORDER;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else {
                    // Draw floor
                    ctx.fillStyle = COLOR_FLOOR;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }

    /**
     * Draw the discovered map on the second canvas
     */
    function drawDiscoveredMap() {
        // Clear the discovered canvas
        discoveredCtx.clearRect(0, 0, discoveredCanvas.width, discoveredCanvas.height);
        
        // Draw grid on discovered canvas
        discoveredCtx.strokeStyle = COLOR_GRID;
        discoveredCtx.lineWidth = 1;
        
        // Vertical and horizontal grid lines
        for (let i = 0; i <= GRID_SIZE; i++) {
            discoveredCtx.beginPath();
            discoveredCtx.moveTo(i * CELL_SIZE, 0);
            discoveredCtx.lineTo(i * CELL_SIZE, discoveredCanvas.height);
            discoveredCtx.stroke();
            
            discoveredCtx.beginPath();
            discoveredCtx.moveTo(0, i * CELL_SIZE);
            discoveredCtx.lineTo(discoveredCanvas.width, i * CELL_SIZE);
            discoveredCtx.stroke();
        }
        
        // Draw discovered map cells
        for (let y = 0; y < discoveredMap.length; y++) {
            for (let x = 0; x < discoveredMap[y].length; x++) {
                const cell = discoveredMap[y][x];
                
                if (cell === 0) {
                    // Unknown - dark
                    discoveredCtx.fillStyle = COLOR_UNKNOWN;
                } else if (cell === 1) {
                    // Free space - light gray
                    discoveredCtx.fillStyle = COLOR_FREE;
                } else if (cell === 2) {
                    // Obstacle - red
                    const gradient = discoveredCtx.createLinearGradient(
                        x * CELL_SIZE, 
                        y * CELL_SIZE, 
                        (x + 1) * CELL_SIZE, 
                        (y + 1) * CELL_SIZE
                    );
                    gradient.addColorStop(0, COLOR_OBSTACLE);
                    gradient.addColorStop(1, '#b91c3d');
                    discoveredCtx.fillStyle = gradient;
                }
                
                discoveredCtx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                
                // Add subtle border to discovered cells
                if (cell > 0) {
                    discoveredCtx.strokeStyle = 'rgba(74, 144, 226, 0.2)';
                    discoveredCtx.lineWidth = 1;
                    discoveredCtx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
    }
    
    /**
     * Draw robot on discovered canvas
     */
    function drawRobotOnDiscovered() {
        const robotPixelX = (robot.x * CELL_SIZE) + (CELL_SIZE / 2);
        const robotPixelY = (robot.y * CELL_SIZE) + (CELL_SIZE / 2);

        // Draw glow effect
        const gradient = discoveredCtx.createRadialGradient(
            robotPixelX, robotPixelY, 0,
            robotPixelX, robotPixelY, ROBOT_SIZE * 2
        );
        gradient.addColorStop(0, COLOR_ROBOT_GLOW);
        gradient.addColorStop(1, 'transparent');
        discoveredCtx.fillStyle = gradient;
        discoveredCtx.beginPath();
        discoveredCtx.arc(robotPixelX, robotPixelY, ROBOT_SIZE * 2, 0, 2 * Math.PI);
        discoveredCtx.fill();

        // Draw robot body
        discoveredCtx.beginPath();
        discoveredCtx.arc(robotPixelX, robotPixelY, ROBOT_SIZE, 0, 2 * Math.PI);
        discoveredCtx.fillStyle = COLOR_ROBOT;
        discoveredCtx.fill();
        
        discoveredCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        discoveredCtx.lineWidth = 2;
        discoveredCtx.stroke();

        // Draw direction indicator
        const rad = robot.angle * (Math.PI / 180);
        const lineEndX = robotPixelX + Math.cos(rad) * (ROBOT_SIZE + 8);
        const lineEndY = robotPixelY - Math.sin(rad) * (ROBOT_SIZE + 8);

        discoveredCtx.beginPath();
        discoveredCtx.moveTo(robotPixelX, robotPixelY);
        discoveredCtx.lineTo(lineEndX, lineEndY);
        discoveredCtx.strokeStyle = COLOR_DIRECTION;
        discoveredCtx.lineWidth = 4;
        discoveredCtx.lineCap = 'round';
        discoveredCtx.stroke();

        discoveredCtx.beginPath();
        discoveredCtx.arc(lineEndX, lineEndY, 3, 0, 2 * Math.PI);
        discoveredCtx.fillStyle = COLOR_DIRECTION;
        discoveredCtx.fill();
    }

    /**
     * Draw path history on true map canvas
     */
    function drawPathOnTrueMap() {
        if (!pathHistory || pathHistory.length < 2) return;
        
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        for (let i = 0; i < pathHistory.length; i++) {
            const [x, y] = pathHistory[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            if (i === 0) {
                ctx.moveTo(pixelX, pixelY);
            } else {
                ctx.lineTo(pixelX, pixelY);
            }
        }
        ctx.stroke();
        
        // Draw path points
        ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
        for (let i = 0; i < pathHistory.length; i++) {
            const [x, y] = pathHistory[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            ctx.beginPath();
            ctx.arc(pixelX, pixelY, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    /**
     * Draw path history on discovered map canvas
     */
    function drawPathOnDiscovered() {
        if (!pathHistory || pathHistory.length < 2) return;
        
        discoveredCtx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        discoveredCtx.lineWidth = 3;
        discoveredCtx.lineCap = 'round';
        discoveredCtx.lineJoin = 'round';
        
        discoveredCtx.beginPath();
        for (let i = 0; i < pathHistory.length; i++) {
            const [x, y] = pathHistory[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            if (i === 0) {
                discoveredCtx.moveTo(pixelX, pixelY);
            } else {
                discoveredCtx.lineTo(pixelX, pixelY);
            }
        }
        discoveredCtx.stroke();
        
        // Draw path points
        discoveredCtx.fillStyle = 'rgba(52, 211, 153, 0.8)';
        for (let i = 0; i < pathHistory.length; i++) {
            const [x, y] = pathHistory[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            discoveredCtx.beginPath();
            discoveredCtx.arc(pixelX, pixelY, 2, 0, 2 * Math.PI);
            discoveredCtx.fill();
        }
    }

    /**
     * Draw planned path from A* on both canvases
     */
    function drawPlannedPath(context) {
        if (!plannedPath || plannedPath.length < 2) return;
        
        // Draw planned path line
        context.strokeStyle = 'rgba(251, 146, 60, 0.7)';  // Orange
        context.lineWidth = 4;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.setLineDash([10, 5]);  // Dashed line
        
        context.beginPath();
        for (let i = 0; i < plannedPath.length; i++) {
            const [x, y] = plannedPath[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            if (i === 0) {
                context.moveTo(pixelX, pixelY);
            } else {
                context.lineTo(pixelX, pixelY);
            }
        }
        context.stroke();
        context.setLineDash([]);  // Reset dash
        
        // Draw waypoints
        context.fillStyle = 'rgba(251, 146, 60, 0.8)';
        for (let i = 0; i < plannedPath.length; i++) {
            const [x, y] = plannedPath[i];
            const pixelX = (x * CELL_SIZE) + (CELL_SIZE / 2);
            const pixelY = (y * CELL_SIZE) + (CELL_SIZE / 2);
            
            context.beginPath();
            context.arc(pixelX, pixelY, 3, 0, 2 * Math.PI);
            context.fill();
        }
    }
    
    /**
     * Draw goal marker on both canvases
     */
    function drawGoal(context) {
        if (!goal) return;
        
        const pixelX = (goal.x * CELL_SIZE) + (CELL_SIZE / 2);
        const pixelY = (goal.y * CELL_SIZE) + (CELL_SIZE / 2);
        
        // Draw outer glow
        const gradient = context.createRadialGradient(pixelX, pixelY, 0, pixelX, pixelY, CELL_SIZE);
        gradient.addColorStop(0, 'rgba(251, 146, 60, 0.6)');
        gradient.addColorStop(1, 'transparent');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(pixelX, pixelY, CELL_SIZE, 0, 2 * Math.PI);
        context.fill();
        
        // Draw target symbol
        context.strokeStyle = 'rgba(251, 146, 60, 1)';
        context.lineWidth = 3;
        
        // Outer circle
        context.beginPath();
        context.arc(pixelX, pixelY, 8, 0, 2 * Math.PI);
        context.stroke();
        
        // Inner circle
        context.beginPath();
        context.arc(pixelX, pixelY, 4, 0, 2 * Math.PI);
        context.stroke();
        
        // Crosshair
        context.beginPath();
        context.moveTo(pixelX - 12, pixelY);
        context.lineTo(pixelX + 12, pixelY);
        context.moveTo(pixelX, pixelY - 12);
        context.lineTo(pixelX, pixelY + 12);
        context.stroke();
    }

    /**
     * Draw the robot with enhanced visuals
     */
    /**
     * Draw sensor rays showing distance readings
     */
    function drawSensorRays() {
        if (!sensors || Object.keys(sensors).length === 0) return;
        
        const robotPixelX = (robot.x * CELL_SIZE) + (CELL_SIZE / 2);
        const robotPixelY = (robot.y * CELL_SIZE) + (CELL_SIZE / 2);
        
        // Draw each sensor ray
        const sensorAngles = {
            'front': robot.angle,
            'right': (robot.angle - 90 + 360) % 360,
            'back': (robot.angle + 180) % 360,
            'left': (robot.angle + 90) % 360,
            'front_right': (robot.angle - 45 + 360) % 360,
            'front_left': (robot.angle + 45) % 360,
            'back_right': (robot.angle - 135 + 360) % 360,
            'back_left': (robot.angle + 135) % 360
        };
        
        // Colors for different sensors
        const sensorColors = {
            'front': 'rgba(74, 144, 226, 0.6)',
            'left': 'rgba(52, 211, 153, 0.6)',
            'right': 'rgba(251, 146, 60, 0.6)',
            'back': 'rgba(167, 139, 250, 0.6)',
            'front_left': 'rgba(74, 144, 226, 0.3)',
            'front_right': 'rgba(74, 144, 226, 0.3)',
            'back_left': 'rgba(167, 139, 250, 0.3)',
            'back_right': 'rgba(167, 139, 250, 0.3)'
        };
        
        Object.entries(sensors).forEach(([sensorName, distance]) => {
            // Skip disabled sensors (null values)
            if (distance === null) return;
            
            const angle = sensorAngles[sensorName];
            if (angle === undefined) return;
            
            const rad = angle * (Math.PI / 180);
            const displayDistance = isFinite(distance) ? distance : 100; // Cap infinite for display
            const endX = robotPixelX + Math.cos(rad) * displayDistance * CELL_SIZE;
            const endY = robotPixelY - Math.sin(rad) * displayDistance * CELL_SIZE;
            
            // Draw ray
            ctx.beginPath();
            ctx.moveTo(robotPixelX, robotPixelY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = sensorColors[sensorName] || 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw endpoint dot
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
            ctx.fillStyle = sensorColors[sensorName] || 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        });
    }

    function drawRobot() {
        // Calculate pixel position (center of cell)
        const robotPixelX = (robot.x * CELL_SIZE) + (CELL_SIZE / 2);
        const robotPixelY = (robot.y * CELL_SIZE) + (CELL_SIZE / 2);

        // Draw glow effect
        const gradient = ctx.createRadialGradient(
            robotPixelX, robotPixelY, 0,
            robotPixelX, robotPixelY, ROBOT_SIZE * 2
        );
        gradient.addColorStop(0, COLOR_ROBOT_GLOW);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(robotPixelX, robotPixelY, ROBOT_SIZE * 2, 0, 2 * Math.PI);
        ctx.fill();

        // Draw robot body (circle)
        ctx.beginPath();
        ctx.arc(robotPixelX, robotPixelY, ROBOT_SIZE, 0, 2 * Math.PI);
        ctx.fillStyle = COLOR_ROBOT;
        ctx.fill();
        
        // Add border to robot
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw direction indicator (line showing where robot faces)
        const rad = robot.angle * (Math.PI / 180);
        const lineEndX = robotPixelX + Math.cos(rad) * (ROBOT_SIZE + 8);
        const lineEndY = robotPixelY - Math.sin(rad) * (ROBOT_SIZE + 8); // Minus because Y is inverted

        ctx.beginPath();
        ctx.moveTo(robotPixelX, robotPixelY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = COLOR_DIRECTION;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw direction dot at the end
        ctx.beginPath();
        ctx.arc(lineEndX, lineEndY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = COLOR_DIRECTION;
        ctx.fill();
    }

    /**
     * Update UI elements with robot data
     */
    function updateUI() {
        document.getElementById('robot-x').textContent = robot.x;
        document.getElementById('robot-y').textContent = robot.y;
        document.getElementById('robot-angle').textContent = robot.angle + '°';
        document.getElementById('robot-direction').textContent = DIRECTIONS[robot.angle] || 'Unknown';
        
        // Update odometry display
        document.getElementById('move-count').textContent = odometry.move_count;
        document.getElementById('rotation-count').textContent = odometry.rotation_count;
        document.getElementById('distance-traveled').textContent = odometry.distance_traveled.toFixed(2);
        document.getElementById('path-length').textContent = odometry.path_length;
        
        // Update sensor display
        updateSensorDisplay();
        
        // Update path planning display
        updatePathPlanningUI();
    }
    
    /**
     * Update path planning UI
     */
    function updatePathPlanningUI() {
        const pathStatus = document.getElementById('path-status');
        const pathLength = document.getElementById('path-length-value');
        const autoNavBtn = document.getElementById('btn-auto-navigate');
        
        if (!pathStatus || !pathLength || !autoNavBtn) {
            return; // Elements not found
        }
        
        if (goal) {
            pathStatus.textContent = `Goal: (${goal.x}, ${goal.y})`;
            pathStatus.style.color = '#4ade80';
            
            if (plannedPath && plannedPath.length > 0) {
                pathLength.textContent = plannedPath.length;
                pathLength.style.color = ''; // Reset color
                autoNavBtn.disabled = false;
            } else {
                pathLength.textContent = 'No path found';
                pathLength.style.color = '#ef4444';
                autoNavBtn.disabled = true;
            }
        } else {
            pathStatus.textContent = 'No goal set';
            pathStatus.style.color = '#9ca3af';
            pathLength.textContent = '-';
            pathLength.style.color = ''; // Reset color
            autoNavBtn.disabled = true;
        }
        
        // Update button state
        if (autoNavigating) {
            autoNavBtn.textContent = 'Stop Navigation';
            autoNavBtn.style.background = '#ef4444';
        } else {
            autoNavBtn.textContent = 'Auto Navigate';
            autoNavBtn.style.background = '';
        }
    }
    /**
     * Update sensor display with current readings
     */
    function updateSensorDisplay() {
        const sensorDisplay = document.getElementById('sensor-display');
        if (!sensorDisplay) {
            return; // Element not found
        }
        
        if (!sensors || Object.keys(sensors).length === 0) {
            sensorDisplay.innerHTML = '<p class="placeholder">No sensor data</p>';
            return;
        }
        
        // Get sensor config if available
        let sensorConfig = {};
        if (CLIENT_SIDE && slamEngine) {
            sensorConfig = slamEngine.getSensorConfig();
        }
        
        // Create sensor grid display
        let html = '<div class="sensor-grid">';
        
        // Main sensors (cardinal directions)
        const mainSensors = ['front', 'left', 'right', 'back'];
        mainSensors.forEach(sensor => {
            const distance = sensors[sensor];
            const isEnabled = sensorConfig[sensor] ? sensorConfig[sensor].enabled : true;
            const range = sensorConfig[sensor] ? sensorConfig[sensor].range : Infinity;
            const icon = getSensorIcon(sensor);
            const displayValue = distance === null ? 'OFF' : (isFinite(distance) ? distance.toFixed(1) : '∞');
            const statusClass = distance === null || !isEnabled ? 'sensor-disabled' : '';
            
            html += `
                <div class="sensor-item ${statusClass}">
                    <span class="sensor-icon">${icon}</span>
                    <span class="sensor-name">${sensor}</span>
                    <span class="sensor-value">${displayValue}</span>
                    ${range !== Infinity ? `<span class="sensor-range-badge">${range.toFixed(0)}max</span>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        
        // Diagonal sensors (smaller display)
        html += '<div class="sensor-grid-small">';
        const diagonalSensors = ['front_left', 'front_right', 'back_left', 'back_right'];
        diagonalSensors.forEach(sensor => {
            const distance = sensors[sensor];
            const isEnabled = sensorConfig[sensor] ? sensorConfig[sensor].enabled : true;
            const range = sensorConfig[sensor] ? sensorConfig[sensor].range : Infinity;
            const displayValue = distance === null ? 'OFF' : (isFinite(distance) ? distance.toFixed(1) : '∞');
            const statusClass = distance === null || !isEnabled ? 'sensor-disabled' : '';
            
            html += `
                <div class="sensor-item-small ${statusClass}">
                    <span>${sensor.replace('_', ' ')}: ${displayValue}</span>
                    ${range !== Infinity ? ` (max:${range.toFixed(0)})` : ''}
                </div>
            `;
        });
        html += '</div>';
        
        sensorDisplay.innerHTML = html;
    }
    
    /**
     * Get emoji icon for sensor direction
     */
    function getSensorIcon(sensor) {
        const icons = {
            'front': '⬆️',
            'back': '⬇️',
            'left': '⬅️',
            'right': '➡️'
        };
        return icons[sensor] || '📡';
    }

    /**
     * Update connection status
     */
    function updateConnectionStatus(connected) {
        isConnected = connected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('connection-status');
        
        if (connected) {
            statusDot.classList.remove('disconnected');
            if (CLIENT_SIDE && slamEngine) {
                statusText.textContent = 'Client-Side Mode';
                statusText.style.color = '#4a90e2';
            } else {
                statusText.textContent = 'Connected';
                statusText.style.color = '#4ade80';
            }
        } else {
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            statusText.style.color = '#ef4444';
        }
    }

    /**
     * Main render function
     */
    function render() {
        // Update cell size in case grid changed
        updateCellSize();
        
        // Clear canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw true map (left canvas)
        drawGrid();
        drawMap();
        drawPathOnTrueMap(); // Draw path history
        drawPlannedPath(ctx); // Draw A* planned path
        drawGoal(ctx); // Draw goal marker
        drawSensorRays(); // Draw sensor rays behind robot
        drawRobot();
        
        // Draw discovered map (right canvas)
        drawDiscoveredMap();
        drawPathOnDiscovered(); // Draw path history
        drawPlannedPath(discoveredCtx); // Draw A* planned path
        drawGoal(discoveredCtx); // Draw goal marker
        drawRobotOnDiscovered();
        
        updateUI();
    }

    /**
     * Fetch sensor data from backend
     */
    async function fetchSensorData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sensors`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                sensors = data.data.sensors;
                robot = data.data.robot;
                
                // Extract odometry if available
                if (robot.odometry) {
                    odometry = robot.odometry;
                }
                
                // Extract goal and planned path from robot state
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                updateSensorDisplay();
            }
        } catch (error) {
            console.error('Error fetching sensor data:', error);
        }
    }

    /**
     * Fetch odometry data from backend
     */
    async function fetchOdometryData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/odometry`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                pathHistory = data.data.path_history;
                odometry = {
                    move_count: data.data.move_count,
                    rotation_count: data.data.rotation_count,
                    distance_traveled: data.data.distance_traveled,
                    path_length: data.data.path_history.length
                };
            }
        } catch (error) {
            console.error('Error fetching odometry data:', error);
        }
    }

    /**
     * Fetch game state from backend and render (or initialize client-side)
     */
    async function fetchAndRenderState() {
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side mode - get state from engine
                const state = slamEngine.getState();
                robot = state.robot;
                trueMap = state.true_map;
                discoveredMap = state.discovered_map;
                
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                // Update connection status
                updateConnectionStatus(true);
                
                // Update sensors
                sensors = slamEngine.getSensorReadings();
                updateSensorDisplay();
                
                // Update odometry
                odometry = robot.odometry;
                pathHistory = slamEngine.robot.path_history;
                
                // Render the updated state
                render();
                console.log("Client-side state initialized and rendered");
                return;
            }
            
            // Server-side mode
            const response = await fetch(`${API_BASE_URL}/api/get_state`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update state
                robot = data.data.robot;
                trueMap = data.data.true_map;
                discoveredMap = data.data.discovered_map || [];
                
                // Extract goal and planned path from robot state
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                // Update connection status
                updateConnectionStatus(true);
                
                // Fetch sensor data and odometry
                await fetchSensorData();
                await fetchOdometryData();
                
                // Update sensor display
                const sensorDisplay = document.getElementById('sensor-display');
                sensorDisplay.innerHTML = `
                    <div style="color: #4ade80;">✓ Map loaded: ${data.data.map_info.width}x${data.data.map_info.height}</div>
                    <div style="color: #9ca3af;">Floor cells: ${data.data.map_info.floor_cells}</div>
                    <div style="color: #9ca3af;">Wall cells: ${data.data.map_info.wall_cells}</div>
                    <div style="color: #4a90e2; margin-top: 8px;">System ready for navigation</div>
                `;
                
                // Render the updated state
                render();
                console.log("State updated and rendered");
            }
        } catch (error) {
            console.error('Error fetching game state:', error);
            updateConnectionStatus(false);
            
            // Update sensor display with error
            const sensorDisplay = document.getElementById('sensor-display');
            sensorDisplay.innerHTML = `
                <div style="color: #ef4444;">⚠ Connection Error</div>
                <div style="color: #9ca3af; margin-top: 8px;">Make sure the Flask backend is running on port 5000</div>
                <div style="color: #6b7280; margin-top: 8px; font-size: 0.75rem;">Run: python app.py</div>
            `;
        }
    }

    /**
     * Send movement command to backend OR execute locally
     */
    async function sendMoveCommand(command) {
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side execution
                if (command === 'move_forward') {
                    slamEngine.moveForward();
                } else if (command === 'move_backward') {
                    slamEngine.moveBackward();
                } else if (command === 'rotate_left') {
                    slamEngine.rotateLeft();
                } else if (command === 'rotate_right') {
                    slamEngine.rotateRight();
                }
                
                // Update local state
                const state = slamEngine.getState();
                robot = state.robot;
                trueMap = state.true_map;
                discoveredMap = state.discovered_map;
                
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                // Update sensors
                sensors = slamEngine.getSensorReadings();
                updateSensorDisplay();
                
                // Update odometry
                odometry = robot.odometry;
                pathHistory = slamEngine.robot.path_history;
                
                render();
                return;
            }
            
            // Server-side execution (original code)
            const response = await fetch(`${API_BASE_URL}/api/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command })
            });

            const data = await response.json();
            
            // Update state with new robot position
            robot = data.robot;
            trueMap = data.true_map;
            discoveredMap = data.discovered_map || [];
            
            // Extract goal and planned path from robot state
            if (robot.path_planning) {
                goal = robot.path_planning.goal;
                plannedPath = robot.path_planning.planned_path || [];
            }
            
            // Fetch sensor data and odometry after movement
            await fetchSensorData();
            await fetchOdometryData();
            
            // Re-render the scene
            render();
        } catch (error) {
            console.error('Error sending move command:', error);
        }
    }

    /**
     * Set goal and compute path
     */
    async function setGoal(x, y) {
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side path planning
                const success = slamEngine.setGoal(x, y, true);
                
                if (success) {
                    // Update local variables from engine state
                    goal = slamEngine.robot.goal;
                    plannedPath = slamEngine.robot.planned_path;
                    
                    // Also update robot state
                    const state = slamEngine.getState();
                    robot = state.robot;
                    
                    console.log(`Client-side: Path found! Length: ${plannedPath.length} steps`);
                    console.log(`Goal set to (${goal.x}, ${goal.y})`);
                } else {
                    goal = { x, y };
                    plannedPath = [];
                    console.warn('Client-side: No path found to goal - goal may be unreachable or in unexplored area');
                    alert('No path found! The goal may be:\n• In an unexplored area (move closer to discover)\n• Behind a wall\n• Unreachable from current position');
                }
                
                updatePathPlanningUI();
                render();
                return;
            }
            
            // Server-side path planning
            const response = await fetch(`${API_BASE_URL}/api/set_goal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y, use_discovered: true })
            });
            
            const data = await response.json();
            
            if (data.success) {
                goal = data.data.goal;
                plannedPath = data.data.planned_path;
                console.log(`Path found! Length: ${plannedPath.length}`);
            } else {
                goal = { x, y };
                plannedPath = [];
                console.log('No path found to goal');
            }
            
            updatePathPlanningUI();
            render();
        } catch (error) {
            console.error('Error setting goal:', error);
        }
    }
    
    /**
     * Clear goal
     */
    async function clearGoal() {
        try {
            if (CLIENT_SIDE && slamEngine) {
                slamEngine.clearGoal();
                goal = null;
                plannedPath = [];
                stopAutoNavigation();
                render();
                return;
            }
            
            await fetch(`${API_BASE_URL}/api/clear_goal`, { method: 'POST' });
            goal = null;
            plannedPath = [];
            stopAutoNavigation();
            render();
        } catch (error) {
            console.error('Error clearing goal:', error);
        }
    }
    
    /**
     * Follow path automatically
     */
    async function followPath() {
        try {
            if (CLIENT_SIDE && slamEngine) {
                const nextMove = slamEngine.getNextMoveInPath();
                
                if (!nextMove) {
                    if (goal && robot.x === goal.x && robot.y === goal.y) {
                        stopAutoNavigation();
                        console.log('Goal reached!');
                    }
                    return;
                }
                
                // Execute the move
                if (nextMove === 'move_forward') {
                    slamEngine.moveForward();
                } else if (nextMove === 'move_backward') {
                    slamEngine.moveBackward();
                } else if (nextMove === 'rotate_left') {
                    slamEngine.rotateLeft();
                } else if (nextMove === 'rotate_right') {
                    slamEngine.rotateRight();
                }
                
                // Update state
                const state = slamEngine.getState();
                robot = state.robot;
                trueMap = state.true_map;
                discoveredMap = state.discovered_map;
                
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                sensors = slamEngine.getSensorReadings();
                updateSensorDisplay();
                odometry = robot.odometry;
                pathHistory = slamEngine.robot.path_history;
                
                render();
                
                // Check if goal reached
                if (goal && robot.x === goal.x && robot.y === goal.y) {
                    stopAutoNavigation();
                    console.log('Goal reached!');
                }
                
                return;
            }
            
            // Server-side followPath
            const response = await fetch(`${API_BASE_URL}/api/follow_path`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                robot = data.data.robot;
                trueMap = data.data.true_map;
                discoveredMap = data.data.discovered_map || [];
                
                // Extract goal and planned path from robot state
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                await fetchSensorData();
                await fetchOdometryData();
                render();
                
                // Check if path is complete
                if (goal && robot.x === goal.x && robot.y === goal.y) {
                    stopAutoNavigation();
                    console.log('Goal reached!');
                }
            }
        } catch (error) {
            console.error('Error following path:', error);
            stopAutoNavigation();
        }
    }
    
    /**
     * Start auto navigation
     */
    function startAutoNavigation() {
        if (!goal || !plannedPath || plannedPath.length === 0) {
            console.log('No valid path to follow');
            return;
        }
        
        autoNavigating = true;
        updatePathPlanningUI();
        
        // Execute path every 300ms
        navigationInterval = setInterval(() => {
            followPath();
        }, 300);
    }
    
    /**
     * Stop auto navigation
     */
    function stopAutoNavigation() {
        autoNavigating = false;
        if (navigationInterval) {
            clearInterval(navigationInterval);
            navigationInterval = null;
        }
        updatePathPlanningUI();
    }

    // Load initial state
    fetchAndRenderState();
    
    // Refresh state every 2 seconds (only in server mode)
    if (!CLIENT_SIDE) {
        setInterval(fetchAndRenderState, 2000);
    }
    
    // Add smooth animation on load
    canvas.style.opacity = '0';
    setTimeout(() => {
        canvas.style.transition = 'opacity 0.5s ease-in';
        canvas.style.opacity = '1';
    }, 100);

    // Keyboard controls
    window.addEventListener('keydown', (event) => {
        // Ignore if typing in input field
        if (event.target.tagName === 'INPUT') return;
        
        switch (event.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                if (!editMode) sendMoveCommand('move_forward');
                break;
            case 'a':
            case 'A':
            case 'ArrowLeft':
                if (!editMode) sendMoveCommand('rotate_left');
                break;
            case 'd':
            case 'D':
            case 'ArrowRight':
                if (!editMode) sendMoveCommand('rotate_right');
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                if (!editMode) sendMoveCommand('move_backward');
                break;
            case 'r':
            case 'R':
                if (!editMode) {
                    // Reset robot to starting position
                    if (CLIENT_SIDE && slamEngine) {
                        // Client-side reset
                        slamEngine.reset();
                        const state = slamEngine.getState();
                        robot = state.robot;
                        trueMap = state.true_map;
                        discoveredMap = state.discovered_map;
                        goal = null;
                        plannedPath = [];
                        render();
                        console.log('Client-side: Robot reset to starting position');
                    } else {
                        // Server-side reset
                        fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' })
                            .then(() => fetchAndRenderState())
                            .catch(err => console.error('Reset failed:', err));
                    }
                }
                break;
            case 'e':
            case 'E':
                // Toggle edit mode
                toggleEditMode();
                break;
        }
    });

    /**
     * Toggle map edit mode
     */
    function toggleEditMode() {
        editMode = !editMode;
        const statusEl = document.getElementById('edit-mode-status');
        
        if (editMode) {
            canvas.classList.add('edit-mode');
            statusEl.innerHTML = 'Edit Mode: <strong style="color: #e94560;">ON</strong>';
            statusEl.style.background = 'rgba(233, 69, 96, 0.2)';
        } else {
            canvas.classList.remove('edit-mode');
            statusEl.innerHTML = 'Edit Mode: <strong>OFF</strong>';
            statusEl.style.background = 'rgba(0, 0, 0, 0.3)';
        }
    }

    /**
     * Handle canvas click for map editing and goal setting
     */
    canvas.addEventListener('click', async (event) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Scale factor: canvas display size vs actual canvas size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Convert to canvas coordinates accounting for scaling
        const canvasX = clickX * scaleX;
        const canvasY = clickY * scaleY;
        
        // Convert pixel coordinates to grid coordinates
        const gridX = Math.floor(canvasX / CELL_SIZE);
        const gridY = Math.floor(canvasY / CELL_SIZE);
        
        // Check if in goal-setting mode
        if (goalMode) {
            await setGoal(gridX, gridY);
            goalMode = false;
            const btnSetGoal = document.getElementById('btn-set-goal');
            if (btnSetGoal) {
                btnSetGoal.textContent = 'Set Goal (Click Map)';
                btnSetGoal.style.background = '';
            }
            canvas.style.cursor = editMode ? 'crosshair' : 'default';
            return;
        }
        
        // Edit mode - toggle cells
        if (!editMode) return;
        
        // Toggle the cell
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side execution
                slamEngine.toggleCell(gridX, gridY);
                
                // Update local state
                const state = slamEngine.getState();
                robot = state.robot;
                trueMap = state.true_map;
                discoveredMap = state.discovered_map;
                
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                render();
                console.log(`Client-side: Toggled cell at (${gridX}, ${gridY})`);
                return;
            }
            
            // Server-side execution
            const response = await fetch(`${API_BASE_URL}/api/toggle_cell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: gridX, y: gridY })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update map and re-render
                robot = data.data.robot;
                trueMap = data.data.true_map;
                discoveredMap = data.data.discovered_map || [];
                
                // Extract goal and planned path from robot state
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                render();
            } else {
                console.log('Cannot toggle:', data.message);
            }
        } catch (error) {
            console.error('Error toggling cell:', error);
        }
    });
    
    // Add click handler for discovered canvas (for goal setting)
    discoveredCanvas.addEventListener('click', async (event) => {
        const rect = discoveredCanvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Scale factor: canvas display size vs actual canvas size
        const scaleX = discoveredCanvas.width / rect.width;
        const scaleY = discoveredCanvas.height / rect.height;
        
        // Convert to canvas coordinates accounting for scaling
        const canvasX = clickX * scaleX;
        const canvasY = clickY * scaleY;
        
        // Convert to grid coordinates
        const gridX = Math.floor(canvasX / CELL_SIZE);
        const gridY = Math.floor(canvasY / CELL_SIZE);
        
        // Check if in goal-setting mode
        if (goalMode) {
            await setGoal(gridX, gridY);
            goalMode = false;
            const btnSetGoal = document.getElementById('btn-set-goal');
            if (btnSetGoal) {
                btnSetGoal.textContent = 'Set Goal (Click Map)';
                btnSetGoal.style.background = '';
            }
            discoveredCanvas.style.cursor = 'default';
            return;
        }
    });

    /**
     * Load available maps
     */
    async function loadMapList() {
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side mode: No map loading available
                const mapListEl = document.getElementById('map-list');
                mapListEl.innerHTML = '<div style="color: #6b7280; font-size: 0.8rem;">Client-side mode: Use Edit Mode (E) to create maps</div>';
                return;
            }
            
            // Server-side mode
            const response = await fetch(`${API_BASE_URL}/api/list_maps`);
            const data = await response.json();
            
            if (data.success) {
                const mapListEl = document.getElementById('map-list');
                
                if (data.maps.length === 0) {
                    mapListEl.innerHTML = '<div style="color: #6b7280; font-size: 0.8rem;">No saved maps</div>';
                } else {
                    mapListEl.innerHTML = data.maps.map(mapName => `
                        <div class="map-list-item" onclick="loadMapByName('${mapName}')">
                            📁 ${mapName}
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading map list:', error);
        }
    }

    /**
     * Load a specific map by filename
     */
    window.loadMapByName = async function(filename) {
        try {
            if (CLIENT_SIDE && slamEngine) {
                // Client-side mode: Maps cannot be loaded from files
                // User can only use edit mode to create custom maps
                alert('Client-side mode: Use Edit Mode (E) to create custom maps.\nMap files are not supported in browser-only mode.');
                console.log('Client-side mode does not support loading map files');
                return;
            }
            
            // Server-side mode
            const response = await fetch(`${API_BASE_URL}/api/load_map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            
            const data = await response.json();
            
            if (data.success) {
                robot = data.data.robot;
                trueMap = data.data.true_map;
                discoveredMap = data.data.discovered_map || [];
                
                // Extract goal and planned path from robot state
                if (robot.path_planning) {
                    goal = robot.path_planning.goal;
                    plannedPath = robot.path_planning.planned_path || [];
                }
                
                render();
                alert(`Map "${filename}" loaded successfully!`);
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error loading map:', error);
            alert('Failed to load map');
        }
    };

    // Path planning button event listeners
    const btnSetGoal = document.getElementById('btn-set-goal');
    const btnAutoNav = document.getElementById('btn-auto-navigate');
    const btnClearGoal = document.getElementById('btn-clear-goal');
    
    if (btnSetGoal) {
        btnSetGoal.addEventListener('click', () => {
            goalMode = !goalMode;
            
            if (goalMode) {
                btnSetGoal.textContent = 'Cancel Goal Setting';
                btnSetGoal.style.background = '#ef4444';
                canvas.style.cursor = 'crosshair';
                discoveredCanvas.style.cursor = 'crosshair';
            } else {
                btnSetGoal.textContent = 'Set Goal (Click Map)';
                btnSetGoal.style.background = '';
                canvas.style.cursor = editMode ? 'crosshair' : 'default';
                discoveredCanvas.style.cursor = editMode ? 'crosshair' : 'default';
            }
        });
    }
    
    if (btnAutoNav) {
        btnAutoNav.addEventListener('click', () => {
            if (autoNavigating) {
                stopAutoNavigation();
            } else {
                startAutoNavigation();
            }
        });
    }
    
    if (btnClearGoal) {
        btnClearGoal.addEventListener('click', () => {
            clearGoal();
            goalMode = false;
            if (btnSetGoal) {
                btnSetGoal.textContent = 'Set Goal (Click Map)';
                btnSetGoal.style.background = '';
            }
        });
    }

    // Button event listeners
    const btnClearMap = document.getElementById('btn-clear-map');
    if (btnClearMap) {
        btnClearMap.addEventListener('click', async () => {
            if (!confirm('Clear all internal walls? This cannot be undone.')) return;
            
            try {
                if (CLIENT_SIDE && slamEngine) {
                    // Client-side clear map
                    slamEngine.clearMap();
                    const state = slamEngine.getState();
                    robot = state.robot;
                    trueMap = state.true_map;
                    discoveredMap = state.discovered_map;
                    
                    if (robot.path_planning) {
                        goal = robot.path_planning.goal;
                        plannedPath = robot.path_planning.planned_path || [];
                    }
                    
                    render();
                    console.log('Client-side: Map cleared (all internal walls removed)');
                    return;
                }
                
                // Server-side clear map
                const response = await fetch(`${API_BASE_URL}/api/clear_map`, { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    robot = data.data.robot;
                    trueMap = data.data.true_map;
                    discoveredMap = data.data.discovered_map || [];
                    
                    // Extract goal and planned path from robot state
                    if (robot.path_planning) {
                        goal = robot.path_planning.goal;
                        plannedPath = robot.path_planning.planned_path || [];
                    }
                    
                    render();
                }
            } catch (error) {
                console.error('Error clearing map:', error);
            }
        });
    }

    const btnSaveMap = document.getElementById('btn-save-map');
    if (btnSaveMap) {
        btnSaveMap.addEventListener('click', async () => {
            if (CLIENT_SIDE && slamEngine) {
                alert('Client-side mode: Map saving is not supported.\nYour map exists only in this browser session.');
                console.log('Client-side mode does not support saving maps to files');
                return;
            }
            
            let filename = document.getElementById('map-filename').value.trim();
            
            if (!filename) {
                filename = prompt('Enter map name (without .json):');
                if (!filename) return;
                filename = filename.trim();
            }
            
            // Ensure it doesn't have .json extension (will be added by backend)
            filename = filename.replace('.json', '');
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/save_map`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`✅ Map saved as "${filename}.json"!`);
                    const filenameInput = document.getElementById('map-filename');
                    if (filenameInput) filenameInput.value = ''; // Clear input
                    loadMapList(); // Refresh map list
                } else {
                    alert(`❌ Error: ${data.message}`);
                }
            } catch (error) {
                console.error('Error saving map:', error);
                alert('❌ Failed to save map');
            }
        });
    }

    const btnLoadMap = document.getElementById('btn-load-map');
    if (btnLoadMap) {
        btnLoadMap.addEventListener('click', async () => {
            const filenameInput = document.getElementById('map-filename');
            let filename = filenameInput ? filenameInput.value.trim() : '';
            
            if (!filename) {
                filename = prompt('Enter map name to load (without .json):');
                if (!filename) return;
                filename = filename.trim();
            }
            
            // Ensure it doesn't have .json extension (will be added by backend)
            filename = filename.replace('.json', '');
            
            loadMapByName(filename);
        });
    }

    // Initial map list load
    loadMapList();
    
    // ========================================
    // Settings Controls
    // ========================================
    
    const mapSizeInput = document.getElementById('map-size-input');
    const mapSizeDisplay = document.getElementById('map-size-display');
    const sensorRangeInput = document.getElementById('sensor-range-input');
    const sensorRangeDisplay = document.getElementById('sensor-range-display');
    const btnApplySettings = document.getElementById('btn-apply-settings');
    
    // Update display values as sliders move
    if (mapSizeInput) {
        mapSizeInput.addEventListener('input', (e) => {
            const size = e.target.value;
            mapSizeDisplay.textContent = `${size}x${size}`;
        });
    }
    
    if (sensorRangeInput) {
        sensorRangeInput.addEventListener('input', (e) => {
            const range = e.target.value;
            if (range == 0) {
                sensorRangeDisplay.textContent = 'Infinite';
            } else {
                sensorRangeDisplay.textContent = `${range} cells`;
            }
        });
    }
    
    // Apply settings button
    if (btnApplySettings) {
        btnApplySettings.addEventListener('click', () => {
            if (!CLIENT_SIDE || !slamEngine) {
                alert('Settings are only available in client-side mode!');
                return;
            }
            
            const newMapSize = parseInt(mapSizeInput.value);
            const newSensorRange = parseInt(sensorRangeInput.value);
            
            // Confirm if changing map size
            if (newMapSize !== slamEngine.MAP_SIZE) {
                if (!confirm(`Changing grid size to ${newMapSize}x${newMapSize} will reset the map. Continue?`)) {
                    return;
                }
            }
            
            // Apply sensor range
            if (newSensorRange === 0) {
                slamEngine.setSensorRange(Infinity);
            } else {
                slamEngine.setSensorRange(newSensorRange);
            }
            
            // Apply map size (this will reset the map)
            if (newMapSize !== slamEngine.MAP_SIZE) {
                const success = slamEngine.setMapSize(newMapSize);
                if (success) {
                    // Reset discovered map
                    slamEngine.discoveredMap = new Array(newMapSize).fill(0).map(() => new Array(newMapSize).fill(0));
                    slamEngine.discoveredMap[slamEngine.robot.y][slamEngine.robot.x] = 1;
                    
                    // Update canvas sizes
                    const newCanvasSize = Math.max(600, Math.min(1000, newMapSize * 20));
                    canvas.width = newCanvasSize;
                    canvas.height = newCanvasSize;
                    discoveredCanvas.width = newCanvasSize;
                    discoveredCanvas.height = newCanvasSize;
                    
                    // Update grid size constant
                    window.CURRENT_GRID_SIZE = newMapSize;
                    
                    // Clear goals and paths
                    goal = null;
                    plannedPath = [];
                    stopAutoNavigation();
                    
                    alert(`✅ Settings applied!\n• Grid Size: ${newMapSize}x${newMapSize}\n• Sensor Range: ${newSensorRange === 0 ? 'Infinite' : newSensorRange + ' cells'}`);
                }
            } else {
                alert(`✅ Sensor range updated to: ${newSensorRange === 0 ? 'Infinite' : newSensorRange + ' cells'}`);
            }
            
            // Refresh state and render
            fetchAndRenderState();
        });
    }
    
    // Initialize settings from current engine state
    if (CLIENT_SIDE && slamEngine && mapSizeInput && sensorRangeInput) {
        mapSizeInput.value = slamEngine.MAP_SIZE;
        mapSizeDisplay.textContent = `${slamEngine.MAP_SIZE}x${slamEngine.MAP_SIZE}`;
        
        if (slamEngine.SENSOR_RANGE === Infinity) {
            sensorRangeInput.value = 0;
            sensorRangeDisplay.textContent = 'Infinite';
        } else {
            sensorRangeInput.value = slamEngine.SENSOR_RANGE;
            sensorRangeDisplay.textContent = `${slamEngine.SENSOR_RANGE} cells`;
        }
    }
    
    // ============================================
    // ADVANCED SENSOR CONFIGURATION
    // ============================================
    
    const visionModeSelect = document.getElementById('vision-mode-select');
    const visionModeDisplay = document.getElementById('vision-mode-display');
    const btnApplySensorConfig = document.getElementById('btn-apply-sensor-config');
    
    // List of all sensors
    const allSensors = ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left'];
    
    // Initialize sensor range sliders and display values
    allSensors.forEach(sensorName => {
        const rangeInput = document.getElementById(`sensor-${sensorName}-range`);
        const valueDisplay = document.getElementById(`sensor-${sensorName}-value`);
        const enableCheckbox = document.getElementById(`sensor-${sensorName}-enable`);
        
        if (rangeInput && valueDisplay) {
            // Update display as slider moves
            rangeInput.addEventListener('input', (e) => {
                const range = parseInt(e.target.value);
                if (range === 0) {
                    valueDisplay.textContent = '∞';
                } else {
                    valueDisplay.textContent = range.toString();
                }
            });
        }
        
        // When checkbox changes, automatically switch to custom mode
        if (enableCheckbox && visionModeSelect) {
            enableCheckbox.addEventListener('change', () => {
                visionModeSelect.value = 'custom';
                if (visionModeDisplay) {
                    visionModeDisplay.textContent = 'Custom';
                }
            });
        }
    });
    
    // Vision mode selection
    if (visionModeSelect) {
        visionModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            
            if (visionModeDisplay) {
                const modeNames = {
                    '360': '360°',
                    '270': '270°',
                    '180': '180°',
                    '90': '90°',
                    'custom': 'Custom'
                };
                visionModeDisplay.textContent = modeNames[mode] || mode;
            }
            
            // Update checkboxes based on mode
            if (mode !== 'custom') {
                const enabledSensors = {
                    '360': ['front', 'front_right', 'right', 'back_right', 'back', 'back_left', 'left', 'front_left'],
                    '270': ['front', 'front_right', 'right', 'left', 'front_left'],
                    '180': ['front', 'front_right', 'right', 'left', 'front_left'],
                    '90': ['front', 'front_right', 'front_left']
                };
                
                const enabled = enabledSensors[mode] || [];
                
                allSensors.forEach(sensorName => {
                    const checkbox = document.getElementById(`sensor-${sensorName}-enable`);
                    if (checkbox) {
                        checkbox.checked = enabled.includes(sensorName);
                    }
                });
            }
        });
    }
    
    // Apply sensor configuration button
    if (btnApplySensorConfig) {
        btnApplySensorConfig.addEventListener('click', () => {
            if (!CLIENT_SIDE || !slamEngine) {
                alert('Sensor configuration is only available in client-side mode!');
                return;
            }
            
            // Apply vision mode first
            if (visionModeSelect) {
                const mode = visionModeSelect.value;
                slamEngine.setVisionMode(mode);
            }
            
            // If custom mode, apply individual sensor settings
            if (!visionModeSelect || visionModeSelect.value === 'custom') {
                allSensors.forEach(sensorName => {
                    const rangeInput = document.getElementById(`sensor-${sensorName}-range`);
                    const enableCheckbox = document.getElementById(`sensor-${sensorName}-enable`);
                    
                    if (enableCheckbox) {
                        slamEngine.setSensorEnabled(sensorName, enableCheckbox.checked);
                    }
                    
                    if (rangeInput) {
                        const range = parseInt(rangeInput.value);
                        slamEngine.setIndividualSensorRange(sensorName, range === 0 ? Infinity : range);
                    }
                });
            } else {
                // For preset modes, apply ranges to all enabled sensors
                allSensors.forEach(sensorName => {
                    const rangeInput = document.getElementById(`sensor-${sensorName}-range`);
                    if (rangeInput) {
                        const range = parseInt(rangeInput.value);
                        slamEngine.setIndividualSensorRange(sensorName, range === 0 ? Infinity : range);
                    }
                });
            }
            
            // Get current vision mode for display
            const currentMode = slamEngine.getVisionMode();
            const enabledCount = Object.values(slamEngine.getSensorConfig()).filter(s => s.enabled).length;
            
            alert(`✅ Sensor configuration applied!\n• Vision Mode: ${currentMode.toUpperCase()}\n• Active Sensors: ${enabledCount}/8`);
            
            // Refresh state and render
            fetchAndRenderState();
        });
    }
    
    // Initialize sensor config from engine state
    if (CLIENT_SIDE && slamEngine) {
        const sensorConfig = slamEngine.getSensorConfig();
        
        allSensors.forEach(sensorName => {
            const config = sensorConfig[sensorName];
            if (config) {
                const enableCheckbox = document.getElementById(`sensor-${sensorName}-enable`);
                const rangeInput = document.getElementById(`sensor-${sensorName}-range`);
                const valueDisplay = document.getElementById(`sensor-${sensorName}-value`);
                
                if (enableCheckbox) {
                    enableCheckbox.checked = config.enabled;
                }
                
                if (rangeInput && valueDisplay) {
                    if (config.range === Infinity) {
                        rangeInput.value = 0;
                        valueDisplay.textContent = '∞';
                    } else {
                        rangeInput.value = config.range;
                        valueDisplay.textContent = config.range.toString();
                    }
                }
            }
        });
        
        // Set initial vision mode
        if (visionModeSelect && visionModeDisplay) {
            const currentMode = slamEngine.getVisionMode();
            visionModeSelect.value = currentMode;
            const modeNames = {
                '360': '360°',
                '270': '270°',
                '180': '180°',
                '90': '90°',
                'custom': 'Custom'
            };
            visionModeDisplay.textContent = modeNames[currentMode] || currentMode;
        }
    }
});
