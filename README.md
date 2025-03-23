# ✨ FlowControl

Your friendly neighborhood MCP server companion! This slick desktop app makes managing Model Context Protocol servers a breeze 🌊

Here's what you can do with FlowControl:

- 🎮 Add, configure, start, stop, and delete MCP servers like a boss
- 🌱 Clone MCP servers from any Git repo (yes, ANY repo!)
- 🔍 Let the magic auto-detect your project type (Node.js or Python)
- 📦 Install dependencies without breaking a sweat
- ⚙️ Configure servers with a sweet JSON editor
- 📊 Watch your server logs flow in real-time
- 🔄 Servers restart automatically when you fire up the app

## 💡 Why FlowControl?

Let's be real - managing MCP servers used to be about as fun as debugging production on a Friday night. Here's why we created FlowControl:

- **No More Black Boxes** 📦: Tired of not knowing what your MCP servers are up to? We've got your back with crystal-clear visibility into every server's status.
- **One Ring to Rule Them All** 💍: Say goodbye to juggling multiple terminal windows! FlowControl gives you one beautiful dashboard to rule all your MCP servers.
- **Documentation Who?** 📚: Found another MCP repo with zero setup docs? No worries! FlowControl handles the heavy lifting for you or at least hopefully give you a understanding of what went wrong.
- **Global > Local** 🌍: Keep all your MCP services in one place instead of scattered across different projects. Because life's too short for project-hopping!
- **Error Messages That Make Sense** 🔍: When things go sideways, you'll actually know why. No more cryptic error messages!
- **Zombie Server Slayer** 🧟: Those pesky orphaned processes? Consider them handled. No MCP server escapes our watchful eye!

## 🚀 Features

- **Server Management**: Add, start, stop, and delete MCP servers
- **Git Integration**: Clone servers from any Git repository
- **Auto Detection**: Automatically detect project type (Node.js, Python)
- **Dependency Management**: Install dependencies with npm, yarn, pip, or poetry
- **Configuration**: Edit server configurations with a JSON editor
- **Log Viewer**: View and filter server logs in real-time
- **Batch Operations**: Start/stop all servers at once
- **Persistence**: State is saved between application restarts

## 🛠️ Development

### Before You Start

Make sure you've got these cool cats installed:
- Node.js (v14+)
- npm or yarn
- git

### Get It Running

```bash
# Grab the code
git clone <repository-url>
cd mcp-server-manager

# Power up with dependencies
npm install
```

### Dev Mode (Where the Magic Happens)

```bash
# Fire it up! 🔥
npm run dev
```

### Ship It! 

```bash
# Build time! 
npm run build
```

## 🏗️ Architecture

We've built this beauty with:

- **Electron**: Making desktop apps cool again
- **React**: Because we love our components
- **TailwindCSS**: Style with superpowers
- **simple-git**: Git operations made simple
- **electron-store**: Keeping your data safe and sound

### Project Structure

```
mcp-server-manager/
├── electron/            # Where the electrons live
│   ├── main.js         # The boss electron
│   ├── preload.js      # The helpful electron
│   ├── server-manager/ # The server whisperer
│   └── storage/        # The memory vault
├── src/                # React wonderland
│   ├── components/     # Building blocks
│   └── styles/         # Looking good!
├── public/             # Static party
└── dist/              # The finished product
```

## 📜 License

[MIT](LICENSE) (Because sharing is caring! 💖)