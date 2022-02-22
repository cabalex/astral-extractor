import { lookup } from './LookupTable.js'
import { readableBytes } from './Explorer.js'

export class ExplorerFile {
    constructor(name, size, arrayBuffer=null) {
        this.type = 'file';
        this.name = name || "";
        this.id = `${this.name.replace('.', '')}-${Date.now()}`;
        this.ext = name && name.includes('.') ? name.match(/\.([a-zA-Z0-9]{3,})$/)[1] : '';
        this.friendlyName = lookup(name);
        this.metadata = {
            size: size
        }

        if (arrayBuffer) {
            this.arrayBuffer = arrayBuffer;
        }
    }

    setName(name) {
        this.name = name;
        this.ext = name.match(/\.([a-zA-Z]{3,})$/)[1];
        this.friendlyName = lookup(name);
    }

    addListener() {
        $(`[id="file-${this.id}"]`)
            .off('click').off('contextmenu')
            .on('click', (event) => {
                this.view();
                event.stopPropagation();
            })
            .on('contextmenu', (event) => {
                event.preventDefault();
                window.explorer.contextMenu.open(event, this.contextMenuOpts());
                event.stopPropagation();
            })
    }

    addLoadListener() {
        // Nothing as the default loader does not contain any buttons
    }

    // Gets a file's Array Buffer, or returns an empty one if it does not exist.
    async getFileArrayBuffer() {
        return this.arrayBuffer || new ArrayBuffer();
    }

    // downloads the file.
    async download(save=true) {
        const targetArrayBuffer = await this.getFileArrayBuffer();
        
        if (!save) return targetArrayBuffer;
        
        const uri = URL.createObjectURL(new Blob([targetArrayBuffer], {type: "application/octet-stream"}));

        const link = document.createElement("a");
        link.setAttribute('download', this.name);
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(uri);
    }

    export() {
        return console.warn("Unimplemented export " + window.explorer.getPathFromFile(this).join('/')); // unimplemented
    }

    load() {
        return new Promise((resolve, reject) => {
            reject(`<div>Cannot preview this file (${window.explorer.getPathFromFile(this).join('/')})</div>`)
        });
    }

    unload() {
        return false;
    }

    async view() {
        if (window.loaded) {
            window.loaded.unload();
        }
        $('#file-data-content').text('');

        $('main').html(await this.load().catch(error => {$('main').html(error); console.error(error)}));
        window.loaded = this;
        this.addLoadListener();

        window.statusBar.setMessage(`Loaded ${this.name}`, 2000);
    }

/*getUint32(offset2, endianness=true) {
        let offset = Number(this.metadata.offset) + this.metadata.byteLength;
        return this.originalPak.dataView.getUint32(offset + offset2, endianness);
    }

    getBigUint64(offset2, endianness=true) {
        let offset = Number(this.metadata.offset) + this.metadata.byteLength;
        return this.originalPak.dataView.getBigUint64(offset + offset2, endianness);
    }

    sliceArrayBuffer(start, end) {
        let offset = Number(this.metadata.offset) + this.metadata.byteLength;
        return this.originalPak.dataView.buffer.slice(offset + start, offset + end);
    }*/

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "SIZE": readableBytes(Number(this.metadata.size)),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download": this.download,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    delete() {
        window.explorer.deleteFileById(this.id);
        $(`[id="file-${this.id}"]`).remove();
    }

    render() {
        // only show formatted name if it is not the same as the file name
        if (this.ext == 'dtt' || (this.friendlyName == this.name || this.friendlyName == this.name.replace('.' + this.ext, ''))) {
            // don't look up friendly name for dtt
            return `<div class="explorerFile ${this.ext}" id="file-${this.id}">${this.name}<span class="file-size">${readableBytes(Number(this.metadata.size))}</span></div>`
        }
        return `<div class="explorerFile ${this.ext}" id="file-${this.id}">${this.friendlyName}` +
            (this.friendlyName == this.name ? '' : `<div class="subtext">${this.name}</div>`) + `<span class="file-size">${readableBytes(Number(this.metadata.size))}</span></div>`;
    }
}