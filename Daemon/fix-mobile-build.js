// Post-build script to fix paths for mobile
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(process.cwd(), 'dist/spa/index.html');

try {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Fix absolute paths to relative paths for file:// protocol
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✅ Fixed HTML paths for mobile build');
} catch (error) {
  console.error('❌ Error fixing HTML:', error.message);
  process.exit(1);
}

