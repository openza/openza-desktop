import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function generateIco() {
  console.log('Generating icon.ico from PNG files...');

  const sizes = [16, 32, 64, 128, 256];
  const pngFiles = sizes.map(size =>
    path.join(projectRoot, 'public', `icon-${size}.png`)
  );

  try {
    const buf = await pngToIco(pngFiles);
    const outputPath = path.join(projectRoot, 'public', 'icon.ico');
    fs.writeFileSync(outputPath, buf);
    console.log('✓ Generated icon.ico');
    console.log('\nICO file generated successfully!');
  } catch (err) {
    console.error('Error generating ICO:', err);
    process.exit(1);
  }
}

generateIco();
