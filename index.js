const electron = require("electron");
const path = require('path')
const url = require('url')
const httpHelper = require('./http-helper')
const fs = require('fs')
const exec = require('child_process').execFile;
const os = require("os");
const config = require('./config')

require('dotenv').config();
console.log("PROXY: ", process.env.PROXY_ADDRESS)
const helperPort = Number.parseInt( process.env.HELPER_PORT || '25712' )

let helperChild

async function electronHelperGet( method, data ){
    return httpHelper.getJSON({host: "localhost", port: helperPort, path: method, method: "POST"}, data )
}

function execute(fileName, params, path) {

    let child
    const promise = new Promise((resolve, reject) => {
        child = exec(fileName, params, { cwd: path, stdio: ['pipe', 'pipe', 'ignore'] }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
    return {
        promise,
        child,
    }
}

const WEB_FOLDER = 'dist';
const PROTOCOL = 'file';

async function start(win){
    await win.loadURL(url.format({
        pathname: 'index.html',
        protocol: PROTOCOL + ':',
        slashes: true
    }));
}

async function createWindow() {

    let arch = os.arch()
    let platform = os.platform()

    console.log("architecture", arch )
    console.log("platform", platform )

    if (arch === 'x64') arch = 'amd64'
    if (arch === 'x86') arch = '386'


    if (!process.env.HELPER_DISABLED){
        const filename = `./dist/helper/pandora-electron-helper-${arch}-${platform}${platform === 'window' ? '.exe' : ''}`
        if ( !fs.existsSync(filename)) {
            console.error("Electron helper not found", filename)
            process.exit(0)
        }
        const out = execute(filename, [`--tcp-server-port=${helperPort}`, ...config.goArgv ])
        helperChild = out.child
    }

    electron.protocol.interceptFileProtocol(PROTOCOL, (request, callback) => {
        // Strip protocol
        if (typeof request.url !== "string") throw "Invalid string"

        let url = request.url.substr(PROTOCOL.length + 1);

        // Build complete path for node require function
        url = path.join(__dirname, WEB_FOLDER, url);

        // Replace backslashes by forward slashes (windows)
        // url = url.replace(/\\/g, '/');
        url = path.normalize(url);

        if (url.indexOf('?') > 0)
            url = url.slice(0, url.indexOf('?'))

        console.log("url", url)

        //console.log(url);
        callback({path: url});
    });

    // Create the browser window.
    const win = new electron.BrowserWindow( {
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            preload: __dirname + '/preload.js'
        },
        center:  true,
    });

    electron.ipcMain.on("toMain", async (event, args )=>{

        if (typeof args === "object"){
            if (args.type === "helper-call"){
                try{
                    const out = await electronHelperGet(args.method, args.data )
                    win.webContents.send("fromMain", {type: "helper-answer", id: args.id, out })
                }catch(e){
                    win.webContents.send("fromMain", {type: "helper-answer", id: args.id, error: e.toString() })
                }
            }
        }
    })

    // and load the index.html of the app.
    if (process.env.PROXY_ADDRESS){
        await win.webContents.session.setProxy({proxyRules:process.env.PROXY_ADDRESS})
        console.log("starting")
        await start(win)
    }else {
        await start(win)
    }



}

electron.app.on("ready", ()=>{

    //append script electron-app.js in page head
    const script = `<script src="/electron-app.js"></script>`
    const text = fs.readFileSync('./dist/index.html').toString()
    if (text.indexOf(script) === -1){
        const p = text.indexOf("<head>")+"<head>".length
        const newText = [text.slice( 0, p ), script, text.slice(p)].join('')
        fs.writeFileSync('./dist/index.html', Buffer.from(newText) )
    }
    createWindow()

});

electron.app.on('window-all-closed', () => {
    if (helperChild){
        helperChild.kill()
        helperChild = undefined
    }
    if (process.platform !== 'darwin') {
        electron.app.quit()
    }
})