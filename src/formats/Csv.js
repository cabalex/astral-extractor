import { ExplorerFile } from "../core/ExplorerFile.js";
import { readableBytes } from "../core/Explorer.js";

export class Csv extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size || arrayBuffer.byteLength);
        this.arrayBuffer = arrayBuffer;
    }

    load() {
        return new Promise((resolve, reject) => {
            if (!window.TextDecoder) reject('<div>Browser does not support TextDecoder :(</div>');
            let decoder = new TextDecoder('shift-jis');
            let text = decoder.decode(new Uint8Array(this.arrayBuffer));
            resolve(`<div class="text">${text}</div>`);
        })
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "SIZE": readableBytes(Number(this.metadata.size)),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download (UTF-8)": this.toUtf8,
                "<span class='material-icons'>system_update_alt</span> Repack (SHIFT-JIS)": this.repack,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    async getFileArrayBuffer() {
        return this.arrayBuffer;
    }
}