import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app: Express = express();
const PORT = process.env.PORT || 3000;
const SERVE_DIR = process.env.SERVE_DIR || process.cwd();

// Serve static files from the specified directory
app.use(express.static(SERVE_DIR));

// List directory contents
app.get('*', (req: Request, res: Response) => {
  const requestedPath = path.join(SERVE_DIR, req.path);
  
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
          return `<li><a href="${filePath}">${file}</a></li>`;
        }).join('');
        
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Directory Listing - ${req.path}</title>
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
              <h1>Directory: ${req.path}</h1>
              <ul>
                ${req.path !== '/' ? '<li><a href="..">..</a></li>' : ''}
                ${fileList}
              </ul>
            </body>
          </html>
        `);
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving directory: ${SERVE_DIR}`);
});

export default app;
