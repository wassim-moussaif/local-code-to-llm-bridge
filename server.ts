import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Endpoint to fetch entire extension as a ready-to-use zip/json payload
  app.get('/api/extension-files', (req, res) => {
    const extDir = path.join(__dirname, 'extension');
    const readDirRecursive = (dir, base = '') => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const relPath = path.join(base, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(readDirRecursive(filePath, relPath));
        } else {
          results.push({
            name: file,
            path: relPath.replace(/\\/g, '/'),
            content: fs.readFileSync(filePath, 'utf-8')
          });
        }
      });
      return results;
    };

    try {
      const files = readDirRecursive(extDir);
      res.json({ files });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Backend files endpoint for instant 1-click download/export
  app.get('/api/backend-files', (req, res) => {
    const backendDir = path.join(__dirname, 'backend');
    const files = [
      { name: 'main.py', content: fs.readFileSync(path.join(backendDir, 'main.py'), 'utf-8') },
      { name: 'security.py', content: fs.readFileSync(path.join(backendDir, 'security.py'), 'utf-8') },
      { name: 'file_service.py', content: fs.readFileSync(path.join(backendDir, 'file_service.py'), 'utf-8') },
      { name: 'requirements.txt', content: fs.readFileSync(path.join(backendDir, 'requirements.txt'), 'utf-8') },
      { name: 'start-backend.sh', content: fs.readFileSync(path.join(__dirname, 'start-backend.sh'), 'utf-8') },
      { name: 'start-backend.bat', content: fs.readFileSync(path.join(__dirname, 'start-backend.bat'), 'utf-8') }
    ];
    res.json({ files });
  });

  // In dev mode, mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
