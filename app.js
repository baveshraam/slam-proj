// API Configuration
const API_BASE_URL = 'http://127.0.0.1:5000';

document.addEventListener('DOMContentLoaded', () => {
    // Get canvas and context
    const canvas = document.getElementById('slamCanvas');
    const ctx = canvas.getContext('2d');

    // Visual constants
    const CELL_SIZE = 40; // 15 cells * 40px = 600px
    const COLOR_FLOOR = '#f0f0f0';
    const COLOR_WALL = '#1a1f2e';
    const COLOR_WALL_BORDER = '#2d3548';
    const COLOR_ROBOT = '#e94560';
    const COLOR_ROBOT_GLOW = 'rgba(233, 69, 96, 0.4)';
    const COLOR_DIRECTION = '#4a90e2';
    const COLOR_GRID = 'rgba(74, 144, 226, 0.1)';
    const ROBOT_SIZE = 12;

    // Game state
    let robot = { x: 1, y: 1, angle: 0 };
    let trueMap = [];
    let isConnected = false;
    let editMode = false;

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
     * Draw the robot with enhanced visuals
     */
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
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw everything
        drawGrid();
        drawMap();
        drawRobot();
        updateUI();
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
                
                // Update connection status
                updateConnectionStatus(true);
                
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
            
            // Re-render the scene
            render();
        } catch (error) {
            console.error('Error sending move command:', error);
        }
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
     * Handle canvas click for map editing
     */
    canvas.addEventListener('click', async (event) => {
        if (!editMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Convert pixel coordinates to grid coordinates
        const gridX = Math.floor(clickX / CELL_SIZE);
        const gridY = Math.floor(clickY / CELL_SIZE);
        
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
                render();
            } else {
                console.log('Cannot toggle:', data.message);
            }
        } catch (error) {
            console.error('Error toggling cell:', error);
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

    // Button event listeners
    document.getElementById('btn-clear-map').addEventListener('click', async () => {
        if (!confirm('Clear all internal walls? This cannot be undone.')) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/clear_map`, { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                robot = data.data.robot;
                trueMap = data.data.true_map;
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
