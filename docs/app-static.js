// SLAM Simulation - Static Version (GitHub Pages)
// Uses localStorage for map persistence

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Configuration - Updated for 50x50 grid with larger canvas
const GRID_SIZE = 50; // Changed from 15 to 50
const CELL_SIZE = canvas.width / GRID_SIZE; // 1000/50 = 20px per cell

// Robot state
let robot = {
    x: 1,
    y: 1,
    angle: 0,
    initialX: 1,
    initialY: 1,
    initialAngle: 0
};

// Map state (0 = floor, 1 = wall)
let trueMap = createEmptyMap();

// Edit mode
let editMode = false;

// Direction vectors
const DIRECTIONS = {
    0: { dx: 0, dy: -1 },    // North
    90: { dx: 1, dy: 0 },    // East
    180: { dx: 0, dy: 1 },   // South
    270: { dx: -1, dy: 0 }   // West
};

// Initialize
function createEmptyMap() {
    const map = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    
    // Add borders
    for (let i = 0; i < GRID_SIZE; i++) {
        map[0][i] = 1;              // Top
        map[GRID_SIZE - 1][i] = 1;  // Bottom
        map[i][0] = 1;              // Left
        map[i][GRID_SIZE - 1] = 1;  // Right
    }
    
    return map;
}

function isValidPosition(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    return trueMap[y][x] === 0;
}

function moveForward() {
    const dir = DIRECTIONS[robot.angle];
    const newX = robot.x + dir.dx;
    const newY = robot.y + dir.dy;
    
    if (isValidPosition(newX, newY)) {
        robot.x = newX;
        robot.y = newY;
        return true;
    }
    return false;
}

function moveBackward() {
    const dir = DIRECTIONS[robot.angle];
    const newX = robot.x - dir.dx;
    const newY = robot.y - dir.dy;
    
    if (isValidPosition(newX, newY)) {
        robot.x = newX;
        robot.y = newY;
        return true;
    }
    return false;
}

function rotateLeft() {
    robot.angle = (robot.angle - 90 + 360) % 360;
}

function rotateRight() {
    robot.angle = (robot.angle + 90) % 360;
}

function resetRobot() {
    robot.x = robot.initialX;
    robot.y = robot.initialY;
    robot.angle = robot.initialAngle;
}

function getSensorReadings() {
    const readings = { front: 0, left: 0, right: 0 };
    
    // Front sensor
    const frontDir = DIRECTIONS[robot.angle];
    let dist = 0;
    let x = robot.x, y = robot.y;
    while (isValidPosition(x + frontDir.dx, y + frontDir.dy)) {
        x += frontDir.dx;
        y += frontDir.dy;
        dist++;
    }
    readings.front = dist;
    
    // Left sensor
    const leftAngle = (robot.angle - 90 + 360) % 360;
    const leftDir = DIRECTIONS[leftAngle];
    dist = 0;
    x = robot.x; y = robot.y;
    while (isValidPosition(x + leftDir.dx, y + leftDir.dy)) {
        x += leftDir.dx;
        y += leftDir.dy;
        dist++;
    }
    readings.left = dist;
    
    // Right sensor
    const rightAngle = (robot.angle + 90) % 360;
    const rightDir = DIRECTIONS[rightAngle];
    dist = 0;
    x = robot.x; y = robot.y;
    while (isValidPosition(x + rightDir.dx, y + rightDir.dy)) {
        x += rightDir.dx;
        y += rightDir.dy;
        dist++;
    }
    readings.right = dist;
    
    return readings;
}

// Drawing functions
function drawMap() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (trueMap[y][x] === 1) {
                // Wall
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = '#0f0f1e';
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            } else {
                // Floor
                ctx.fillStyle = '#0f3460';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = '#16213e';
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function drawRobot() {
    const centerX = robot.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = robot.y * CELL_SIZE + CELL_SIZE / 2;
    const radius = CELL_SIZE / 3;
    
    // Glow effect
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
    gradient.addColorStop(0, 'rgba(232, 65, 24, 0.6)');
    gradient.addColorStop(1, 'rgba(232, 65, 24, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Robot body
    ctx.fillStyle = '#e84118';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const angle = (robot.angle - 90) * Math.PI / 180;
    const lineLength = radius * 0.8;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
        centerX + Math.cos(angle) * lineLength,
        centerY + Math.sin(angle) * lineLength
    );
    ctx.stroke();
    ctx.lineWidth = 1;
}

function updateUI() {
    document.getElementById('position').textContent = `(${robot.x}, ${robot.y})`;
    document.getElementById('angle').textContent = `${robot.angle}°`;
    
    const sensors = getSensorReadings();
    document.getElementById('sensor-front').textContent = sensors.front;
    document.getElementById('sensor-left').textContent = sensors.left;
    document.getElementById('sensor-right').textContent = sensors.right;
    
    document.getElementById('edit-mode-status').innerHTML = 
        `Edit Mode: <strong>${editMode ? 'ON' : 'OFF'}</strong>`;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawRobot();
    updateUI();
}

// Map storage functions
function saveMapToStorage(name) {
    const mapData = {
        size: GRID_SIZE,
        map: trueMap,
        robot_start: {
            x: robot.initialX,
            y: robot.initialY,
            angle: robot.initialAngle
        },
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`slam_map_${name}`, JSON.stringify(mapData));
    
    // Update map list
    const mapList = getMapList();
    if (!mapList.includes(name)) {
        mapList.push(name);
        localStorage.setItem('slam_map_list', JSON.stringify(mapList));
    }
}

function loadMapFromStorage(name) {
    const data = localStorage.getItem(`slam_map_${name}`);
    if (!data) return false;
    
    const mapData = JSON.parse(data);
    trueMap = mapData.map;
    
    if (mapData.robot_start) {
        robot.initialX = mapData.robot_start.x;
        robot.initialY = mapData.robot_start.y;
        robot.initialAngle = mapData.robot_start.angle;
        resetRobot();
    }
    
    return true;
}

function getMapList() {
    const list = localStorage.getItem('slam_map_list');
    return list ? JSON.parse(list) : [];
}

function deleteMapFromStorage(name) {
    localStorage.removeItem(`slam_map_${name}`);
    const mapList = getMapList();
    const index = mapList.indexOf(name);
    if (index > -1) {
        mapList.splice(index, 1);
        localStorage.setItem('slam_map_list', JSON.stringify(mapList));
    }
}

function updateMapListUI() {
    const mapListEl = document.getElementById('map-list');
    const maps = getMapList();
    
    if (maps.length === 0) {
        mapListEl.innerHTML = '<p style="color: #888; font-size: 0.9em;">No saved maps</p>';
        return;
    }
    
    mapListEl.innerHTML = '<div style="margin-top: 10px;"><strong>Saved Maps:</strong></div>';
    maps.forEach(name => {
        const item = document.createElement('div');
        item.className = 'map-list-item';
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.05); border-radius: 4px;';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.cursor = 'pointer';
        nameSpan.onclick = () => {
            if (loadMapFromStorage(name)) {
                alert(`✅ Loaded map: ${name}`);
                render();
            }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cssText = 'background: rgba(231, 76, 60, 0.2); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete map "${name}"?`)) {
                deleteMapFromStorage(name);
                updateMapListUI();
            }
        };
        
        item.appendChild(nameSpan);
        item.appendChild(deleteBtn);
        mapListEl.appendChild(item);
    });
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    
    if (key === 'w' || key === 'arrowup') {
        e.preventDefault();
        moveForward();
        render();
    } else if (key === 's' || key === 'arrowdown') {
        e.preventDefault();
        moveBackward();
        render();
    } else if (key === 'a' || key === 'arrowleft') {
        e.preventDefault();
        rotateLeft();
        render();
    } else if (key === 'd' || key === 'arrowright') {
        e.preventDefault();
        rotateRight();
        render();
    } else if (key === 'r') {
        e.preventDefault();
        resetRobot();
        render();
    } else if (key === 'e') {
        e.preventDefault();
        editMode = !editMode;
        canvas.classList.toggle('edit-mode', editMode);
        render();
    }
});

canvas.addEventListener('click', (e) => {
    if (!editMode) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    
    // Don't allow editing borders or robot position
    if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) return;
    if (x === robot.x && y === robot.y) return;
    
    trueMap[y][x] = trueMap[y][x] === 0 ? 1 : 0;
    render();
});

document.getElementById('btn-clear-map').addEventListener('click', () => {
    if (!confirm('Clear all internal walls? This cannot be undone.')) return;
    
    trueMap = createEmptyMap();
    render();
});

document.getElementById('btn-save-map').addEventListener('click', () => {
    let filename = document.getElementById('map-filename').value.trim();
    
    if (!filename) {
        filename = prompt('Enter map name:');
        if (!filename) return;
        filename = filename.trim();
    }
    
    saveMapToStorage(filename);
    alert(`✅ Map saved as "${filename}"!`);
    document.getElementById('map-filename').value = '';
    updateMapListUI();
});

document.getElementById('btn-load-map').addEventListener('click', () => {
    let filename = document.getElementById('map-filename').value.trim();
    
    if (!filename) {
        filename = prompt('Enter map name to load:');
        if (!filename) return;
        filename = filename.trim();
    }
    
    if (loadMapFromStorage(filename)) {
        alert(`✅ Loaded map: ${filename}`);
        render();
    } else {
        alert(`❌ Map "${filename}" not found`);
    }
});

// Load example map on first visit
if (getMapList().length === 0) {
    // Create example maze
    const exampleMap = createEmptyMap();
    // Add some walls
    for (let i = 3; i < 12; i++) {
        exampleMap[5][i] = 1;
        exampleMap[10][i] = 1;
    }
    for (let i = 5; i < 11; i++) {
        exampleMap[i][3] = 1;
        exampleMap[i][12] = 1;
    }
    trueMap = exampleMap;
    saveMapToStorage('example_maze');
}

// Initialize
updateMapListUI();
render();
