import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the dist/spa directory
app.use(express.static(path.join(__dirname, 'dist/spa')));

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/spa', 'index.html'));
});

app.listen(port, () => {
  console.log(`PWA server running at http://localhost:${port}`);
  console.log('You can now:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Install the app using "Add to Home Screen"');
  console.log('3. Or use this URL to create an APK with tools like PWA Builder');
});
