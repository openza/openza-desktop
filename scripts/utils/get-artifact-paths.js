/**
 * Utility to get build artifact paths from package.json configuration
 * This ensures consistency across validation and release scripts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Format an error object for display
 * @param {Error|string|unknown} err - The error to format
 * @returns {string} Formatted error message
 */
export function formatError(err) {
  return err?.message ?? String(err);
}

/**
 * Get artifact paths based on package.json build configuration
 * @param {string} [customProjectRoot] - Optional custom project root path (defaults to auto-detection)
 * @returns {Object} Object containing artifact paths and metadata
 */
export function getArtifactPaths(customProjectRoot) {
  // Auto-detect project root from this file's location (scripts/utils/)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = customProjectRoot || path.resolve(__dirname, '../..');

  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

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
    projectRoot,
    distPath,
    setupExe: path.join(distPath, setupExeFilename),
    portableExe: path.join(distPath, portableExeFilename),
    setupExeFilename,
    portableExeFilename,
  };
}
