# Smart Wheelchair SLAM Simulation 🤖

A fully client-side SLAM (Simultaneous Localization and Mapping) simulation for a smart wheelchair. Built with vanilla JavaScript—no frameworks, no backend, no dependencies. Runs entirely in your browser!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/baveshraam/slam-proj)

## ✨ Features

### Core Functionality
- **Real-time SLAM**: Simultaneous Localization and Mapping with dynamic discovery
- **Dual Map Views**: True map (omniscient view) and discovered map (robot's perspective)
- **A* Path Planning**: Intelligent pathfinding with automatic navigation
- **Interactive Map Editor**: Click to add/remove walls, design custom environments
- **Path History**: Visual trail showing robot's complete journey

### Advanced Controls
- **Customizable Grid Size**: Adjustable from 10x10 to 100x100 cells
- **Sensor Configuration**: 8-directional sensors with individual range control
- **Vision Mode Presets**:
  - 360° - All sensors active (omnidirectional)
  - 270° - No rear sensors (forward-focused)
  - 180° - Front hemisphere only
  - 90° - Front cone only
  - Custom - Manual sensor configuration
- **Real-time Odometry**: Track moves, rotations, distance traveled, and path points

### Visual Features
- Modern dark-themed UI with glass-morphism design
- Animated sensor rays showing distance readings
- Glowing robot with directional indicator
- Planned path visualization with A* algorithm
- Grid overlay with origin markers
- Smooth animations and transitions

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move Forward |
| `S` / `↓` | Move Backward |
| `A` / `←` | Rotate Left |
| `D` / `→` | Rotate Right |
| `R` | Reset Robot Position |
| `E` | Toggle Edit Mode |

## 🚀 Quick Start

### Option 1: Deploy to Vercel (Recommended)
1. Click the "Deploy with Vercel" button above
2. Fork the repository
3. Deploy instantly - no configuration needed!

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/baveshraam/slam-proj.git
cd slam-proj

# Open index.html in your browser
# No build process, no npm install, no server needed!
# Simply double-click index.html or use:
start index.html  # Windows
open index.html   # macOS
xdg-open index.html  # Linux
```

### Option 3: Deploy to Other Platforms
Works with any static hosting:
- GitHub Pages
- Netlify
- Cloudflare Pages
- Surge
- Any web server (Apache, Nginx, etc.)

## 📁 Project Structure

```
slam-proj/
├── index.html          # Main UI structure
├── style.css           # Modern dark theme styling
├── app.js              # UI logic, rendering, event handlers
├── slam-engine.js      # SLAM algorithms (A*, sensors, mapping)
├── config.js           # Client-side configuration
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## 🎯 How to Use

### Basic Navigation
1. **Move the Robot**: Use WASD or arrow keys to navigate
2. **Observe Discovery**: Watch as the robot discovers the environment
3. **View Sensor Data**: Real-time sensor readings shown in the info panel

### Path Planning
1. **Set Goal**: Click "Set Goal" button, then click anywhere on the map
2. **View Path**: A* algorithm computes the optimal path (orange dashed line)
3. **Auto-Navigate**: Click "Auto Navigate" to follow the path automatically
4. **Clear Goal**: Remove goal and planned path

### Map Editing
1. **Toggle Edit Mode**: Press `E` or click "Toggle Edit Mode"
2. **Edit Map**: Click cells to add/remove walls
3. **Save Map**: (Note: Map saving only works in server mode, not in client-side)
4. **Clear Map**: Remove all internal walls (borders remain)

### Customization
1. **Adjust Grid Size**: Slider from 10x10 to 100x100 (resets map)
2. **Set Sensor Range**: Global range control (0 = infinite)
3. **Configure Sensors**: Individual enable/disable and range per sensor
4. **Vision Modes**: Quick presets for common sensor configurations

## 🔧 Technical Details

### Technologies
- **Pure JavaScript** (ES6+) - No frameworks or libraries
- **HTML5 Canvas** - High-performance rendering
- **CSS3** - Modern styling with animations

### Algorithms
- **A* Pathfinding**: Optimal path computation with heuristic search
- **Ray Casting**: Sensor simulation with distance detection
- **Grid-based Mapping**: Discrete environment representation
- **Odometry Tracking**: Position and movement history

### Performance
- **Client-Side Only**: Zero server latency
- **Efficient Rendering**: Double-buffered canvas
- **Responsive Design**: Adapts to different screen sizes
- **Optimized Pathfinding**: Efficient A* implementation

## 🌐 Deployment

### Vercel Configuration
The included `vercel.json` configures the project as a static site:
```json
{
  "buildCommand": null,
  "outputDirectory": ".",
  "framework": null,
  "installCommand": null
}
```

### Environment Variables
None required! Everything runs client-side.

## 🎨 Customization

### Modify Map Size
Edit `slam-engine.js`:
```javascript
constructor(mapSize = 50, sensorRange = Infinity) {
    this.MAP_SIZE = mapSize; // Change default here
    // ...
}
```

### Change Colors
Edit `style.css`:
```css
:root {
    --color-robot: #e94560;
    --color-direction: #4a90e2;
    --color-floor: #f0f0f0;
    /* ... customize colors */
}
```

### Add Custom Maps
Edit `createDefaultMap()` in `slam-engine.js` to design your own maze.

## 📊 Features Breakdown

| Feature | Description | Status |
|---------|-------------|--------|
| Real-time SLAM | Simultaneous localization and mapping | ✅ |
| A* Pathfinding | Optimal path planning | ✅ |
| Sensor Simulation | 8-directional distance sensors | ✅ |
| Map Editor | Interactive wall placement | ✅ |
| Auto-Navigation | Follow computed paths | ✅ |
| Custom Grid Size | 10x10 to 100x100 | ✅ |
| Vision Modes | 360°, 270°, 180°, 90°, Custom | ✅ |
| Individual Sensors | Per-sensor enable/range control | ✅ |
| Odometry | Position, distance, move tracking | ✅ |
| Path History | Visual trail of robot movement | ✅ |
| Dual Map Views | True vs. discovered maps | ✅ |
| Mobile Support | Touch controls | 🔜 |
| Map Templates | Predefined mazes | 🔜 |

## 🐛 Troubleshooting

### Deployment Issues
- **404 Not Found**: Ensure `vercel.json` is present and configured correctly
- **Build Failed**: Make sure no Python files exist; this is a static site only

### Runtime Issues
- **Blank Screen**: Check browser console for errors; ensure JavaScript is enabled
- **Slow Performance**: Reduce grid size or sensor range for better performance
- **Path Not Found**: Goal might be unreachable; try discovering more of the map first

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - Feel free to use this project for learning, teaching, or commercial purposes.

## 🙏 Acknowledgments

Built with ❤️ for robotics education and SLAM visualization.

---

**Live Demo**: [slam-proj.vercel.app](https://slam-proj.vercel.app)  
**Repository**: [github.com/baveshraam/slam-proj](https://github.com/baveshraam/slam-proj)