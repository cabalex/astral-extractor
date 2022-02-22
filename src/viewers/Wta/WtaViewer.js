import { loadDDS } from './formats/DDS.js';
import { getImageData } from './formats/swizzle.js';

// https://github.com/Kerilk/bayonetta_tools/blob/master/binary_templates/Astral%20Chain%20wta.bt

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

function loadWtaTextureInfo(arrayBuffer, dataView, offset) {
    if (!textureFormats[dataView.getUint32(offset + 28, true)]) {
        console.warn("Unknown texture format " + dataView.getUint32(offset + 28, true));
    }
    return {
        fourCC: dataView.getUint32(offset, true), // 3232856 - XT1\X00
        //unk1: dataView.getUint32(offset + 4, true),
        textureSize: dataView.getBigUint64(offset + 8, true),
        headerSize: dataView.getUint32(offset + 16, true),
        mipMapCount: dataView.getUint32(offset + 20, true),
        type : surfaceTypes[dataView.getUint32(offset + 24, true)],
        format: textureFormats[dataView.getUint32(offset + 28, true)],
        width: dataView.getUint32(offset + 32, true),
        height: dataView.getUint32(offset + 36, true),
        depth: dataView.getUint32(offset + 40, true),
        //unk2: dataView.getUint32(offset + 44, true),
        textureLayout: dataView.getUint32(offset + 48, true),
        //unk3: dataView.getUint32(offset + 52, true),

        arrayCount: (surfaceTypes[dataView.getUint32(offset + 24, true)].includes('T_Cube') ? 6 : 1),
    }
}
class WtaData {
    constructor(data) {
        this.data = data;
        this.dataView = new DataView(data);

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
        this.textures = [];
        for (let i = 0; i < this.header.textureCount; i++) {
            this.textures.push({
                offset: this.dataView.getUint32(this.header.textureOffsetsOffset + i * 4, true),
                size: this.dataView.getUint32(this.header.textureSizesOffset + i * 4, true),
                flags: this.dataView.getUint32(this.header.textureFlagsOffset + i * 4, true),
                id: this.dataView.getUint32(this.header.textureIdsOffset + i * 4, true),
                info: loadWtaTextureInfo(data, this.dataView, this.header.textureInfoOffset + i * 56)
            })
        }
    }
}

// Loads a WTA/WTP combo as a canvas element and returns the element.
export async function loadWtaAsCanvas(wtaArrayBuffer, wtpArrayBuffer) {
    const canvases = [];

    // Load WTA header and texture data
    const wta = new WtaData(wtaArrayBuffer);
    
    console.log(wta)
    for (let i = 0; i < wta.textures.length; i++) {
        let texture = wta.textures[i];
        // deswizzle
        let blockHeightLog2 = texture.info.textureLayout & 7;
        let wtpImageData = getImageData(texture, wtpArrayBuffer.slice(texture.offset, texture.offset + texture.size), blockHeightLog2);

        if (wta.textures[i].info.format.includes('ASTC')) {
            // ASTC
            console.warn('ASTC not supported')
            var canvas = document.createElement('canvas');
        } else {
            // DDS
            var canvas = loadDDS(texture, wtpImageData);
        }

        canvases.push(canvas);
    }
    return canvases;
}