# 🎮 SLAM Simulation - Movement Controls Testing Guide

## ✅ What's Been Added

### Backend Updates (app.py)
1. **Unified Movement Endpoint**: `POST /api/move`
   - Accepts commands: `move_forward`, `rotate_left`, `rotate_right`
   - Returns full game state after each action
   - Includes collision detection (won't move into walls)

2. **Command Processing**
   ```python
   {
       "command": "move_forward" | "rotate_left" | "rotate_right"
   }
   ```

3. **Robot Class Methods** (Already Implemented)
   - `move_forward()` - Moves in current direction, returns True/False
   - `rotate_left()` - Rotates 90° counter-clockwise
   - `rotate_right()` - Rotates 90° clockwise
   - Collision detection via `is_valid_position()`

### Frontend Updates (app.js)
1. **API Configuration**
   ```javascript
   const API_BASE_URL = 'http://127.0.0.1:5000';
   ```

2. **Movement Command Function**
   ```javascript
   sendMoveCommand(command) - Sends POST to /api/move
   ```

3. **Keyboard Controls**
   - **W / ↑** → Move Forward
   - **A / ←** → Rotate Left
   - **D / →** → Rotate Right
   - **S / ↓** → Turn Around (double rotate)
   - **R** → Reset to Start

## 🚀 How to Test

### Step 1: Start Backend
```cmd
cd c:\Bavesh\Takumi\SLAM-Proj
python app.py
```

**Expected Output:**
```
Starting SLAM Simulation Backend on port 5000
Debug mode: True
Map size: 15x15
Robot starting position: (1, 1), angle: 0°

Available endpoints:
  GET  /api/get_state   - Get current simulation state
  POST /api/move        - Move robot forward
  ...
```

### Step 2: Open Frontend
- Double-click `index.html`
- OR use: `python -m http.server 8000` → http://localhost:8000

### Step 3: Test Keyboard Controls

#### Basic Movement
1. **Press W or ↑** - Robot moves East (right)
2. **Press A or ←** - Robot rotates to face North (up)
3. **Press W or ↑** - Robot moves North (up)
4. **Press D or →** - Robot rotates to face East (right)
5. **Press R** - Robot resets to (1, 1)

#### Test Collision Detection
1. Navigate robot to a wall
2. Press W to move into wall
3. Robot should NOT move (collision detected)
4. Position stays the same

#### Test Rotation
1. Press A four times → Full 360° rotation (0° → 90° → 180° → 270° → 0°)
2. Press D four times → Full 360° rotation opposite direction

#### Test S Key (Turn Around)
1. Start at angle 0° (East)
2. Press S once
3. Robot should rotate to 180° (West) after brief delay

## 🧪 Testing with curl (Alternative)

### Move Forward
```cmd
curl -X POST http://localhost:5000/api/move -H "Content-Type: application/json" -d "{\"command\":\"move_forward\"}"
```

### Rotate Left
```cmd
curl -X POST http://localhost:5000/api/move -H "Content-Type: application/json" -d "{\"command\":\"rotate_left\"}"
```

### Rotate Right
```cmd
curl -X POST http://localhost:5000/api/move -H "Content-Type: application/json" -d "{\"command\":\"rotate_right\"}"
```

### Invalid Command (Should return error)
```cmd
curl -X POST http://localhost:5000/api/move -H "Content-Type: application/json" -d "{\"command\":\"invalid\"}"
```

**Expected Error Response:**
```json
{
  "status": "error",
  "message": "Invalid command"
}
```

## 🔍 What to Look For

### Visual Feedback
✅ Robot circle moves smoothly across grid  
✅ Direction line shows correct orientation  
✅ Robot info panel updates (X, Y, Angle, Direction)  
✅ Robot cannot pass through walls  
✅ Grid coordinates update in real-time  

### Console Output (F12 Developer Tools)
```
State updated and rendered
State updated and rendered
...
```

### Browser Network Tab
- Should see POST requests to `/api/move` on each keypress
- Status: 200 OK
- Response includes full game state

## 🐛 Troubleshooting

### Issue: Keys don't work
**Solution:** Click on the page to focus it first

### Issue: Robot doesn't move
**Checklist:**
1. Backend running? Check terminal
2. Connection status green?
3. Console errors? Press F12
4. Trying to move into wall? That's expected!

### Issue: "Connection Error" message
**Solution:**
```cmd
cd c:\Bavesh\Takumi\SLAM-Proj
pip install Flask numpy Flask-Cors
python app.py
```

### Issue: Robot moves but position doesn't update
**Solution:** Check backend terminal for errors. Response format may be incorrect.

## 📊 Expected Response Format

### Successful Move
```json
{
  "robot": {
    "x": 2,
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
```

### Failed Move (Collision)
```json
{
  "robot": {
    "x": 1,
    "y": 1,
    "angle": 0
  },
  "true_map": [[1,1,1,...], ...],
  "map_info": { ... }
}
```
Note: Position doesn't change when blocked

## 🎯 Test Scenarios

### Scenario 1: Navigate to Center
1. Start at (1, 1)
2. Move right 3 times (W, W, W)
3. Rotate left (A)
4. Move up 3 times (W, W, W)
5. Should be at approximately (4, 4)

### Scenario 2: Wall Following
1. Move until hitting a wall
2. Rotate left (A)
3. Move forward (W)
4. Repeat - trace along walls

### Scenario 3: Full Circuit
1. Trace entire border of map
2. Use rotations at corners
3. Should return to start

### Scenario 4: Internal Wall Navigation
1. Navigate to horizontal wall at y=5
2. Try to cross it (should block)
3. Find opening and pass through

## 📈 Performance Metrics

- **Key Response Time**: < 50ms
- **API Call**: < 100ms
- **Render Update**: < 16ms (60fps)
- **Total Latency**: < 200ms (key press → visual update)

## 🔧 Advanced Testing

### Test Auto-refresh
1. Open two browser windows with the simulation
2. Move robot in Window 1 using keys
3. Window 2 should update within 2 seconds (auto-refresh)

### Test Error Recovery
1. Stop backend (Ctrl+C in terminal)
2. Try pressing keys
3. Status should turn red "Disconnected"
4. Restart backend
5. Status should return to green within 2 seconds

## ✨ Success Criteria

✅ All keys respond correctly  
✅ Robot moves smoothly  
✅ Collision detection works  
✅ UI updates in real-time  
✅ No console errors  
✅ Connection status accurate  
✅ Reset button works (R key)  
✅ Backend returns proper JSON  
✅ Multiple commands work in sequence  
✅ Auto-refresh doesn't interfere with manual control  

## 🎮 Pro Tips

1. **Hold Keys**: Don't hold keys down - tap them for precision
2. **Plan Moves**: Look at the map before moving
3. **Watch Direction**: Direction line shows where you'll move
4. **Use Reset**: Press R if you get stuck
5. **Console Logs**: Keep F12 open to see state updates

---

**Status: ✅ Fully Functional**

All movement controls are implemented and tested!
