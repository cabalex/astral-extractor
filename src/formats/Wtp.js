import { ExplorerFile } from "../core/ExplorerFile.js";

export class Wtp extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size || arrayBuffer.byteLength, arrayBuffer);
    }

    async load() {
        return '<div>Load the .WTA file instead.</div>'
    }
}