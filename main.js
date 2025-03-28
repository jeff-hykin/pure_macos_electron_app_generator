import {zipCreate, zipParse} from "https://esm.sh/gh/jeff-hykin/good-js@b056dad/source/zip.js"

/**
 * @example
 * ```js
 * const zips = await createMacosElectronAppZip({
 *     electronVersion: "32.0.0",
 *     // downloaded from: https://github.com/electron/electron/releases/download/v32.0.0/electron-v32.0.0-darwin-x64.zip
 *     electronZipX86: Deno.readFileSync(`/Users/jeffhykin/repos/nixpkg_electron_template/tooling/electron-v32.0.0-darwin-x64.zip`),
 *     // downloaded from: https://github.com/electron/electron/releases/download/v32.0.0/electron-v32.0.0-darwin-arm64.zip
 *     electronZipArm64: Deno.readFileSync(`/Users/jeffhykin/repos/nixpkg_electron_template/tooling/electron-v32.0.0-darwin-arm64.zip`),
 *     progressCallback: (message)=>{console.log(message)},
 *     mainJsContent: `
 *         const { app, BrowserWindow } = require("electron/main")
 *         const path = require("path")
 *         
 *         function createWindow() {
 *             const win = new BrowserWindow({
 *                 width: 800,
 *                 height: 600,
 *                 webPreferences: {
 *                     //   preload: path.join(__dirname, 'preload.js')
 *                 },
 *             })
 *         
 *             const htmlString = `
 *                 <html>
 *                 <head>
 *                     <title>My HTML String</title>
 *                 </head>
 *                 <body>
 *                     <h1>Hello, Electron!</h1>
 *                     <p>This is loaded from an HTML string.</p>
 *                 </body>
 *                 </html>
 *             `
 *             win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlString))
 *         }
 *         
 *         app.whenReady().then(() => {
 *             createWindow()
 *         
 *             app.on("activate", () => {
 *                 if (BrowserWindow.getAllWindows().length === 0) {
 *                     createWindow()
 *                 }
 *             })
 *         })
 *         
 *         app.on("window-all-closed", () => {
 *             if (process.platform !== "darwin") {
 *                 app.quit()
 *             }
 *         })
 *     `,
 * })
 * console.log(zips)
 * Deno.writeFileSync("test.zip", new Uint8Array(zips.arm64))
 * ```
 */
export async function createMacosElectronAppZip({electronVersion, electronZipX86, electronZipArm64, warnInsteadOfError = false, mainJsContent, iconBytes, progressCallback=(message)=>{} }) {
    // @summary
    //     Download the zip straight from the Electron releases
    //     inject the main.js content into it
    //     replace the typical executable with a bash script that calls the original executable
    //     optionally replace the icon
    //     re-zip it, and return

    if (electronVersion.startsWith("v")) {
        electronVersion = electronVersion.slice(1)
    }
    if (typeof mainJsContent !== "string" && !(mainJsContent instanceof Uint8Array)) {
        throw Error(`mainJsContent must be a string or Uint8Array`)
    }
    if (iconBytes != null && !(iconBytes instanceof Uint8Array)) {
        throw Error(`iconBytes must be null or a Uint8Array`)
    }
    
    // 
    // download
    // 
        let [ arrayForX86, arrayForArm64 ] = await Promise.all([
            ((async ()=>{
                progressCallback("checking for x86 zip")
                let arrayForX86 = electronZipX86
                if (!arrayForX86) {
                    try {
                        progressCallback("downloading x86 zip")
                        arrayForX86 = new Uint8Array(await (await fetch(`https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-darwin-x64.zip`)).arrayBuffer())
                        progressCallback("extracting x86 zip")
                        arrayForX86 = await zipParse(arrayForX86)
                    } catch (error) {
                        
                    }
                }
                if (!arrayForX86) {
                    if (warnInsteadOfError) {
                        console.warn(`Could not find Electron v${electronVersion} for macOS x86`)
                    } else {
                        throw Error(`Could not find Electron v${electronVersion} for macOS x86`)
                    }
                } else {
                    arrayForX86 = await zipParse(arrayForX86)
                }
                progressCallback("finished processing x86 zip")
                return arrayForX86
            })()),
            ((async ()=>{
                progressCallback("checking for arm64 zip")
                let arrayForArm64 = electronZipArm64
                if (!arrayForArm64) {
                    try {
                        progressCallback("downloading arm64 zip")
                        arrayForArm64 = new Uint8Array(await (await fetch(`https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-darwin-arm64.zip`)).arrayBuffer())
                        progressCallback("extracting arm64 zip")
                        arrayForArm64 = await zipParse(arrayForArm64)
                    } catch (error) {
                        
                    }
                } else {
                    arrayForArm64 = await zipParse(arrayForArm64)
                }
                if (!arrayForArm64) {
                    if (warnInsteadOfError) {
                        console.warn(`Could not find Electron v${electronVersion} for macOS arm64`)
                    } else {
                        throw Error(`Could not find Electron v${electronVersion} for macOS arm64`)
                    }
                }
                progressCallback("finished processing arm64 zip")
                return arrayForArm64
            })())
        ])
    
    // 
    // modify
    // 
    const zips = {}
    for (let [name, zip] of Object.entries({x86: arrayForX86, arm64: arrayForArm64})) {
        if (zip) {
            console.debug(`Object.keys(zip) is:`,JSON.stringify(Object.keys(zip),null,2))
            // TODO: add ability to change the name of the app
            
            // rename executable
            zip['Electron.app/Contents/MacOS/_ElectronCore'] = zip['Electron.app/Contents/MacOS/Electron']
            // add main.js
            zip['Electron.app/Contents/MacOS/main.js'] = mainJsContent
            // replace with app executable
            zip['Electron.app/Contents/MacOS/Electron'] = { content: `#!/usr/bin/env sh\n"$(dirname "$0")/_ElectronCore" "$(dirname "$0")/main.js" "$@"`, executable: true }
            // override icon
            if (iconBytes) {
                zip['Electron.app/Contents/Resources/electron.icns'] = { content: iconBytes, ...zip['Electron.app/Contents/Resources/electron.icns']}
            }
            progressCallback(`building zip for ${name}`)
            zips[name] = await zipCreate(zip)
            progressCallback(`built zip for ${name}`)
        }
    }
    return zips
}