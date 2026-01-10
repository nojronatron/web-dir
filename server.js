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
        process.env[key.trim()] = valueParts.join('=').trim();
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

// Route to list files
app.get('/', (req, res) => {
  fs.readdir(sharedDir, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Error reading directory');
    }

    // Filter to only files (not directories)
    const files = entries.filter(entry => entry.isFile());

    // Get file stats for creation date
    const fileStats = files.map(file => {
      const filePath = path.join(sharedDir, file.name);
      const stats = fs.statSync(filePath);
      return {
        name: file.name,
        birthtime: stats.birthtime,
        size: stats.size
      };
    });

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
        html += `
      <tr>
        <td><a href="/download/${encodeURIComponent(file.name)}">${file.name}</a></td>
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
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(sharedDir, filename);

  // Security: Prevent directory traversal attacks
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(sharedDir)) {
    return res.status(403).send('Access denied');
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).send('File not found');
  }

  // Check if it's a file (not a directory)
  if (!fs.statSync(resolvedPath).isFile()) {
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
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
