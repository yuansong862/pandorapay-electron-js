const electron = require("electron");
const path = require('path')
const url = require('url')
const httpHelper = require('./http-helper')
const fs = require('fs')

async function electronHelperGet( method, data ){
    return httpHelper.getJSON({host: "localhost", port: 8080, path: '/'+method, method: "POST"}, data )
}


async function createWindow() {
    const WEB_FOLDER = 'dist';
    const PROTOCOL = 'file';

    electron.protocol.interceptFileProtocol(PROTOCOL, (request, callback) => {
        // // Strip protocol
        let url = request.url.substr(PROTOCOL.length + 1);

        // Build complete path for node require function
        url = path.join(__dirname, WEB_FOLDER, url);

        // Replace backslashes by forward slashes (windows)
        // url = url.replace(/\\/g, '/');
        url = path.normalize(url);

        if (url.indexOf('?') > 0)
            url = url.slice(0, url.indexOf('?'))

        //console.log(url);
        callback({path: url});
    });

    // Create the browser window.
    let win = new electron.BrowserWindow( {
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

    win.on('closed', () => electron.app.quit() );

    electron.ipcMain.on("toMain", async (event, args )=>{

        if (typeof args === "object"){
            if (args.type === "helper-call"){
                try{
                    const out = await electronHelperGet(args.method, args.data)
                    win.webContents.send("fromMain", {type: "helper-answer", id: args.id, out })
                }catch(e){
                    win.webContents.send("fromMain", {type: "helper-answer", id: args.id, error: e.toString() })
                }
            }
        }
    })

    // and load the index.html of the app.
    await win.loadURL(url.format({
        pathname: 'index.html',
        protocol: PROTOCOL + ':',
        slashes: true
    }));



}

electron.app.on("ready", ()=>{

    //append script electron-app.js in page head
    const script = `<script src="/electron-app.js"></script>`
    const text = fs.readFileSync('./dist/index.html').toString()
    if (text.indexOf(`script`) === -1){
        const p = text.indexOf("<head>")+"<head>".length
        const newText = [text.slice( 0, p ), script, text.slice(p)].join('')
        fs.writeFileSync('./dist/index.html', Buffer.from(newText) )
    }
    createWindow()

});