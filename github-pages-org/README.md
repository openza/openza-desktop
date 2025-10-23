# Openza Organization Website

This is the source code for the Openza organization landing page, hosted at https://openza.github.io

## Setup Instructions

### Step 1: Create the Organization Repository

1. Go to GitHub and create a **new repository** in the `openza` organization
2. Name it exactly: `openza.github.io` (this is required for organization GitHub Pages)
3. Make it **public**
4. Do NOT initialize with README (we'll push these files)

### Step 2: Push These Files

From your terminal, navigate to this `github-pages-org` folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Openza organization landing page"

# Add remote (replace with your actual repo URL)
git remote add origin https://github.com/openza/openza.github.io.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to the repository settings: `https://github.com/openza/openza.github.io/settings/pages`
2. Under "Build and deployment":
   - Source: Select **"GitHub Actions"**
   - This will automatically deploy using the workflow in `.github/workflows/deploy.yml`

### Step 4: Wait for Deployment

- GitHub Actions will automatically build and deploy your site
- Check the "Actions" tab to see deployment progress
- Site will be live at: `https://openza.github.io` (usually takes 1-2 minutes)

## Updating the Site

Simply push changes to the `main` branch:

```bash
git add .
git commit -m "Update: description of changes"
git push
```

GitHub Actions will automatically redeploy the site.

## Technology Stack

- **Pure HTML/CSS/JavaScript** - No build step required
- **Tailwind CSS** - Via CDN for styling
- **GitHub Actions** - Automatic deployment
- **GitHub Pages** - Free hosting

## Customization

### Update Content

Edit `index.html` to:
- Change hero text
- Add/remove projects
- Update contact information
- Modify footer links

### Update Styling

The site uses Tailwind CSS via CDN. You can:
- Modify Tailwind classes in the HTML
- Add custom CSS in the `<style>` tag
- Change color scheme (currently using indigo/purple gradient)

### Add Analytics (Optional)

To add Google Analytics or other tracking:
1. Add the tracking script to the `<head>` section of `index.html`
2. Ensure it complies with privacy regulations

## Links Between Sites

This organization site links to project-specific documentation:
- Openza Desktop: `https://openza.github.io/openza-desktop`

Each project repository should have its own GitHub Pages enabled for detailed documentation.

## License

MIT License - See the main Openza Desktop repository for details.
