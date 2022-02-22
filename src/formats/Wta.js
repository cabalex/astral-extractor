import { ExplorerFile } from "../core/ExplorerFile.js";
import { Folder } from "../core/Folder.js";
import { readableBytes } from "../core/Explorer.js";
import { loadWtaTextureAsCanvas } from "../viewers/Wta/WtaViewer.js";

const surfaceTypes = [
    'T_1D', 'T_2D', 'T_3D',
    'T_Cube',
    'T_1D_Array', 'TD_2D_Array', 'T_2D_Multisample', 'T_2D_Multisample_Array',
    'T_Cube_Array'
];

const textureFormats = {
    // DDS
    0x25: "R8G8B8A8_UNORM",
    
    0x42: "BC1_UNORM",
    0x43: "BC2_UNORM",
    0x44: "BC3_UNORM",
    0x45: "BC4_UNORM",
    0x46: "BC1_UNORM_SRGB",
    0x47: "BC2_UNORM_SRGB",
    0x48: "BC3_UNORM_SRGB",
    0x49: "BC4_SNORM",
    0x50: "BC6H_UF16",
    // ASTC (weird texture formats ??)
    0x2D: "ASTC_4x4_UNORM",
    0x38: "ASTC_8x8_UNORM",
    0x3A: "ASTC_12x12_UNORM",
    // ASTC
    0x79: "ASTC_4x4_UNORM",
    0x80: "ASTC_8x8_UNORM",
    0x87: "ASTC_4x4_SRGB",
    0x8E: "ASTC_8x8_SRGB"
}

function loadWtaTextureInfo(dataView, offset) {
    if (!textureFormats[dataView.getUint32(offset + 28, true)]) {
        console.warn(`Unknown texture format ${dataView.getUint32(offset + 28, true)} - Using BC3_UNORM`);
    }
    return {
        fourCC: dataView.getUint32(offset, true), // 3232856 - XT1\X00
        //unk1: dataView.getUint32(offset + 4, true),
        textureSize: dataView.getBigUint64(offset + 8, true),
        headerSize: dataView.getUint32(offset + 16, true),
        mipMapCount: dataView.getUint32(offset + 20, true),
        type : surfaceTypes[dataView.getUint32(offset + 24, true)] || 'T_2D',
        format: textureFormats[dataView.getUint32(offset + 28, true)] || 'BC3_UNORM',
        width: dataView.getUint32(offset + 32, true),
        height: dataView.getUint32(offset + 36, true),
        depth: dataView.getUint32(offset + 40, true),
        //unk2: dataView.getUint32(offset + 44, true),
        textureLayout: dataView.getUint32(offset + 48, true),
        //unk3: dataView.getUint32(offset + 52, true),

        arrayCount: (surfaceTypes[dataView.getUint32(offset + 24, true)].includes('T_Cube') ? 6 : 1),
    }
}

export class Wta extends Folder {
    constructor(arrayBuffer, name, size) {
        super(name);
        this.metadata = {size: size}

        // Load header and texture data on load
        this.arrayBuffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);

        this.header = {
            magic: this.dataView.getUint32(0, true), // WTB\x00
            flags: this.dataView.getUint32(4, true),
            textureCount: this.dataView.getUint16(8, true),
            textureOffsetsOffset: this.dataView.getUint32(0x0C, true),
            textureSizesOffset: this.dataView.getUint32(0x10, true),
            textureFlagsOffset: this.dataView.getUint32(0x14, true),
            textureIdsOffset: this.dataView.getUint32(0x18, true),
            textureInfoOffset: this.dataView.getUint32(0x1C, true)
        }

        for (let i = 0; i < this.header.textureCount; i++) {
            let texture = {
                offset: this.dataView.getUint32(this.header.textureOffsetsOffset + i * 4, true),
                size: this.dataView.getUint32(this.header.textureSizesOffset + i * 4, true),
                flags: this.dataView.getUint32(this.header.textureFlagsOffset + i * 4, true),
                id: this.dataView.getUint32(this.header.textureIdsOffset + i * 4, true),
                info: loadWtaTextureInfo(this.dataView, this.header.textureInfoOffset + i * 56)
            }
            let name = texture.id.toString(16);
            
            this.files.set(name, new WtaTextureFile(name, texture, this))
        }
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

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "TEXTURES": this.size().toString(),
                "SIZE": readableBytes(Number(this.metadata.size)),
                "DATA SIZE": readableBytes(Number(this.fileSize())),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download all": this.downloadAll,
                "<span class='material-icons'>system_update_alt</span> Export all": this.exportAll,
                "<!--spacing b-->": null,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    export() {
        return console.warn("Unimplemented export " + window.explorer.getPathFromFile(this).join('/')); // unimplemented
    }
}

class WtaTextureFile extends ExplorerFile {
    constructor(name, texture, parent) {
        super(name, texture.size);
        
        Object.assign(this.metadata, texture); // Copy texture data

        this.parent = parent;
    }

    async load() {
        // Find WTP file.
        let directory = window.explorer.getPathFromFile(this);
        directory.pop()
        
        let directoryPath = directory.join('/')
            .replace('.wta', '.wtp').replace('.dat', '.dtt');
        let wtp = window.explorer.getFileFromPath(directoryPath);
        
        if (!wtp) {
            // check in same directory
            directoryPath = directory.join('/')
                .replace('.wta', '.wtp');
            wtp = window.explorer.getFileFromPath(directoryPath);

            if (!wtp) {
                return new Error(`Cannot preview ${window.explorer.getPathFromFile(this).join('/')} (WTP not found)`);
            }
        }

        return await loadWtaTextureAsCanvas(this.metadata, await wtp.getFileArrayBuffer());
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "SIZE": readableBytes(Number(this.metadata.size)),
                "TYPE": this.metadata.info.type,
                "FORMAT": this.metadata.info.format,
                "DIMS": `${this.metadata.info.width}x${this.metadata.info.height}x${this.metadata.info.depth}`,
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download": this.download,
                "<span class='material-icons'>system_update_alt</span> Export": this.export,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    render() {
        // friendly names don't exist
        return `<div class="explorerFile ${this.ext}" id="file-${this.id}">${this.name}<span class="file-size">${this.metadata.info.format} - ${readableBytes(Number(this.metadata.size))}</span></div>`
    }
}