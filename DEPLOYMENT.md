# 🚀 Deployment Guide - SLAM Wheelchair Simulation

## ⚠️ Important: Backend + Frontend Architecture

This project has **two separate components**:
1. **Backend** (Flask/Python) - Handles robot logic, pathfinding, map state
2. **Frontend** (HTML/CSS/JS) - User interface

**Vercel can only host the frontend.** You need to deploy the backend separately.

---

## 📦 Quick Fix: Deploy Backend to Render.com (Free, Recommended)

### Step 1: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `baveshraam/slam-proj`
4. Configure:
   - **Name**: `slam-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Plan**: Free (will sleep after inactivity)
5. Click **"Create Web Service"**
6. Wait 5-10 minutes for deployment
7. **Copy your backend URL** (e.g., `https://slam-backend-xxxx.onrender.com`)

### Step 2: Update Frontend Configuration

1. In your repository, edit `config.js`:
   ```javascript
   window.BACKEND_URL = 'https://slam-backend-xxxx.onrender.com';
   ```
   (Replace with your actual Render URL)

2. Commit and push:
   ```bash
   git add config.js
   git commit -m "Update backend URL for production"
   git push origin main
   ```

3. Vercel will automatically redeploy your frontend

### Step 3: Test Your Deployment

Visit your Vercel URL - it should now connect to the backend and work! 🎉

**Note:** Render free tier sleeps after 15 min of inactivity. First load may take 30-60 seconds to wake up.

---

## 🏠 Alternative: Run Locally Only

If you just want to test locally:

1. **Start the backend:**
   ```cmd
   cd c:\Bavesh\Takumi\SLAM-Proj
   python app.py
   ```

2. **Open your browser:**
   - Vercel site will connect to `http://127.0.0.1:5000`
   - Make sure `config.js` has: `window.BACKEND_URL = 'http://127.0.0.1:5000';`

---

## 📦 Other Backend Hosting Options

### Railway.app (Free)
1. Go to [railway.app](https://railway.app) and sign up
2. **"New Project"** → **"Deploy from GitHub repo"**
3. Select `baveshraam/slam-proj`
4. Railway auto-detects Python
5. Copy your URL and update `config.js`

### PythonAnywhere (Free)
1. Sign up at [pythonanywhere.com](https://www.pythonanywhere.com)
2. Upload files or clone from GitHub
3. Create Flask web app
4. Copy URL and update `config.js`

### Heroku (Paid)
1. Create `Procfile`: `web: python app.py`
2. Deploy: `heroku create slam-simulation && git push heroku main`

---

## 🔧 Troubleshooting

### Frontend Shows "Disconnected"
1. Open browser DevTools (F12) → Console
2. Check for errors
3. Verify backend URL in `config.js` is correct
4. Test backend health: `https://your-backend-url/health`
5. If using Render free tier, first load takes 30-60 seconds (waking up)

### CORS Errors
- Backend already has CORS enabled
- Make sure backend URL has no trailing slash
- Check backend is actually running

### Backend Logs (Render)
- Go to Render dashboard
- Click your service
- View logs tab for errors

---

## 📝 Files You Need to Update

1. **config.js** - Change backend URL from localhost to your deployed URL
2. That's it! Everything else is already configured.

---

## ✅ Deployment Checklist

- [x] Backend configured with CORS
- [x] requirements.txt has all dependencies
- [x] Flask app runs on 0.0.0.0
- [x] Frontend loads config.js
- [ ] Deploy backend to Render/Railway
- [ ] Copy backend URL
- [ ] Update config.js with backend URL
- [ ] Push to GitHub (Vercel auto-deploys frontend)
- [ ] Test live URL

---

## 🎉 Expected Result

After following Step 1 & 2:
- ✅ Vercel hosts your frontend (HTML/CSS/JS)
- ✅ Render hosts your backend (Flask/Python)
- ✅ Frontend connects to backend via config.js
- ✅ Full SLAM simulation works online!

---

## 💡 Why This Setup?

**Vercel** = Great for static sites, limited Python support  
**Render** = Perfect for Flask apps, free tier includes 750 hours/month

This is the **simplest, free solution** for your SLAM project! 🚀
