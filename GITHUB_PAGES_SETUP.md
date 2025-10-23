# GitHub Pages Setup Guide

This guide walks you through setting up both GitHub Pages sites for Openza.

## Overview

You now have two GitHub Pages sites:

1. **Organization Site** (`openza.github.io`) - Main landing page for Openza
2. **Project Documentation** (`openza.github.io/openza-desktop`) - Detailed docs for openza-desktop

## Site Structure

```
Organization Site (openza.github.io)
├── Landing page showcasing all Openza projects
├── Features overview
├── Links to project-specific documentation
└── About section

Project Site (openza.github.io/openza-desktop)
├── Comprehensive documentation
├── Installation guides
├── Configuration instructions
├── Integration setup (Todoist, Microsoft To-Do)
└── Development guide
```

## Setup Steps

### Part 1: Organization Site Setup

#### Step 1: Create the Organization Repository

1. Go to GitHub: https://github.com/organizations/openza/repositories/new
2. Repository name: **`openza.github.io`** (must be exactly this)
3. Description: "Openza organization landing page"
4. Visibility: **Public** (required for GitHub Pages)
5. **DO NOT** initialize with README
6. Click "Create repository"

#### Step 2: Push the Organization Site Files

Navigate to the `openza.github.io` folder in your terminal:

```bash
cd openza.github.io

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Openza organization landing page"

# Add remote (use your actual repo URL)
git remote add origin https://github.com/openza/openza.github.io.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### Step 3: Enable GitHub Pages for Organization Site

1. Go to: https://github.com/openza/openza.github.io/settings/pages
2. Under "Build and deployment":
   - **Source**: Select **"GitHub Actions"**
3. The site will deploy automatically
4. Wait 2-3 minutes for deployment

#### Step 4: Verify Organization Site

Visit: https://openza.github.io

You should see the landing page with:
- Hero section
- Features overview
- Projects section (with Openza Desktop)
- About section

---

### Part 2: Project Documentation Setup

The project documentation is already in the `docs/` folder of your current repository.

#### Step 1: Enable GitHub Pages for openza-desktop Repository

1. Go to: https://github.com/openza/openza-desktop/settings/pages
2. Under "Build and deployment":
   - **Source**: Select **"GitHub Actions"**
3. Save the settings

#### Step 2: Push the Documentation Files

From the root of your openza-desktop repository:

```bash
# Add the docs files
git add docs/
git add .github/workflows/docs.yml

# Commit
git commit -m "docs: Add GitHub Pages documentation site"

# Push to GitHub
git push origin main
```

#### Step 3: Wait for Deployment

1. Go to: https://github.com/openza/openza-desktop/actions
2. Wait for the "Deploy Documentation to GitHub Pages" workflow to complete (usually 1-2 minutes)
3. Check for green checkmark

#### Step 4: Verify Project Documentation

Visit: https://openza.github.io/openza-desktop

You should see comprehensive documentation with:
- Introduction and features
- Installation instructions
- Quick start guide
- Configuration details
- Integration setup guides
- Development guide
- Architecture overview

---

## Navigation Between Sites

Both sites are interconnected:

### From Organization Site → Project Site
- "Documentation" link in the Openza Desktop project card
- Direct link: https://openza.github.io/openza-desktop

### From Project Site → Organization Site
- "Openza" logo in the header
- Footer link to "Openza Home"
- Direct link: https://openza.github.io

---

## Updating the Sites

### Update Organization Site

```bash
# Navigate to the org site repo
cd path/to/openza.github.io

# Make changes to index.html

# Commit and push
git add .
git commit -m "Update: description of changes"
git push

# GitHub Actions will automatically redeploy
```

### Update Project Documentation

```bash
# Navigate to openza-desktop repo
cd path/to/openza-desktop

# Make changes to docs/index.html

# Commit and push
git add docs/
git commit -m "docs: description of changes"
git push

# GitHub Actions will automatically redeploy
```

---

## Customization Guide

### Organization Site

**Repository**: `openza.github.io` (sibling of openza-desktop)
**File**: `index.html`

**Common Updates:**
- Add new projects in the "Projects" section
- Update hero text and tagline
- Modify feature cards
- Change color scheme (search for `indigo` and replace with desired color)
- Update contact information in footer

### Project Documentation

**File**: `docs/index.html`

**Common Updates:**
- Update version number in introduction
- Add/remove features
- Modify installation instructions
- Update configuration examples
- Add new documentation sections
- Update tech stack information

---

## GitHub Actions Workflows

### Organization Site Workflow

**File**: `.github/workflows/deploy.yml` (in openza.github.io repo)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

### Project Site Workflow

**File**: `.github/workflows/docs.yml` (in openza-desktop repo)

**Triggers:**
- Push to `main` branch (only when `docs/**` changes)
- Manual workflow dispatch

**View Workflows:**
- Organization: https://github.com/openza/openza.github.io/actions
- Project: https://github.com/openza/openza-desktop/actions

---

## Troubleshooting

### Site Not Loading

1. **Check GitHub Pages settings:**
   - Ensure source is set to "GitHub Actions"
   - Verify repository is public

2. **Check workflow status:**
   - Go to Actions tab
   - Look for failed workflows (red X)
   - Click on failed workflow to see error details

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Try incognito/private browsing mode

### Changes Not Appearing

1. **Wait for deployment:**
   - Deployments take 1-3 minutes
   - Check Actions tab for deployment status

2. **Verify commit pushed:**
   ```bash
   git status
   git log -1
   ```

3. **Clear CDN cache:**
   - GitHub Pages uses CDN
   - May take 5-10 minutes for global updates

### 404 Errors

1. **Organization site 404:**
   - Verify repo name is exactly `openza.github.io`
   - Check repository is public
   - Ensure `index.html` is in root directory

2. **Project site 404:**
   - Verify GitHub Pages is enabled
   - Check workflow deployed successfully
   - Ensure `index.html` is in `docs/` directory

---

## Adding New Projects

When you create new Openza projects:

### 1. Update Organization Site

Add project card in `index.html`:

```html
<div class="bg-white rounded-xl shadow-lg p-8 mb-6 hover:shadow-xl transition">
    <div class="flex items-start justify-between mb-4">
        <div>
            <h3 class="text-2xl font-bold mb-2">Project Name</h3>
            <p class="text-gray-600 mb-4">
                Project description
            </p>
        </div>
        <span class="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">Active</span>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
        <span class="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded">Tech</span>
    </div>
    <div class="flex gap-4">
        <a href="https://github.com/openza/project-name" class="text-indigo-600 hover:text-indigo-700 font-medium">
            GitHub Repository
        </a>
        <a href="https://openza.github.io/project-name" class="text-indigo-600 hover:text-indigo-700 font-medium">
            Documentation
        </a>
    </div>
</div>
```

### 2. Create Project Documentation

Follow the same pattern as openza-desktop:
1. Create `docs/` folder in project repo
2. Add `docs/index.html` with project-specific documentation
3. Create `.github/workflows/docs.yml` workflow
4. Enable GitHub Pages in project settings

---

## Security Checklist

Before pushing to GitHub Pages:

- [ ] No API keys or secrets in code
- [ ] No hardcoded credentials
- [ ] No personal information (emails are okay in public contact section)
- [ ] All links use HTTPS
- [ ] No copyrighted content without permission
- [ ] Proper attribution for third-party code/assets

---

## Maintenance

### Regular Updates

**Monthly:**
- [ ] Update version numbers
- [ ] Review and update installation instructions
- [ ] Check all external links still work
- [ ] Update screenshots if UI changed

**When releasing new version:**
- [ ] Update version in documentation
- [ ] Add release notes/changelog
- [ ] Update download links
- [ ] Announce on organization site

### Analytics (Optional)

To track visitors, add Google Analytics:

1. Create GA4 property
2. Add tracking code to `<head>` in both sites:
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

---

## Resources

- **GitHub Pages Docs**: https://docs.github.com/en/pages
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Markdown Guide**: https://www.markdownguide.org/

---

## Support

If you encounter issues:

1. **Check this guide** for common solutions
2. **Review GitHub Actions logs** in the Actions tab
3. **GitHub Pages Status**: https://www.githubstatus.com/
4. **Open an issue**: https://github.com/openza/openza-desktop/issues

---

## Summary

You now have:

✅ Organization landing page at `https://openza.github.io`
✅ Project documentation at `https://openza.github.io/openza-desktop`
✅ Automatic deployment via GitHub Actions
✅ Navigation between both sites
✅ Professional, modern design
✅ Mobile-responsive layout
✅ Easy to maintain and update

**Next Steps:**
1. Create the `openza.github.io` repository on GitHub
2. Push the organization site files
3. Push the documentation to openza-desktop
4. Enable GitHub Pages for both repositories
5. Wait for deployment and verify sites are live

Enjoy your new GitHub Pages sites! 🎉
