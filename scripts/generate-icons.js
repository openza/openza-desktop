import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read the SVG file
const svgBuffer = fs.readFileSync(path.join(projectRoot, 'public/icon.svg'));

// Sizes to generate
const sizes = [16, 32, 64, 128, 256, 512];

async function generateIcons() {
  console.log('Generating PNG icons from SVG...');

  for (const size of sizes) {
    const outputPath = path.join(projectRoot, 'public', `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated icon-${size}.png`);
  }

  // Generate the main icon.png (512x512)
  const mainIconPath = path.join(projectRoot, 'public', 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log('✓ Generated icon.png (512x512)');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
