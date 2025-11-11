# SLAM Requirements Analysis

## Current Implementation Status

### ✅ Already Implemented

#### 1. Virtual Environment Setup
- **Current:** 15×15 grid with walls and free spaces
- **Status:** ✅ COMPLETE
- **Modifiable:** ✅ YES (map editor with E key + click)
- **Visualization:** ✅ YES (HTML5 Canvas)
- **Config files:** ✅ YES (JSON format in `maps/` folder)
- **Gap:** Grid size is 15×15, requirement asks for 50×50

#### 2. Wheelchair/Robot Simulation
- **Current:** Robot with (x, y) position and angle (0°, 90°, 180°, 270°)
- **Keyboard control:** ✅ YES (WASD + arrow keys)
- **Visual representation:** ✅ YES (red circle with direction indicator)
- **Autonomous mode:** ❌ NO
- **Status:** ✅ MOSTLY COMPLETE

#### 3. Map Saving and Reloading
- **Save format:** ✅ YES (JSON)
- **Load functionality:** ✅ YES
- **Custom naming:** ✅ YES
- **Status:** ✅ COMPLETE

### ❌ Not Yet Implemented

#### 4. Virtual Sensor Modeling (CRITICAL)
- **Required:** Front, left, right, diagonal sensors
- **Ray-casting:** ❌ NO
- **Distance measurement:** ❌ NO (only checks 1 cell ahead)
- **Visualization:** ❌ NO
- **Status:** ❌ MISSING - **HIGH PRIORITY**

#### 5. Mapping (Environment Discovery)
- **Discovered map:** ❌ NO (only true map exists)
- **Progressive discovery:** ❌ NO
- **Map states (unknown/free/obstacle):** ❌ NO
- **Side-by-side visualization:** ❌ NO
- **Status:** ❌ MISSING - **HIGH PRIORITY**

#### 6. Localization
- **Odometry tracking:** ❌ NO (position is perfect, no uncertainty)
- **Movement history:** ❌ NO
- **Localization visualization:** ❌ NO
- **Visual odometry:** ❌ NO
- **Status:** ❌ MISSING - **MEDIUM PRIORITY**

#### 7. Path Planning (Optional)
- **A* algorithm:** ❌ NO
- **Dijkstra:** ❌ NO
- **Path visualization:** ❌ NO
- **Status:** ❌ MISSING - **LOW PRIORITY**

---

## Implementation Priority

### Phase 1: Core SLAM Features (HIGH PRIORITY)
1. **Expand grid to 50×50** (quick change)
2. **Implement ray-casting sensors** (front, left, right, diagonals)
3. **Create discovered map system** (0=unknown, 1=free, 2=obstacle)
4. **Real-time mapping visualization** (side-by-side view)

### Phase 2: Localization (MEDIUM PRIORITY)
5. **Odometry tracking** (count steps, turns)
6. **Movement history display**
7. **Position uncertainty visualization** (optional)

### Phase 3: Advanced Features (LOW PRIORITY)
8. **Path planning** (A* or Dijkstra)
9. **Autonomous navigation mode**
10. **Visual odometry** (webcam integration)

---

## Technical Implementation Plan

### 1. Expand Grid Size (15×15 → 50×50)
**Files to modify:**
- `app.py`: Change `MAP_SIZE = 15` to `MAP_SIZE = 50`
- `app.js`: Adjust `GRID_SIZE` and `CELL_SIZE`
- `docs/app-static.js`: Same adjustments

**Estimated time:** 5 minutes

---

### 2. Implement Ray-Casting Sensors
**New functionality needed:**

```python
def get_sensor_readings(self) -> Dict[str, int]:
    """
    Cast rays in 8 directions to measure distances.
    Returns: {
        'front': distance,
        'left': distance,
        'right': distance,
        'back': distance,
        'front_left': distance,
        'front_right': distance,
        'back_left': distance,
        'back_right': distance
    }
    """
```

**Algorithm:**
1. For each direction, cast a ray cell-by-cell
2. Count cells until hitting a wall
3. Return distance for each sensor

**Files to modify:**
- `app.py`: Add `get_sensor_readings()` method to Robot class
- Add new endpoint: `GET /api/sensors`
- `app.js`: Add sensor visualization (draw rays on canvas)

**Estimated time:** 30-45 minutes

---

### 3. Discovered Map System
**New data structures:**

```python
# Backend
DISCOVERED_MAP = np.zeros((MAP_SIZE, MAP_SIZE), dtype=int)
# 0 = unknown (never visited)
# 1 = free space (confirmed empty)
# 2 = obstacle (confirmed wall)

def update_discovered_map(robot_x, robot_y, sensor_readings):
    """Update discovered map based on sensor readings"""
```

**Files to modify:**
- `app.py`: Add `DISCOVERED_MAP` global variable
- Add `update_discovered_map()` function
- Modify `/api/get_state` to include both maps
- `app.js`: Add second canvas for discovered map
- `index.html`: Add second canvas element

**Estimated time:** 1-1.5 hours

---

### 4. Side-by-Side Visualization
**UI changes:**
- Split screen: Left = True Map, Right = Discovered Map
- Legend: Unknown (gray), Free (white), Obstacle (black), Robot (red)
- Sensor rays overlay on true map

**Files to modify:**
- `index.html`: Add second canvas + labels
- `style.css`: Adjust layout for two canvases
- `app.js`: Implement `drawDiscoveredMap()` function

**Estimated time:** 30 minutes

---

### 5. Odometry Tracking
**New functionality:**

```python
class Robot:
    def __init__(self):
        # ...
        self.movement_history = []  # List of (x, y, angle, timestamp)
        self.steps_taken = 0
        self.turns_made = 0
```

**Files to modify:**
- `app.py`: Add movement tracking to Robot class
- Add endpoint: `GET /api/odometry`
- `app.js`: Display stats panel (steps, turns, path length)

**Estimated time:** 30 minutes

---

### 6. Path Planning (A* Algorithm)
**New functionality:**

```python
def find_path(start, goal, discovered_map):
    """A* pathfinding on discovered map"""
    # Returns list of (x, y) waypoints
```

**Files to modify:**
- `app.py`: Add A* implementation
- Add endpoint: `POST /api/plan_path` (start, goal)
- `app.js`: Click to set goal, visualize path

**Estimated time:** 1-2 hours

---

## Total Estimated Implementation Time

- **Phase 1 (Core SLAM):** 2.5-3 hours
- **Phase 2 (Localization):** 0.5-1 hour
- **Phase 3 (Path Planning):** 1-2 hours

**Total:** 4-6 hours for full implementation

---

## Recommended Approach

### Option A: Full Implementation (4-6 hours)
Implement everything from scratch in order:
1. Grid expansion
2. Ray-casting sensors
3. Discovered map system
4. Visualization updates
5. Odometry
6. Path planning

### Option B: Incremental Implementation (Recommended)
Implement in stages, testing each feature:

**Stage 1 (30 min):**
- Expand grid to 50×50
- Test existing features still work

**Stage 2 (1 hour):**
- Add ray-casting sensors
- Visualize sensor rays

**Stage 3 (1.5 hours):**
- Implement discovered map
- Add side-by-side visualization

**Stage 4 (30 min):**
- Add odometry tracking
- Display statistics

**Stage 5 (1-2 hours):**
- Implement A* path planning
- Add click-to-navigate

### Option C: MVP (Minimum Viable Product) (1.5 hours)
Focus only on core SLAM requirements:
- 50×50 grid ✓
- Ray-casting sensors ✓
- Discovered map ✓
- Basic visualization ✓

Skip: Odometry details, path planning, autonomous mode

---

## What Would You Like to Do?

**Choose one:**

1. **Full implementation** - I'll implement all features now (4-6 hours of work)
2. **Incremental** - Let's do Stage 1, test it, then decide next steps (30 min)
3. **MVP only** - Core SLAM features only (1.5 hours)
4. **Custom** - Tell me which specific features you want

**Note:** Since you mentioned you want to push to GitHub, I recommend **Option 2 (Incremental)** or **Option 3 (MVP)** so you can see progress quickly and deploy intermediate versions.

Let me know which approach you prefer!
