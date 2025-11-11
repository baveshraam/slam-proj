# GitHub Pages Deployment Guide

## 🌐 Deploying to GitHub Pages

This project includes a **static version** specifically designed for GitHub Pages deployment. The static version uses browser `localStorage` instead of a Flask backend, making it perfect for free hosting on GitHub Pages.

---

## 📁 Project Structure

```
SLAM-Proj/
├── app.py                 # Flask backend (for local development)
├── index.html             # Main page (requires Flask)
├── app.js                 # Client JS (requires Flask API)
├── style.css              # Shared styles
├── docs/                  # GitHub Pages folder
│   ├── index.html         # Static version
│   ├── app-static.js      # Client-only logic (no backend)
│   └── style.css          # Styles (copied)
├── maps/                  # Server-side map storage
└── vercel.json            # Vercel deployment config
```

---

## 🚀 Quick Start: Deploy to GitHub Pages

### Step 1: Create GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: SLAM Simulation"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/SLAM-Proj.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select: **Deploy from a branch**
4. Under "Branch", select: **main** and **/docs** folder
5. Click **Save**

### Step 3: Access Your Site

After 1-2 minutes, your site will be live at:
```
https://YOUR_USERNAME.github.io/SLAM-Proj/
```

---

## 🔄 Differences: Flask vs Static Version

| Feature | Flask Version | Static Version |
|---------|--------------|----------------|
| **Backend** | Python Flask server | None (client-only) |
| **Map Storage** | File system (`maps/` folder) | Browser localStorage |
| **Hosting** | Requires server (Vercel/local) | GitHub Pages (free) |
| **API** | REST endpoints | localStorage API |
| **Data Persistence** | Server-side files | Browser-specific |

### ⚠️ Limitations of Static Version

- Maps are stored in **browser localStorage** (cleared if you clear browser data)
- Maps are **not shared** between browsers or devices
- No server-side validation or processing
- Limited to ~5-10MB total storage (browser dependent)

### ✅ Advantages of Static Version

- **100% free hosting** on GitHub Pages
- No server costs or maintenance
- Instant deployment
- Works offline after first load
- No backend vulnerabilities

---

## 🛠️ Local Testing

Test the static version locally before deployment:

```bash
# Option 1: Python simple server
cd docs
python -m http.server 8000

# Option 2: Node.js http-server
npm install -g http-server
cd docs
http-server -p 8000

# Then open: http://localhost:8000
```

---

## 📝 Updating the Site

After making changes:

```bash
# If you modified style.css, copy it to docs/
copy style.css docs\style.css

# Commit and push
git add .
git commit -m "Update: description of changes"
git push

# GitHub Pages will auto-deploy in 1-2 minutes
```

---

## 🔧 Advanced: Custom Domain

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. In your repo: Settings → Pages → Custom domain
3. Enter your domain (e.g., `slam.yourdomain.com`)
4. Add DNS records:
   - **CNAME** record pointing to `YOUR_USERNAME.github.io`
   - Or **A** records pointing to GitHub's IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

---

## 🎯 Both Versions Available

You can deploy **both** versions:

1. **GitHub Pages** (static): `https://YOUR_USERNAME.github.io/SLAM-Proj/`
2. **Vercel** (Flask): `https://slam-proj.vercel.app`

Users can choose based on their needs:
- GitHub Pages for quick demos
- Vercel for full features with map sharing

---

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

## 🐛 Troubleshooting

### Site not loading
- Wait 2-3 minutes after enabling Pages
- Check Settings → Pages for build status
- Ensure `/docs` folder is selected

### Styles not loading
- Check that `style.css` exists in `/docs`
- Clear browser cache (Ctrl+Shift+R)

### Maps not saving
- Check browser console (F12) for errors
- Ensure localStorage is enabled in browser
- Try incognito mode to test fresh

---

**🎉 Congratulations!** Your SLAM simulation is now live on GitHub Pages!
