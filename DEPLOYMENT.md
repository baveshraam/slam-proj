# 🚀 SLAM Simulation - Deployment Guide

## Running Locally on Localhost

### Option 1: Integrated Flask Server (Recommended)

The Flask backend now serves the frontend files directly!

```cmd
cd c:\Bavesh\Takumi\SLAM-Proj
python app.py
```

Then visit: **http://localhost:5000**

✅ **Benefits:**
- Single server for both frontend and backend
- No CORS issues
- Same setup for local and production
- Ready for Vercel deployment

### Option 2: Separate Servers (Development)

**Terminal 1 - Backend:**
```cmd
cd c:\Bavesh\Takumi\SLAM-Proj
python app.py
```

**Terminal 2 - Frontend:**
```cmd
cd c:\Bavesh\Takumi\SLAM-Proj
python -m http.server 8000
```

Visit: http://localhost:8000

## Deploying to Vercel

### Prerequisites
1. Install Vercel CLI:
   ```cmd
   npm install -g vercel
   ```

2. Create Vercel account at https://vercel.com

### Deployment Steps

1. **Initialize Git (if not already):**
   ```cmd
   cd c:\Bavesh\Takumi\SLAM-Proj
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Deploy to Vercel:**
   ```cmd
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project? → No
   - Project name? → slam-simulation (or your choice)
   - Directory? → ./
   - Want to modify settings? → No

4. **Production Deployment:**
   ```cmd
   vercel --prod
   ```

### Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ]
}
```

### Environment Variables on Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

- `FLASK_DEBUG`: `False` (for production)
- `PORT`: `5000` (optional, Vercel sets this automatically)

## 📝 Important Notes for Vercel

### 1. Dependencies
Make sure `requirements.txt` is complete:
```txt
Flask==3.0.0
numpy==1.26.2
Flask-Cors==4.0.0
```

### 2. File Persistence
⚠️ **Vercel is serverless** - saved maps won't persist between deployments.

For persistent storage, consider:
- Use Vercel KV (Redis)
- Use external storage (AWS S3, Google Cloud Storage)
- Database (MongoDB, PostgreSQL)

### 3. Static Files
Flask now serves static files directly:
- `/` → serves `index.html`
- `/style.css` → serves CSS
- `/app.js` → serves JavaScript

### 4. API Endpoints
All API endpoints are under `/api/*`:
- `/api/get_state`
- `/api/move`
- `/api/toggle_cell`
- `/api/save_map`
- `/api/load_map`
- etc.

## Testing Before Deployment

### 1. Test Locally
```cmd
python app.py
```
Visit http://localhost:5000

### 2. Test All Features
- ✅ Robot movement (WASD)
- ✅ Map editing (E key + click)
- ✅ Save/Load maps
- ✅ Reset robot
- ✅ All API endpoints

### 3. Check for Errors
Open browser console (F12) and check for:
- CORS errors (should be none)
- 404 errors (should be none)
- JavaScript errors (should be none)

## Alternative Hosting Options

### Heroku

1. Create `Procfile`:
   ```
   web: python app.py
   ```

2. Deploy:
   ```cmd
   heroku create slam-simulation
   git push heroku main
   ```

### Railway

1. Connect GitHub repo
2. Railway auto-detects Python
3. Set environment variables
4. Deploy automatically

### PythonAnywhere

1. Upload files
2. Set up virtualenv
3. Configure WSGI file
4. Set working directory

## Local Development Best Practices

### 1. Use Virtual Environment
```cmd
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables
Create `.env` file:
```env
FLASK_DEBUG=True
PORT=5000
```

### 3. Git Ignore
Create `.gitignore`:
```gitignore
.venv/
__pycache__/
*.pyc
.env
maps/*.json
!maps/example_maze.json
```

## Troubleshooting

### Issue: "Cannot GET /"
**Solution:** Make sure Flask is serving the index.html:
```python
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')
```

### Issue: API calls fail on Vercel
**Solution:** Update `API_BASE_URL` in `app.js`:
```javascript
const API_BASE_URL = window.location.origin; // Uses current domain
```

### Issue: Maps don't save on Vercel
**Solution:** Vercel is serverless. Implement external storage or use in-memory only.

### Issue: CORS errors
**Solution:** CORS is already configured in app.py:
```python
CORS(app)
```

## Performance Optimization

### 1. Caching
Add to Flask:
```python
@app.after_request
def add_header(response):
    response.cache_control.max_age = 300  # 5 minutes
    return response
```

### 2. Compression
Install and use:
```cmd
pip install flask-compress
```

```python
from flask_compress import Compress
Compress(app)
```

### 3. Production WSGI Server
For production (not Vercel):
```cmd
pip install gunicorn
gunicorn app:app
```

## Security Considerations

### 1. Production Settings
In `app.py` for production:
```python
app.config['DEBUG'] = False
app.config['TESTING'] = False
```

### 2. CORS Configuration
For production, limit CORS:
```python
CORS(app, origins=['https://yourdomain.com'])
```

### 3. Input Validation
Already implemented in endpoints:
- Coordinate validation
- Border protection
- Error handling

## Monitoring

### Local Development
- Check terminal for logs
- Use browser DevTools
- Monitor network requests

### Production (Vercel)
- View logs: `vercel logs`
- Monitor in Vercel Dashboard
- Set up error tracking (Sentry, etc.)

## Next Steps After Deployment

1. ✅ Test all features on live URL
2. ✅ Share URL with team/users
3. ✅ Monitor performance and errors
4. ✅ Implement user feedback
5. ✅ Add more map templates
6. ✅ Consider persistent storage solution

---

**Quick Deploy Checklist:**
- [ ] All dependencies in `requirements.txt`
- [ ] `vercel.json` configured
- [ ] Tested locally on http://localhost:5000
- [ ] Git committed
- [ ] Run `vercel --prod`
- [ ] Test live URL
- [ ] Share with team

🎉 **Your SLAM simulation is now deployment-ready!**
