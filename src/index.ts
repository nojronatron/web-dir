import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // Handle quoted values
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
      }
    }
  });
}

const app: Express = express();
const PORT = process.env.PORT || 3000;
const DIR_SHARE = process.env.DIR_SHARE;

if (!DIR_SHARE) {
  console.error('ERROR: DIR_SHARE environment variable is not set.');
  console.error('Please create a .env file with DIR_SHARE=<path-to-share>');
  process.exit(1);
}

// Resolve the shared directory path
const SERVE_DIR = path.resolve(DIR_SHARE);

// Verify the directory exists
if (!fs.existsSync(SERVE_DIR)) {
  console.error(`ERROR: Directory does not exist: ${SERVE_DIR}`);
  process.exit(1);
}

if (!fs.statSync(SERVE_DIR).isDirectory()) {
  console.error(`ERROR: Path is not a directory: ${SERVE_DIR}`);
  process.exit(1);
}

console.log(`Sharing directory: ${SERVE_DIR}`);

// HTML escape function to prevent XSS attacks
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Serve static files from the specified directory
app.use(express.static(SERVE_DIR));

// List directory contents - using middleware instead of wildcard route
app.use((req: Request, res: Response, next) => {
  // Resolve the full path and ensure it's within SERVE_DIR to prevent path traversal
  const requestedPath = path.resolve(SERVE_DIR, '.' + req.path);
  
  // Validate that the requested path is within the serve directory
  if (!requestedPath.startsWith(path.resolve(SERVE_DIR))) {
    res.status(403).send('Forbidden: Access denied');
    return;
  }
  
  fs.stat(requestedPath, (err, stats) => {
    if (err) {
      res.status(404).send('File or directory not found');
      return;
    }
    
    if (stats.isDirectory()) {
      fs.readdir(requestedPath, (err, files) => {
        if (err) {
          res.status(500).send('Error reading directory');
          return;
        }
        
        const fileList = files.map(file => {
          const filePath = path.join(req.path, file);
          return `<li><a href="${escapeHtml(filePath)}">${escapeHtml(file)}</a></li>`;
        }).join('');
        
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Directory Listing - ${escapeHtml(req.path)}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                ul { list-style-type: none; padding: 0; }
                li { padding: 5px 0; }
                a { text-decoration: none; color: #0066cc; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <h1>Directory: ${escapeHtml(req.path)}</h1>
              <ul>
                ${req.path !== '/' ? '<li><a href="..">..</a></li>' : ''}
                ${fileList}
              </ul>
            </body>
          </html>
        `);
      });
    } else {
      // File is served by express.static middleware, but if we reach here,
      // it means the static middleware didn't handle it, so send the file
      res.sendFile(requestedPath);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving directory: ${SERVE_DIR}`);
});

export default app;
