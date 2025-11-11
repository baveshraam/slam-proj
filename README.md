# 🤖 Smart Wheelchair SLAM Simulation# SLAM Simulation Backend



A real-time **Simultaneous Localization and Mapping (SLAM)** simulation for autonomous wheelchair navigation. Features include sensor-based mapping, A* pathfinding, and interactive visualization.# SLAM Simulation 🤖



🔗 **Live Demo**: [slam-proj.vercel.app](https://slam-proj.vercel.app)[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://YOUR_USERNAME.github.io/SLAM-Proj/)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **⚠️ Backend Required**: The Vercel site shows "Disconnected" because the backend isn't deployed yet. See [DEPLOYMENT.md](DEPLOYMENT.md) for 5-minute setup!

> **Simultaneous Localization And Mapping** - Interactive visualization and simulation platform with dual deployment options (Flask + GitHub Pages)

---

## 🌟 Features

## ✨ Features

- **Real-time Robot Simulation** - WASD controls with smooth movement

- **🗺️ Dual Map View**: True map vs. Discovered map (realistic SLAM)- **Interactive Map Editor** - Click to toggle walls, create custom mazes  

- **📡 Distance Sensors**: 8-directional ray-casting- **Sensor Visualization** - See distance sensors in action

- **🎯 A* Pathfinding**: Optimal path planning through discovered areas- **Map Persistence** - Save/load custom map configurations with custom names

- **🤖 Auto-Navigation**: Autonomous goal-seeking- **Dual Deployment** - Flask backend OR static GitHub Pages version

- **🎨 Map Editor**: Interactive wall editing- **Beautiful UI** - Modern glassmorphism design with animations

- **📊 Odometry**: Position, distance, path tracking

- **💾 Save/Load**: Persistent map configurations---



---## 🚀 Quick Start



## 🚀 Quick Start (5 minutes)### Option 1: Flask Version (Full Features)



### Option 1: Deploy Online (Recommended)```bash

# Install dependencies

1. **Deploy Backend** (Free on Render.com):pip install flask flask-cors numpy

   - Go to [render.com](https://render.com) → New Web Service

   - Connect `baveshraam/slam-proj` repository# Run server

   - Wait 5 mins for deploymentpython app.py

   - Copy your backend URL

# Open browser

2. **Update Frontend**:http://localhost:5000

   - Edit `config.js`: Change URL to your backend```

   - Push to GitHub → Vercel auto-deploys

### Option 2: Static Version (GitHub Pages)

✅ **Done!** Visit your Vercel URL and it works!

The static version uses browser localStorage instead of a backend. Perfect for free hosting!

📖 Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)

See **[GITHUB_PAGES.md](GITHUB_PAGES.md)** for deployment instructions.

### Option 2: Run Locally

---

```bash

git clone https://github.com/baveshraam/slam-proj.git## 🎮 Controls

cd slam-proj

pip install -r requirements.txt| Key | Action |

python app.py|-----|--------|

# Visit http://localhost:5000| <kbd>W</kbd> / <kbd>↑</kbd> | Move Forward |

```| <kbd>S</kbd> / <kbd>↓</kbd> | Move Backward |

| <kbd>A</kbd> / <kbd>←</kbd> | Rotate Left |

---| <kbd>D</kbd> / <kbd>→</kbd> | Rotate Right |

| <kbd>R</kbd> | Reset Position |

## 🎮 Controls| <kbd>E</kbd> | Toggle Edit Mode |



| Key | Action | Key | Action |---

|-----|--------|-----|--------|

| `W` / `↑` | Move Forward | `A` / `←` | Rotate Left |## 🗺️ Map Editor

| `S` / `↓` | Move Backward | `D` / `→` | Rotate Right |

| `R` | Reset | `E` | Edit Mode |1. Press <kbd>E</kbd> to enable **Edit Mode** (canvas gets cyan border)

2. Click on grid cells to toggle walls/floors

**Path Planning**: Click "Set Goal" → Click map → "Auto Navigate"  3. Enter a custom map name (e.g., "my_maze") and click **Save Map**

**Map Editor**: Press `E` → Click cells to toggle walls4. Load saved maps from the dropdown list or enter name manually



---### Saving Maps with Custom Names



## 🏗️ Architecture**Flask Version:**

- Maps saved as JSON files in `maps/` folder with your custom name

```- Example: Entering "office_layout" saves as `maps/office_layout.json`

Frontend (Vercel)          Backend (Render)- Persistent across sessions and shareable

┌──────────────┐          ┌──────────────┐

│ HTML/CSS/JS  │◄────────►│ Flask/Python │**Static Version:**

│ Rendering    │   HTTP   │ Robot Logic  │- Maps saved in browser localStorage with your custom name

│ User Input   │          │ A* Search    │- Browser-specific storage (not shared between devices)

└──────────────┘          └──────────────┘- Cleared if you clear browser data

```

### Environment Variables

---

- `PORT`: Server port (default: 5000)

## 📁 Key Files- `FLASK_DEBUG`: Enable debug mode (default: True)



- `app.py` - Flask backend (robot simulation, pathfinding)```cmd

- `app.js` - Frontend (rendering, UI controls)set PORT=8080

- `config.js` - Backend URL configurationset FLASK_DEBUG=False

- `DEPLOYMENT.md` - Deployment instructionspython app.py

```

---

## API Endpoints

## 🔧 Tech Stack

### GET `/api/get_state`

**Backend**: Flask, NumPy, Python 3.11+  Get current simulation state including robot position and map.

**Frontend**: Vanilla JS, HTML5 Canvas, CSS3  

**Hosting**: Vercel (frontend) + Render (backend)**Response:**

```json

---{

  "success": true,

## 📊 SLAM Implementation  "data": {

    "robot": {

✅ **Stage 1**: 50x50 grid + 8 sensors        "x": 1,

✅ **Stage 2**: Discovered map tracking        "y": 1,

✅ **Stage 3**: Dual visualization        "angle": 0

✅ **Stage 4**: Odometry tracking      },

✅ **Stage 5**: A* pathfinding      "true_map": [[1,1,1,...], ...],

✅ **Stage 6**: Auto-navigation      "map_info": {

      "width": 15,

---      "height": 15,

      "total_cells": 225,

## 🐛 Troubleshooting      "wall_cells": 55,

      "floor_cells": 170

**"Disconnected" on Vercel?**      }

→ Backend not deployed. Follow [DEPLOYMENT.md](DEPLOYMENT.md)  }

}

**Slow first load on Render?**  ```

→ Free tier sleeps after 15 min (30-60s wake time)

### POST `/api/move`

**CORS errors?**  Move robot forward one step in current direction.

→ Check `config.js` has correct backend URL

**Response (Success):**

---```json

{

## 👤 Author  "success": true,

  "message": "Robot moved forward",

**Bavesh Raam**    "data": {"x": 2, "y": 1, "angle": 0}

GitHub: [@baveshraam](https://github.com/baveshraam)}

```

---

**Response (Blocked):**

## 📝 License```json

{

MIT License  "success": false,

  "message": "Cannot move - wall or boundary ahead",

---  "data": {"x": 1, "y": 1, "angle": 0}

}

**⭐ Star this repo if helpful!** | 📖 [Full Deployment Guide](DEPLOYMENT.md)```


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
