# SLAM Simulation Backend

# SLAM Simulation 🤖

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://YOUR_USERNAME.github.io/SLAM-Proj/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Simultaneous Localization And Mapping** - Interactive visualization and simulation platform with dual deployment options (Flask + GitHub Pages)

## 🌟 Features

- **Real-time Robot Simulation** - WASD controls with smooth movement
- **Interactive Map Editor** - Click to toggle walls, create custom mazes  
- **Sensor Visualization** - See distance sensors in action
- **Map Persistence** - Save/load custom map configurations with custom names
- **Dual Deployment** - Flask backend OR static GitHub Pages version
- **Beautiful UI** - Modern glassmorphism design with animations

---

## 🚀 Quick Start

### Option 1: Flask Version (Full Features)

```bash
# Install dependencies
pip install flask flask-cors numpy

# Run server
python app.py

# Open browser
http://localhost:5000
```

### Option 2: Static Version (GitHub Pages)

The static version uses browser localStorage instead of a backend. Perfect for free hosting!

See **[GITHUB_PAGES.md](GITHUB_PAGES.md)** for deployment instructions.

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| <kbd>W</kbd> / <kbd>↑</kbd> | Move Forward |
| <kbd>S</kbd> / <kbd>↓</kbd> | Move Backward |
| <kbd>A</kbd> / <kbd>←</kbd> | Rotate Left |
| <kbd>D</kbd> / <kbd>→</kbd> | Rotate Right |
| <kbd>R</kbd> | Reset Position |
| <kbd>E</kbd> | Toggle Edit Mode |

---

## 🗺️ Map Editor

1. Press <kbd>E</kbd> to enable **Edit Mode** (canvas gets cyan border)
2. Click on grid cells to toggle walls/floors
3. Enter a custom map name (e.g., "my_maze") and click **Save Map**
4. Load saved maps from the dropdown list or enter name manually

### Saving Maps with Custom Names

**Flask Version:**
- Maps saved as JSON files in `maps/` folder with your custom name
- Example: Entering "office_layout" saves as `maps/office_layout.json`
- Persistent across sessions and shareable

**Static Version:**
- Maps saved in browser localStorage with your custom name
- Browser-specific storage (not shared between devices)
- Cleared if you clear browser data

### Environment Variables

- `PORT`: Server port (default: 5000)
- `FLASK_DEBUG`: Enable debug mode (default: True)

```cmd
set PORT=8080
set FLASK_DEBUG=False
python app.py
```

## API Endpoints

### GET `/api/get_state`
Get current simulation state including robot position and map.

**Response:**
```json
{
  "success": true,
  "data": {
    "robot": {
      "x": 1,
      "y": 1,
      "angle": 0
    },
    "true_map": [[1,1,1,...], ...],
    "map_info": {
      "width": 15,
      "height": 15,
      "total_cells": 225,
      "wall_cells": 55,
      "floor_cells": 170
    }
  }
}
```

### POST `/api/move`
Move robot forward one step in current direction.

**Response (Success):**
```json
{
  "success": true,
  "message": "Robot moved forward",
  "data": {"x": 2, "y": 1, "angle": 0}
}
```

**Response (Blocked):**
```json
{
  "success": false,
  "message": "Cannot move - wall or boundary ahead",
  "data": {"x": 1, "y": 1, "angle": 0}
}
```

### POST `/api/rotate_left`
Rotate robot 90° counter-clockwise.

### POST `/api/rotate_right`
Rotate robot 90° clockwise.

### POST `/api/reset`
Reset robot to initial position (1, 1) with angle 0°.

### GET `/api/map_info`
Get map statistics and information.

### GET `/health`
Health check endpoint.

## Robot Angles

- **0°**: East (→)
- **90°**: North (↑)
- **180°**: West (←)
- **270°**: South (↓)

## Map Structure

- `0`: Floor (walkable)
- `1`: Wall (blocked)
- 15x15 grid with borders and internal walls

## Testing with curl

```cmd
REM Get current state
curl http://localhost:5000/api/get_state

REM Move forward
curl -X POST http://localhost:5000/api/move

REM Rotate left
curl -X POST http://localhost:5000/api/rotate_left

REM Reset robot
curl -X POST http://localhost:5000/api/reset

REM Check health
curl http://localhost:5000/health
```

## Code Structure

- **Robot Class**: Encapsulates robot state and movement logic
- **Validation**: Position and collision checking
- **Error Handling**: Proper HTTP status codes and error messages
- **Type Hints**: Full type annotations for better IDE support
- **Configuration**: Environment-based settings

## Frontend Visualization

### Quick Start

1. **Start the backend server** (in one terminal):
   ```cmd
   python app.py
   ```

2. **Open the frontend** (in your browser):
   - Simply open `index.html` in your web browser
   - Or use Python's built-in server:
     ```cmd
     python -m http.server 8000
     ```
     Then visit: http://localhost:8000

The visualization will automatically connect to the Flask backend at `http://127.0.0.1:5000` and display:
- **15x15 grid map** with walls (dark) and floors (light)
- **Robot position** as a red circle with direction indicator
- **Real-time updates** as you control the robot

### Controls (Coming Soon)
- **W / ↑**: Move forward
- **A / ←**: Rotate left
- **D / →**: Rotate right
- **S / ↓**: Move backward
- **R**: Reset to start

## Development

### Run Tests

```cmd
pytest
```

### Project Structure

```
SLAM-Proj/
├── app.py              # Main Flask application
├── index.html          # Frontend HTML
├── style.css           # Frontend styles
├── app.js              # Frontend JavaScript
├── test_app.py         # Unit tests
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Future Enhancements

- [ ] Sensor simulation (LIDAR, sonar)
- [ ] Particle filter for SLAM
- [ ] Path planning algorithms
- [ ] Map saving/loading
- [ ] Multiple robot support
- [ ] WebSocket for real-time updates
- [ ] Visualization dashboard

## License

MIT
