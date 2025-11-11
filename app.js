// API Configuration
// For production, set BACKEND_URL in your environment or use the prompt
const API_BASE_URL = window.BACKEND_URL || 'http://127.0.0.1:5000';

document.addEventListener('DOMContentLoaded', () => {
    // Get canvases and contexts
    const canvas = document.getElementById('slamCanvas');
    const ctx = canvas.getContext('2d');
    const discoveredCanvas = document.getElementById('discoveredCanvas');
    const discoveredCtx = discoveredCanvas.getContext('2d');

    // Visual constants - Updated for 50x50 grid
    const GRID_SIZE = 50; // Changed from 15 to 50
    const CELL_SIZE = 20; // Changed from 12 to 20 (1000/50 = 20px per cell)
    const COLOR_FLOOR = '#f0f0f0';
    const COLOR_WALL = '#1a1f2e';
    const COLOR_WALL_BORDER = '#2d3548';
    const COLOR_ROBOT = '#e94560';
    const COLOR_ROBOT_GLOW = 'rgba(233, 69, 96, 0.4)';
    const COLOR_DIRECTION = '#4a90e2';
    const COLOR_GRID = 'rgba(74, 144, 226, 0.1)';
    const ROBOT_SIZE = 12; // Increased from 8 for better visibility
    
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
        for (let x = 0; x <= 15; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, 600);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= 15; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(600, y * CELL_SIZE);
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
            const angle = sensorAngles[sensorName];
            if (angle === undefined) return;
            
            const rad = angle * (Math.PI / 180);
            const endX = robotPixelX + Math.cos(rad) * distance * CELL_SIZE;
            const endY = robotPixelY - Math.sin(rad) * distance * CELL_SIZE;
            
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
        
        if (goal) {
            pathStatus.textContent = `Goal: (${goal.x}, ${goal.y})`;
            pathStatus.style.color = '#4ade80';
            
            if (plannedPath && plannedPath.length > 0) {
                pathLength.textContent = plannedPath.length;
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
        if (!sensors || Object.keys(sensors).length === 0) {
            sensorDisplay.innerHTML = '<p class="placeholder">No sensor data</p>';
            return;
        }
        
        // Create sensor grid display
        let html = '<div class="sensor-grid">';
        
        // Main sensors (cardinal directions)
        const mainSensors = ['front', 'left', 'right', 'back'];
        mainSensors.forEach(sensor => {
            const distance = sensors[sensor] || 0;
            const icon = getSensorIcon(sensor);
            html += `
                <div class="sensor-item">
                    <span class="sensor-icon">${icon}</span>
                    <span class="sensor-name">${sensor}</span>
                    <span class="sensor-value">${distance}</span>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Diagonal sensors (smaller display)
        html += '<div class="sensor-grid-small">';
        const diagonalSensors = ['front_left', 'front_right', 'back_left', 'back_right'];
        diagonalSensors.forEach(sensor => {
            const distance = sensors[sensor] || 0;
            html += `
                <div class="sensor-item-small">
                    <span>${sensor.replace('_', ' ')}: ${distance}</span>
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
            statusText.textContent = 'Connected';
            statusText.style.color = '#4ade80';
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
     * Fetch game state from backend and render
     */
    async function fetchAndRenderState() {
        try {
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
     * Send movement command to backend
     */
    async function sendMoveCommand(command) {
        try {
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
    
    // Refresh state every 2 seconds
    setInterval(fetchAndRenderState, 2000);
    
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
                    fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' })
                        .then(() => fetchAndRenderState())
                        .catch(err => console.error('Reset failed:', err));
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
            btnSetGoal.textContent = 'Set Goal (Click Map)';
            btnSetGoal.style.background = '';
        });
    }

    // Button event listeners
    document.getElementById('btn-clear-map').addEventListener('click', async () => {
        if (!confirm('Clear all internal walls? This cannot be undone.')) return;
        
        try {
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

    document.getElementById('btn-save-map').addEventListener('click', async () => {
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
                document.getElementById('map-filename').value = ''; // Clear input
                loadMapList(); // Refresh map list
            } else {
                alert(`❌ Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error saving map:', error);
            alert('❌ Failed to save map');
        }
    });

    document.getElementById('btn-load-map').addEventListener('click', async () => {
        let filename = document.getElementById('map-filename').value.trim();
        
        if (!filename) {
            filename = prompt('Enter map name to load (without .json):');
            if (!filename) return;
            filename = filename.trim();
        }
        
        // Ensure it doesn't have .json extension (will be added by backend)
        filename = filename.replace('.json', '');
        
        loadMapByName(filename);
    });

    // Initial map list load
    loadMapList();
});
