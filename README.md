# MCP Server Manager

A desktop application for managing MCP (Model Context Protocol) servers. This application allows you to:

- Add, configure, start, stop, and delete MCP servers
- Clone MCP servers from any Git repository
- Automatically detect project type (Node.js or Python)
- Install dependencies using the appropriate package manager
- Configure servers with custom JSON configuration
- Monitor server logs in real-time
- Restart servers automatically when the application starts

## Features

- **Server Management**: Add, start, stop, and delete MCP servers
- **Git Integration**: Clone servers from any Git repository
- **Auto Detection**: Automatically detect project type (Node.js, Python)
- **Dependency Management**: Install dependencies with npm, yarn, pip, or poetry
- **Configuration**: Edit server configurations with a JSON editor
- **Log Viewer**: View and filter server logs in real-time
- **Batch Operations**: Start/stop all servers at once
- **Persistence**: State is saved between application restarts

## Development

### Prerequisites

- Node.js (v14+)
- npm or yarn
- git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-server-manager

# Install dependencies
npm install
```

### Running in Development Mode

```bash
# Start the development server
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build
```

## Architecture

The application is built with:

- **Electron**: For the desktop application framework
- **React**: For the user interface
- **TailwindCSS**: For styling
- **simple-git**: For Git operations
- **electron-store**: For persistent storage

### Project Structure

```
mcp-server-manager/
├── electron/            # Electron main process code
│   ├── main.js          # Main entry point
│   ├── preload.js       # Preload script for IPC
│   ├── server-manager/  # Server management logic
│   └── storage/         # Data persistence
├── src/                 # React frontend
│   ├── components/      # UI components
│   └── styles/          # CSS styles
├── public/              # Static assets
└── dist/                # Build output
```

## License

[MIT](LICENSE)