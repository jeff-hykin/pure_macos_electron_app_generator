# What is this?

No xcode required: a tiny library can create macOS Electron apps from a single JS file **in the browser**. When used with Deno it will auto-download the Electron release zips from GitHub (in the browser you need to provide it yourself to get around CORS).

# How do I use it?

```js
import {createMacosElectronAppZip} from "https://esm.sh/gh/jeff-hykin/pure_macos_electron_app_generator@0.0.2.0/main.js"

const zips = await createMacosElectronAppZip({
    electronVersion: "32.0.0",
    // it will auto-download the release from GitHub if its not provided
    // here's how you can provide it manually:
        // https://github.com/electron/electron/releases/download/v32.0.0/electron-v32.0.0-darwin-x64.zip
        // electronZipX86: Deno.readFileSync(`./path_to_that^^^^`),
        // https://github.com/electron/electron/releases/download/v32.0.0/electron-v32.0.0-darwin-arm64.zip
        // electronZipArm64: Deno.readFileSync(`./path_to_that^^^^`),
    
    // optional callback to show progress:
    progressCallback: (message)=>{console.log(message)},
    // optional icon
    // iconBytes: Deno.readFileSync("./path_to_icon.icns"),
    
    // the main.js content (all non-node builtins need to be directly embedded)
    mainJsContent: `
        const { app, BrowserWindow } = require("electron/main")
        const path = require("path")
        
        function createWindow() {
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    //   preload: path.join(__dirname, 'preload.js')
                },
            })
        
            const htmlString = \`
                <html>
                <head>
                    <title>My HTML String</title>
                </head>
                <body>
                    <h1>Hello, Electron!</h1>
                    <p>This is loaded from an HTML string.</p>
                </body>
                </html>
            \`
            win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlString))
        }
        
        app.whenReady().then(() => {
            createWindow()
        
            app.on("activate", () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    createWindow()
                }
            })
        })
        
        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                app.quit()
            }
        })
    `,
})
console.log(zips)
Deno.writeFileSync("test.zip", new Uint8Array(zips.arm64))
```