import { loadDDS } from './formats/DDS.js';
import { getImageData } from './formats/swizzle.js';

// https://github.com/Kerilk/bayonetta_tools/blob/master/binary_templates/Astral%20Chain%20wta.bt


// Loads a WTA/WTP combo as a canvas element and returns the element.
export async function loadWtaTextureAsCanvas(texture, wtpArrayBuffer) {
    // deswizzle
    let blockHeightLog2 = texture.info.textureLayout & 7;
    let wtpImageData = getImageData(texture, wtpArrayBuffer.slice(texture.offset, texture.offset + texture.size), blockHeightLog2);

    if (texture.info.format.includes('ASTC')) {
        // ASTC
        console.warn('ASTC not supported')
        var canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = '15px Work Sans';
        ctx.fillText('ASTC Not supported.', 10, 50);

    } else {
        // DDS
        var canvas = loadDDS(texture, wtpImageData);
    }

    return canvas;
}