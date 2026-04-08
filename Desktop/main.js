const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

app.disableHardwareAcceleration();

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      autoHideMenuBar: true,
    },
    autoHideMenuBar: true,
    title: "AuroraTunes",
    icon: path.join(__dirname, 'icon.ico')
    
  });
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
  mainWindow.loadURL('http://localhost:3000'); 

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  const pythonExe = path.join(__dirname, '..' ,'Backend', 'venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(__dirname, '..' , 'Backend', 'main.py');

  pythonProcess = spawn(pythonExe, [scriptPath]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });
}

app.whenReady().then(() => {
  startPythonBackend(); 
  createWindow();
});


app.on('window-all-closed', () => {
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});