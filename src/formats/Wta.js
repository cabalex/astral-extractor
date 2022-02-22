import { ExplorerFile } from "../core/ExplorerFile.js";
import { loadWtaAsCanvas } from "../viewers/Wta/WtaViewer.js";

export class Wta extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size || arrayBuffer.byteLength, arrayBuffer);
    }

    export() {
        return console.warn("Unimplemented export " + window.explorer.getPathFromFile(this).join('/')); // unimplemented
    }

    async load() {
        let directory = window.explorer.getPathFromFile(this).join('/')
            .replace('.wta', '.wtp').replace('.dat', '.dtt');
        let wtp = window.explorer.getFileFromPath(directory);

        if (!wtp) {
            // check in same directory
            directory = window.explorer.getPathFromFile(this).join('/')
            .replace('.wta', '.wtp');
            wtp = window.explorer.getFileFromPath(directory);

            if (!wtp) {
                return new Error(`Cannot preview ${window.explorer.getPathFromFile(this).join('/')} (WTP not found)`);
            }
        }

        let canvases = await loadWtaAsCanvas(await this.getFileArrayBuffer(), await wtp.getFileArrayBuffer());
        return canvases[0]
    }
}