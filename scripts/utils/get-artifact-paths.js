/**
 * Utility to get build artifact paths from package.json configuration
 * This ensures consistency across validation and release scripts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Get artifact paths based on package.json build configuration
 * @returns {Object} Object containing artifact paths and metadata
 */
export function getArtifactPaths() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const version = packageJson.version;
  const productName = packageJson.build?.productName || 'Openza Desktop';
  const distPath = path.join(projectRoot, 'dist-electron');

  // Extract artifact naming patterns from package.json
  const nsisConfig = packageJson.build?.nsis || {};
  const portableConfig = packageJson.build?.portable || {};

  // Construct artifact filenames from package.json templates
  // NSIS installer: replace ${version} and ${ext} from artifactName template
  const nsisTemplate = nsisConfig.artifactName || `${productName}-Setup-\${version}.\${ext}`;
  const setupExeFilename = nsisTemplate
    .replace('${version}', version)
    .replace('${ext}', 'exe');

  // Portable: use artifactName directly
  const portableExeFilename = portableConfig.artifactName || `${productName}-Portable.exe`;

  return {
    version,
    productName,
    distPath,
    setupExe: path.join(distPath, setupExeFilename),
    portableExe: path.join(distPath, portableExeFilename),
    setupExeFilename,
    portableExeFilename,
  };
}
