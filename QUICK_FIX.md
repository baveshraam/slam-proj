# 🚀 QUICK FIX: Make Your Vercel Site Work

## Problem
Your Vercel site shows "Disconnected" because it's only hosting the frontend (HTML/CSS/JS). 
The backend (Flask/Python) needs to be deployed separately.

## Solution (5 minutes)

### Step 1: Deploy Backend to Render.com

1. Open [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect GitHub"** and authorize
4. Find and select `baveshraam/slam-proj`
5. Fill in:
   - **Name**: `slam-backend` (or any name you like)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Plan**: Free
6. Click **"Create Web Service"**
7. **Wait 5-10 minutes** while it deploys
8. **Copy the URL** at the top (looks like `https://slam-backend-abc123.onrender.com`)

### Step 2: Update Frontend Config

1. Go to your GitHub repo: https://github.com/baveshraam/slam-proj
2. Click on `config.js` file
3. Click the **pencil icon** (Edit)
4. Change line 3 from:
   ```javascript
   window.BACKEND_URL = 'http://127.0.0.1:5000';
   ```
   To (using YOUR Render URL):
   ```javascript
   window.BACKEND_URL = 'https://slam-backend-abc123.onrender.com';
   ```
5. Click **"Commit changes"** (green button)

### Step 3: Wait for Vercel to Redeploy

- Vercel automatically detects the change and redeploys (takes 1-2 minutes)
- Check your Vercel deployments page

### Step 4: Test It!

Visit your Vercel URL: https://slam-proj.vercel.app

**First load might take 30-60 seconds** (Render free tier wakes up from sleep).
After that, it should show "Connected" and work perfectly! ✅

---

## Alternative: Test Locally First

Want to test before deploying?

1. Open terminal in project folder
2. Run: `python app.py`
3. Visit: http://localhost:5000
4. Should work immediately!

---

## Troubleshooting

**Still shows "Disconnected"?**
- Check browser console (F12) for errors
- Verify the URL in config.js matches your Render URL exactly (no trailing slash)
- Test backend directly: visit `https://your-render-url/health` (should show "healthy")

**Backend takes forever to load?**
- Render free tier sleeps after 15 min of inactivity
- First request wakes it up (30-60 seconds)
- Consider upgrading to paid tier ($7/month) for always-on

**Need help?**
- See full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Check Render logs for backend errors

---

## What You're Doing

```
Before:
┌─────────────┐
│   Vercel    │  ← Frontend only, can't run Python
│ (Frontend)  │     Shows "Disconnected" ❌
└─────────────┘

After:
┌─────────────┐       ┌──────────────┐
│   Vercel    │◄─────►│    Render    │
│ (Frontend)  │  API  │  (Backend)   │
│  Your UI    │       │ Robot Logic  │
└─────────────┘       └──────────────┘
     ✅                      ✅
```

---

**That's it!** Your SLAM simulation will be fully functional online! 🎉
