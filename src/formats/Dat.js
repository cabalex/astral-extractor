import { ExplorerFile } from '../core/ExplorerFile.js';
import { readableBytes } from '../core/Explorer.js';
import { loadArrayBufferByType } from '../index.js';
import { Folder } from '../core/Folder.js'

import { QuestViewer } from '../viewers/Dat/QuestViewer.js';
import { EventViewer } from '../viewers/Dat/EventViewer.js';

export class Dat extends Folder {
    // Since partials need to return the full DAT to be loaded, we need to store the original file instead of just loading headers.
    constructor(arrayBuffer, file, fromPartial=false) {
        super(file.name, file.size);

        this.metadata.size = file.metadata ? file.metadata.size : file.size || arrayBuffer.byteLength;
        if (file.metadata) this.metadata.offset = file.metadata.offset || NaN;

        this.arrayBuffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);

        // subtract 28 from offsets (header length)
        this.header = {
            //magic: this.dataView.getUint32(0, true),
            fileCount: this.dataView.getUint32(4, window.settings.littleEndianDAT),
            fileOffsetsOffset: this.dataView.getUint32(8, window.settings.littleEndianDAT),
            fileExtensionsOffset: this.dataView.getUint32(12, window.settings.littleEndianDAT),
            fileNamesOffset: this.dataView.getUint32(16, window.settings.littleEndianDAT),
            fileSizesOffset: this.dataView.getUint32(20, window.settings.littleEndianDAT),
            hashMapOffset: this.dataView.getUint32(24, window.settings.littleEndianDAT)
        }

        let fileOffsetsTable = new Uint32Array(
            arrayBuffer.slice(this.header.fileOffsetsOffset, this.header.fileOffsetsOffset + this.header.fileCount*4)
        );
        let fileSizesTable = new Uint32Array(
            arrayBuffer.slice(this.header.fileSizesOffset, this.header.fileSizesOffset + this.header.fileCount*4)
        );

        if (!window.settings.littleEndianDAT) {
            function swap32(val) {
                return ((val & 0xFF) << 24)
                       | ((val & 0xFF00) << 8)
                       | ((val >> 8) & 0xFF00)
                       | ((val >> 24) & 0xFF);
            }
            
            fileOffsetsTable = fileOffsetsTable.map(val => swap32(val));
            fileSizesTable = fileSizesTable.map(val => swap32(val));
        }

        let textDecoder = new TextDecoder();
        let fileNamesTable = textDecoder.decode(
            arrayBuffer.slice(this.header.fileNamesOffset + 4, this.header.fileSizesOffset)
            ) // +4 to skip integer at beginning of fileNamesTable
            .split('\0')
            .filter(x => x);

        for (let i = 0; i < this.header.fileCount; i++) {
            let name = fileNamesTable[i];
            // duplicate name checking
            if (this.files.has(name)) {
                let i = 1;
                while (this.files.has(name.replace('.', `(${i}).`))) i++;
                name = name.replace('.', `(${i}).`)
            }
            let fileData = arrayBuffer.slice(fileOffsetsTable[i], fileOffsetsTable[i] + fileSizesTable[i]);
            fileData.name = name;
            fileData.size = fileSizesTable[i];
            this.files.set(name, loadArrayBufferByType(fileData, name, fileSizesTable[i]));
        }

        if (this.name.match(/^quest[0-9a-f]{4}/)) {
            this.viewer = new QuestViewer(this);
        } else if (this.name.match(/^ev[0-9a-f]{4}/)) {
            this.viewer = new EventViewer(this);
        } else {
            this.viewer = null;
        }


        if (fromPartial) {
            this.originalFile = null; // no "original file" as it came from PKZ, this class has everything we need
            // Replace all instances with this class
            $(`[id="file-${file.id}"]`).replaceWith(this.render());
            this.addListener();
            this.open();

            let otherFile = this.getOtherFile();
            if (otherFile && otherFile.convertToDAT) otherFile.convertToDAT();
        } else {
            this.originalFile = file; // original file object (uploaded separately)
        }
    }

    addListener() {
        $(`#folder-${this.id}`)
            .off('click').off('contextmenu')
            .on('click', (event) => {
                this.toggle(this);
                event.stopPropagation();
            })
            .on('contextmenu', (event) => {
                event.preventDefault();
                window.explorer.contextMenu.open(event, this.contextMenuOpts());
                event.stopPropagation();
            })
        
        if (this.viewer) this.viewer.addListener();

        this.files.forEach(file => {file.addListener()});
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "OFFSET": this.metadata.offset ? "0x" + Number(this.metadata.offset).toString(16).toUpperCase() : "N/A",
                "FILES": this.size().toString(),
                "SIZE": readableBytes(Number(this.fileSize())),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download all (.ZIP)": this.download,
                "<span class='material-icons'>system_update_alt</span> Export all (.ZIP)": this.export,
                "<span class='material-icons'>auto_fix_high</span> Repack (.DAT)": this.repack,
                "<!--spacing b-->": null,
                "<span class='material-icons'>download</span> Download original (.DAT)": this.downloadOriginal,
                "<!--spacing c-->": null,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    downloadOriginal(save=true) {
        const targetArrayBuffer = this.arrayBuffer;
        
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

    // Gets the .DTT file from a .DAT file and vice versa.
    getOtherFile(scope=this) {
        if (scope.ext == 'dat') {
            let folder = window.explorer.getFolderFromFile(scope);
            return folder.files.get(scope.name.replace('.dat', '.dtt'))
        }
        if (scope.ext == 'dtt') {
            let folder = window.explorer.getFolderFromFile(scope);
            return folder.files.get(scope.name.replace('.dtt', '.dat'))
        }
        return null;
    }

    toggle(scope=this, timing=100) {
        return new Promise((resolve, reject) => {
            scope.isOpen = !scope.isOpen;
            if (scope.isOpen) {
                // if only one folder, open the next one
                if (scope.files.size == 1 && Array.from(scope.files.values())[0].type == 'folder') {
                    let folder = Array.from(scope.files.values())[0];
                    folder.open(folder, 0);
                }

                $(`#folder-${scope.id}`).children('.folder-files').slideDown(timing, resolve());
            } else {
                $(`#folder-${scope.id}`).children('.folder-files').slideUp(timing, resolve());

                // close folders
                scope.files.forEach(file => {
                    if (file.type == 'folder' && file.isOpen) {
                        file.toggle(file);
                    }
                })
            }

            if (scope.ext == 'dat') {
                let otherFile = scope.getOtherFile(scope);
                if (otherFile && otherFile.type == 'folder' && scope.isOpen != otherFile.isOpen) otherFile.toggle(otherFile);
            }
        });
    }

    render() {
        // only show formatted name if it is not the same as the file name
        let output = ''
        if (this.ext == 'dtt' || (this.friendlyName == this.name || this.friendlyName == this.name.replace('.' + this.ext, ''))) {
            // don't look up friendly name for dtt
            output += `<div class="folder ${this.ext}" id="folder-${this.id}">${this.name}`
        } else {
            output += `<div class="folder ${this.ext}" id="folder-${this.id}">${this.friendlyName}<div class="subtext">${this.name}</div>`;
        }
         

        output += `<span class="file-size">${readableBytes(Number(this.metadata.size))}</span><div class="folder-files" ${this.isOpen ? '' : 'style="display: none"'}>${this.viewer ? this.viewer.render() : ''}`;
        this.files.forEach(file => {
            output += file.render();
        })
    
        return output + "</div></div>"
    }
}