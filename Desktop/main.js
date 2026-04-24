const { app, BrowserWindow } = require("electron")
const path = require("path")
const fs = require("fs")
const { spawn } = require("child_process")

app.disableHardwareAcceleration()

let mainWindow = null
let pythonProcess = null

function resolveFrontendUrl() {
  return process.env.AURORA_FRONTEND_URL || "http://localhost:3000"
}

function resolvePythonCommand() {
  const embeddedPython = path.join(__dirname, "..", "Backend", "venv", "Scripts", "python.exe")
  if (fs.existsSync(embeddedPython)) {
    return { command: embeddedPython, args: [] }
  }

  return { command: process.env.PYTHON_EXECUTABLE || "python", args: [] }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    autoHideMenuBar: true,
    title: "AuroraTunes",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.on("page-title-updated", (event) => event.preventDefault())
  mainWindow.loadURL(resolveFrontendUrl())

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function startPythonBackend() {
  const scriptPath = path.join(__dirname, "..", "Backend", "main.py")
  const python = resolvePythonCommand()

  pythonProcess = spawn(python.command, [...python.args, scriptPath], {
    cwd: path.dirname(scriptPath),
    env: process.env,
  })

  pythonProcess.stdout.on("data", (data) => {
    console.log(`Python: ${data}`)
  })

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python Error: ${data}`)
  })

  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`)
    pythonProcess = null
  })
}

app.whenReady().then(() => {
  startPythonBackend()
  createWindow()
})

app.on("window-all-closed", () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }

  if (process.platform !== "darwin") {
    app.quit()
  }
})
