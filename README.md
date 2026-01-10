# web-dir

Target a directory for easily sharing files using HTTP.

## Description

A simple HTTP server for sharing files from a specified directory. Browse directories and download files through a web interface.

## Installation

```bash
npm install
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

```bash
# Start the server (default port 3000, serves current directory)
npm start

# Specify custom directory and port
PORT=8080 SERVE_DIR=/path/to/directory npm start
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `SERVE_DIR` - Directory to serve files from (default: current working directory)

## License

MIT
