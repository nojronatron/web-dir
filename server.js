const express = require('express');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
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

const app = express();
const PORT = process.env.PORT || 3000;
const DIR_SHARE = process.env.DIR_SHARE;

if (!DIR_SHARE) {
  console.error('ERROR: DIR_SHARE environment variable is not set.');
  console.error('Please create a .env file with DIR_SHARE=<path-to-share>');
  process.exit(1);
}

// Resolve the shared directory path
const sharedDir = path.resolve(DIR_SHARE);

// Verify the directory exists
if (!fs.existsSync(sharedDir)) {
  console.error(`ERROR: Directory does not exist: ${sharedDir}`);
  process.exit(1);
}

if (!fs.statSync(sharedDir).isDirectory()) {
  console.error(`ERROR: Path is not a directory: ${sharedDir}`);
  process.exit(1);
}

console.log(`Sharing directory: ${sharedDir}`);

// HTML escape function to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Check if a path is within the shared directory
function isPathSafe(filePath) {
  const relative = path.relative(sharedDir, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Route to list files
app.get('/', (req, res) => {
  fs.readdir(sharedDir, { withFileTypes: true }, async (err, entries) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Error reading directory');
    }

    // Filter to only files (not directories)
    const files = entries.filter(entry => entry.isFile());

    // Get file stats for creation date (async)
    const fileStatsPromises = files.map(async file => {
      const filePath = path.join(sharedDir, file.name);
      try {
        const stats = await fs.promises.stat(filePath);
        return {
          name: file.name,
          birthtime: stats.birthtime,
          size: stats.size
        };
      } catch (statErr) {
        // File might have been deleted between readdir and stat
        console.warn(`Warning: Could not stat file ${file.name}:`, statErr);
        return null;
      }
    });

    const fileStatsResults = await Promise.all(fileStatsPromises);
    let fileStats = fileStatsResults.filter(stat => stat !== null);
    
    // Filter to only JPG files
    fileStats = fileStats.filter(file => {
      const ext = path.extname(file.name).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg';
    });
    
    fileStats.sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime());

    // Generate HTML response
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Gallery</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      padding: 20px 0;
    }
    .card {
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .card-title {
      font-size: 14px;
      color: #333;
      margin: 0 0 10px 0;
      text-align: center;
      word-break: break-word;
      width: 100%;
    }
    .card a {
      display: block;
      text-decoration: none;
    }
    .card img {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #eee;
    }
    .no-files {
      padding: 40px;
      text-align: center;
      color: #666;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <h1>Image Gallery</h1>
`;

    if (fileStats.length === 0) {
      html += '<div class="no-files">No JPG images available</div>';
    } else {
      html += '<div class="gallery">\n';

      fileStats.forEach(file => {
        const escapedName = escapeHtml(file.name);
        const encodedName = encodeURIComponent(file.name);
        html += `
  <div class="card">
    <h3 class="card-title">${escapedName}</h3>
    <a href="/download/${encodedName}">
      <img src="/download/${encodedName}" alt="${escapedName}" loading="lazy" width="200" height="200">
    </a>
  </div>
`;
      });

      html += '</div>\n';
    }

    html += `
</body>
</html>
`;

    res.send(html);
  });
});

// Route to download files
app.get('/download/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(sharedDir, filename);

    // Security: Prevent directory traversal attacks
    const resolvedPath = path.resolve(filePath);
    if (!isPathSafe(resolvedPath)) {
      return res.status(403).send('Access denied');
    }

    // Check if file exists and get stats (async)
    const stats = await fs.promises.stat(resolvedPath);
    
    // Check if it's a file (not a directory)
    if (!stats.isFile()) {
      return res.status(400).send('Not a file');
    }

    // Send the file as a download
    res.download(resolvedPath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          next(err);
        }
      }
    });
  } catch (err) {
    // File doesn't exist or other error
    if (err.code === 'ENOENT') {
      return res.status(404).send('File not found');
    }
    console.error('Error accessing file:', err);
    return res.status(500).send('Error accessing file');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
