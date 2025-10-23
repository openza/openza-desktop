# Openza Desktop Documentation

This directory contains the GitHub Pages documentation for Openza Desktop, hosted at https://openza.github.io/openza-desktop

## Setup Instructions

### Enable GitHub Pages for This Repository

1. Go to repository settings: `https://github.com/openza/openza-desktop/settings/pages`
2. Under "Build and deployment":
   - **Source**: Select **"GitHub Actions"**
3. Push the changes (including the workflow file)
4. GitHub Actions will automatically build and deploy

### Automatic Deployment

The documentation is automatically deployed when:
- You push to the `main` branch
- Changes are made to files in the `docs/` directory
- You manually trigger the workflow

View deployment status in the "Actions" tab: `https://github.com/openza/openza-desktop/actions`

### Local Preview

To preview the documentation locally:

```bash
# Option 1: Use Python's built-in server
cd docs
python -m http.server 8000

# Option 2: Use Node's http-server
npx http-server docs -p 8000
```

Then open `http://localhost:8000` in your browser.

## Documentation Structure

```
docs/
├── index.html         # Main documentation page
└── README.md          # This file
```

## Updating Documentation

### Content Updates

1. Edit `index.html` to update documentation content
2. Commit and push changes
3. GitHub Actions will automatically redeploy

### Styling

The documentation uses:
- **Tailwind CSS** - Via CDN for styling
- **Custom CSS** - In `<style>` tag for prose and sidebar
- **JavaScript** - For smooth scrolling and active section highlighting

## Navigation

The documentation includes:
- **Sticky header** - Links to Openza organization site
- **Sidebar navigation** - Quick access to all sections
- **Smooth scrolling** - Enhanced UX for anchor links
- **Active section highlighting** - Shows current section in sidebar

## Sections

1. **Introduction** - Overview and quick links
2. **Features** - Key features and capabilities
3. **Installation** - Download and build instructions
4. **Quick Start** - Getting started guide
5. **Configuration** - Environment setup
6. **Integrations** - Provider-specific setup guides
7. **Development** - Development guide and commands
8. **Architecture** - Technical architecture overview
9. **Contributing** - Contribution guidelines
10. **Security** - Security features and policies

## Links Between Sites

This project documentation links to:
- **Organization site**: `https://openza.github.io` (main landing page)
- **GitHub repository**: `https://github.com/openza/openza-desktop`
- **Issues**: `https://github.com/openza/openza-desktop/issues`

## Customization

### Update Content

Edit sections in `index.html`:
- Update version numbers in introduction
- Add/remove features
- Update installation instructions
- Modify configuration examples

### Add New Sections

1. Add section HTML in `index.html`
2. Add corresponding sidebar link
3. Ensure section has unique `id` attribute
4. JavaScript will automatically handle scrolling and highlighting

### Change Colors

Modify Tailwind classes:
- Primary color: `indigo-*` (currently used)
- Change to any Tailwind color: `blue-*`, `purple-*`, `green-*`, etc.

## Deployment

The site is deployed using GitHub Actions (see `.github/workflows/docs.yml`):

1. Triggered on push to `main` branch
2. Uploads `docs/` directory as artifact
3. Deploys to GitHub Pages
4. Available at `https://openza.github.io/openza-desktop`

## Troubleshooting

### Documentation not updating

- Check GitHub Actions workflow status
- Ensure GitHub Pages source is set to "GitHub Actions"
- Wait 2-3 minutes for deployment to complete

### Broken links

- Verify all internal links use `#section-id` format
- Ensure external links include full URLs
- Test links locally before pushing

### Styling issues

- Clear browser cache
- Check Tailwind CSS CDN is loading
- Verify custom CSS in `<style>` tag

## License

MIT License - Same as the main Openza Desktop project.
