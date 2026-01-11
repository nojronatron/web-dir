# web-dir

Target a directory for easily sharing files using HTTP.

## Description

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

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

## Usage

Start the server:

```bash
# Start the server (default port 3000, serves current directory)
npm start

# Specify custom directory and port
PORT=8080 SERVE_DIR=/path/to/directory npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

Access the file listing by opening a web browser and navigating to:
```
http://localhost:3000
```

Click on any filename to download the file to your browser's default download directory.

## Running as a Systemd Service

To run the web server as a service on Debian Bookworm (Raspberry Pi):

1. Create a systemd service file:

```bash
nano /etc/systemd/system/web-dir.service
```

2. Add the following configuration (adjust paths and environment variables as needed):

```ini
[Unit]
Description=Web Directory Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/workspaces/web-dir
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="SERVE_DIR=/path/to/your/shared/directory"
ExecStart=/usr/bin/node /workspaces/web-dir/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

3. Reload systemd to recognize the new service:

```bash
systemctl daemon-reload
```

4. Enable the service to start on boot:

```bash
systemctl enable web-dir.service
```

5. Start the service:

```bash
systemctl start web-dir.service
```

6. Check the service status:

```bash
systemctl status web-dir.service
```

7. View service logs:

```bash
journalctl -u web-dir.service -f
```

### Service Management Commands

- Stop the service: `systemctl stop web-dir.service`
- Restart the service: `systemctl restart web-dir.service`
- Disable auto-start on boot: `systemctl disable web-dir.service`
- View recent logs: `journalctl -u web-dir.service -n 50`

### Uninstalling the Service

To completely remove the web-dir service:

1. Stop the service:

```bash
systemctl stop web-dir.service
```

2. Disable the service:

```bash
systemctl disable web-dir.service
```

3. Remove the service file:

```bash
rm /etc/systemd/system/web-dir.service
```

4. Reload systemd:

```bash
systemctl daemon-reload
```

5. Reset any failed states:

```bash
systemctl reset-failed
```

**Note:** Ensure Node.js is installed at `/usr/bin/node`. Check with `which node` and adjust the `ExecStart` path if necessary.

## Configuration

The server is configured using environment variables in a `.env` file:

- `DIR_SHARE` (required): The absolute or relative path to the directory containing files to share
- `PORT` (optional): The port number for the web server (default: 3000)

## Environment Variables

- `PORT` - Server port (default: 3000)
- `SERVE_DIR` - Directory to serve files from (default: current working directory)

## Security Notes

This server is designed for use on **completely private networks only**. It has:
- No user authentication or authorization
- No rate limiting
- No caching or proxy support

**Do not expose this server to the public internet.**

## License

See LICENSE file for details.
