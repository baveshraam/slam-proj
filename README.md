# Smart Wheelchair SLAM Simulation

This project is a fully client-side SLAM (Simultaneous Localization and Mapping) simulation for a smart wheelchair. It runs 100% in the browser—no backend required—and is ready for static deployment (e.g., Vercel).

## Features
- Customizable grid size and sensor range
- Individual sensor configuration and vision mode presets
- Real-time robot movement, path planning (A* algorithm), and map editing
- Modern UI with dual map views (true and discovered)
- No server dependencies

## Usage
1. Clone the repository:
	```sh
	git clone https://github.com/baveshraam/slam-proj.git
	```
2. Deploy to Vercel or any static hosting platform.
3. Open `index.html` in your browser to start the simulation.

## Files
- `index.html` — Main UI
- `style.css` — Styling
- `app.js` — UI logic and rendering
- `slam-engine.js` — SLAM engine and algorithms
- `config.js` — Client-side configuration
- `README.md` — Project info

## License
MIT
