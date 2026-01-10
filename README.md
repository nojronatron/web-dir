# web-dir

Target a directory for easily sharing files using HTTP.

## Overview

A simple Express.js 5 web server that allows remote anonymous users to view and download files from a local directory. Designed for use on completely private networks with no authentication required.

## Features

- List all files in a shared directory with filename and creation date
- Download files by clicking on them
- Clean, simple web interface
- No external dependencies beyond Express.js
- Configurable via environment variables

## Requirements

- Node.js (version 14 or higher recommended)
- npm

## Installation

1. Clone the repository:
```bash
git clone https://github.com/nojronatron/web-dir.git
cd web-dir
```

2. Install dependencies:
```bash
npm install
```

3. Configure the server by creating a `.env` file:
```bash
cp .env.example .env
```

4. Edit the `.env` file and set the `DIR_SHARE` variable to the directory you want to share:
```
DIR_SHARE=/path/to/your/shared/directory
PORT=3000
```

## Usage

Start the server:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

Access the file listing by opening a web browser and navigating to:
```
http://localhost:3000
```

Click on any filename to download the file to your browser's default download directory.

## Configuration

The server is configured using environment variables in a `.env` file:

- `DIR_SHARE` (required): The absolute or relative path to the directory containing files to share
- `PORT` (optional): The port number for the web server (default: 3000)

## Security Notes

This server is designed for use on **completely private networks only**. It has:
- No user authentication or authorization
- No rate limiting
- No caching or proxy support

**Do not expose this server to the public internet.**

## License

See LICENSE file for details.
