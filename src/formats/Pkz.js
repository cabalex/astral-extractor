import { ExplorerFile } from '../core/ExplorerFile.js';
import { readableBytes } from '../core/Explorer.js';
import { Folder } from '../core/Folder.js';
import { loadFile, loadText } from '../core/loadFile.js';
import { Dat } from './Dat.js';
import { loadArrayBufferByType } from '../index.js';

/*
Loads PKZ files. Usually PKZ files are very large so the file reader only reads the header.
*/

// Represents a partial file within a PKZ.
export class PartialPkzFile extends ExplorerFile {
    constructor(nameOffset, size, offset, compressedSize, name, parent=null) {
        super(name, size);
        this.metadata.nameOffset = nameOffset;
        this.metadata.offset = offset;
        this.metadata.compressedSize = compressedSize;
        this.originalFile = parent; // the original file file (not the folder)
    }

    async convertToDAT() {
        if (['dat', 'dtt', 'evn', 'eff'].includes(this.ext)) {
            let folder = window.explorer.getFolderFromFile(this);
            let newDAT = new Dat(await this.getFileArrayBuffer(), this, true);
            folder.files.set(this.name, newDAT);

            return newDAT;
        } else {
            console.warn("Unsupported file conversion");
            return null;
        }
    }

    async load() {
        await this.convertToDAT();
        return 'Loaded';
    }

    async view() {
        await this.load().catch(error => {$('main').html(error); console.error(error)});
        // don't set window.loaded and do load logic because nothing has been loaded into main
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "OFFSET": "0x" + Number(this.metadata.offset).toString(16).toUpperCase(),
                "SIZE": readableBytes(Number(this.metadata.size)),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download (.DAT)": this.download,
                "<span class='material-icons'>system_update_alt</span> Load full file": this.load,
                "<!--spacing b-->": null,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    async getFileArrayBuffer() {
        if (this.originalFile) {
            const decoder = new ZSTDDecoder();
            await decoder.init();
            const decompressedArray = decoder.decode(new Uint8Array(
                await loadFile(this.originalFile.slice(Number(this.metadata.offset), Number(this.metadata.offset + this.metadata.compressedSize)))
            ), Number(this.metadata.size));
            return decompressedArray.buffer;
        }
        return new ArrayBuffer();
    }
}

class PkzFileFramework {
    constructor(nameOffset, size, offset, compressedSize, parent=null, name=null) {
        this.nameOffset = nameOffset,
        this.size = size,
        this.offset = offset,
        this.compressedSize = compressedSize,
        this.name = name,
        this.parent = parent
    }
    // Convert to full partial from header. If not a supported file type (.dat/.dtt) then returns the full file.
    async convertToPartialPkzFile() {
        let partialPkzFile = new PartialPkzFile(this.nameOffset, this.size, this.offset, this.compressedSize, this.name, this.parent);
        if (['dat', 'dtt', 'evn', 'eff'].includes(partialPkzFile.ext)) return partialPkzFile; 
        
        // convert to full file if not a .DAT
        return loadArrayBufferByType(await partialPkzFile.getFileArrayBuffer(), this.name, this.size);
    }
}

// Loads PKZ headers and returns the result needed to make a new PKZ.
export async function loadPkzHeader(file) {
    // load header
    let headerArrayBuffer = await loadFile(file.slice(0, 32));
    let headerDataView = new DataView(headerArrayBuffer);

    let header = {
        // magic: headerDataView.getUint32(0, true),
        // version: headerDataView.getUint32(4, true),
        size: headerDataView.getBigUint64(8, true),
        fileCount: headerDataView.getUint32(16, true),
        fileDescriptorsOffset: headerDataView.getUint32(20, true),
        fileNameTableLength: headerDataView.getBigUint64(24, true),
    }

    // Load partial file data (name offset, size, offset, compressed size)
    let fileTable = await loadFile(file.slice(header.fileDescriptorsOffset, header.fileDescriptorsOffset + header.fileCount * 32));
    let partialFiles = [];

    for (let i = 0; i < header.fileCount; i++) {
        partialFiles.push(
            /*new PartialPkzFile(
                ...new BigUint64Array(fileTable.slice(i*32, (i+1)*32))
            )*/
            new PkzFileFramework(...new BigUint64Array(fileTable.slice(i*32, (i+1)*32)), file)
        );
    }

    // get file names and assign them
    let newOffset = header.fileDescriptorsOffset + header.fileCount * 32;
    let fileNames = await loadText(file.slice(newOffset, newOffset + Number(partialFiles[0].offset)))

    for (let i = 0; i < partialFiles.length; i++) {
        partialFiles[i].name = fileNames.slice(
            Number(partialFiles[i].nameOffset),
            i + 1 < partialFiles.length ? Number(partialFiles[i+1].nameOffset) : undefined
        );
        partialFiles[i].name = partialFiles[i].name.split('\0')[0];
    }

    // convert the frameworks into explorerfiles
    return [header, await Promise.all(partialFiles.map(f => f.convertToPartialPkzFile())), file];
}


export class Pkz extends Folder {
    // constructs with the header, files, and root file from loadPKZHeader.
    constructor(header, files, pkzFile) {
        super(pkzFile.name);

        this.header = header;
        this.rootFile = pkzFile;
        this.name = this.rootFile.name;

        files.forEach(file => this.files.set(file.name, file));
        console.log(this.files)
    }

    async openAll() {
        this.files.forEach(async file => {
            if (file instanceof PartialPkzFile) {
                await file.convertToDAT();
            }
        })
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "FILES": this.files.size.toString(),
                "LOADED FILES": this.size().toString(),
                "SIZE": readableBytes(Number(this.fileSize())),
                "COMPRESSED": readableBytes(Number(this.header.size)),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download all (.ZIP)": this.download,
                "<span class='material-icons'>system_update_alt</span> Export all (.ZIP)": this.exportAll,
                "<span class='material-icons'>auto_fix_high</span> Repack (.PKZ)": this.repack,
                "<!--spacing b-->": null,
                "<span class='material-icons'>open_in_new</span> Open all": this.openAll,
                "<!--spacing c-->": null,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    async repack() {
        console.warn('Not implemented - repacking')
    }
}