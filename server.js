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
    const fileStats = fileStatsResults.filter(stat => stat !== null);

    // Generate HTML response
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Directory</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    h1 {
      color: #333;
    }
    table {
      width: 100%;
      background-color: white;
      border-collapse: collapse;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .no-files {
      padding: 20px;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Shared Files</h1>
`;

    if (fileStats.length === 0) {
      html += '<div class="no-files">No files available</div>';
    } else {
      html += `
  <table>
    <thead>
      <tr>
        <th>Filename</th>
        <th>Date Created</th>
      </tr>
    </thead>
    <tbody>
`;

      fileStats.forEach(file => {
        const dateCreated = file.birthtime.toLocaleString();
        const escapedName = escapeHtml(file.name);
        html += `
      <tr>
        <td><a href="/download/${encodeURIComponent(file.name)}">${escapedName}</a></td>
        <td>${dateCreated}</td>
      </tr>
`;
      });

      html += `
    </tbody>
  </table>
`;
    }

    html += `
</body>
</html>
`;

    res.send(html);
  });
});

// Route to download files
app.get('/download/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(sharedDir, filename);

  // Security: Prevent directory traversal attacks
  const resolvedPath = path.resolve(filePath);
  if (!isPathSafe(resolvedPath)) {
    return res.status(403).send('Access denied');
  }

  try {
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
          res.status(500).send('Error downloading file');
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
