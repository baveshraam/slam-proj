# Quick GitHub Pages Setup 🚀

Follow these steps to host your SLAM simulation on GitHub Pages **for free**!

---

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Repository name: `SLAM-Proj` (or your choice)
4. Make it **Public**
5. Click **Create repository**

---

## Step 2: Push Your Code

Open terminal in your project folder:

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: SLAM Simulation with GitHub Pages"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/SLAM-Proj.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**:
   - Select branch: **main**
   - Select folder: **/docs**
5. Click **Save**

---

## Step 4: Access Your Site! 🎉

Wait 1-2 minutes, then visit:

```
https://YOUR_USERNAME.github.io/SLAM-Proj/
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## 🔄 Updating Your Site

After making changes:

```bash
# Add changes
git add .

# Commit
git commit -m "Update: description of changes"

# Push
git push

# Site will auto-update in 1-2 minutes!
```

---

## ⚠️ Important Notes

- The GitHub Pages version uses **localStorage** for maps
- Maps are saved in your browser only (not shared between devices)
- For the full backend version, use Vercel (see DEPLOYMENT.md)
- The static version works 100% offline after first load

---

## 🐛 Troubleshooting

**Site shows 404:**
- Wait 2-3 minutes after enabling Pages
- Check that `/docs` folder is selected in settings
- Refresh the settings page to see deployment status

**Styles not loading:**
- Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
- Check that `style.css` exists in `/docs` folder

**Maps not saving:**
- Check browser console (F12) for errors
- Ensure cookies/localStorage are enabled
- Try incognito mode to test fresh

---

## 🎯 Both Versions Available

You can deploy **both** versions:

1. **GitHub Pages** (static): Free, instant, client-only
2. **Vercel** (Flask): Free tier, full backend features

Users choose based on their needs!

---

**Need help?** Check [GITHUB_PAGES.md](GITHUB_PAGES.md) for detailed documentation.
