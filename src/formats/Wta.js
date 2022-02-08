import { ExplorerFile } from "../core/ExplorerFile.js";

export class Wta extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size || arrayBuffer.byteLength);
    }
}