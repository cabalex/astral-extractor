// Note: there are much better and faster ways of doing this... but I'm too lazy to rewrite existing libraries lol
import { returnFormatTable } from './swizzle.js';
import { DDSLoader } from '../../THREE/DDSLoader.js';
import * as THREE from 'https://cdn.skypack.dev/three';

function getDDSHeader(textureInfo) {
    let fourCC, additionalHeaders = [];

    if (textureInfo.info.format === 'BC6H_UF16') {
        // DX10
        fourCC = 808540228;
        // BC6H has additional header data
        additionalHeaders = [
            0x5F,
            0x3,
            0,
            1,
            0
        ]
    } else if (textureInfo.info.format.startsWith('BC1')) {
        // DXT1
        fourCC = 827611204;
    } else if (textureInfo.info.format.startsWith('BC2')) {
        // DXT3
        fourCC = 861165636;
    } else {
        // DXT5
        fourCC = 894720068;
    }

    return Uint32Array.from([
        542327876, // magic DDS\x20
        124, // header size
        0x1 + 0x2 + 0x4 + 0x1000 + 0x20000 + 0x80000, // Defaults (caps, height, width, pixelformat) + mipmapcount and linearsize
        textureInfo.info.height,
        textureInfo.info.width,
        textureInfo.info.format == 'R8G8B8A8_UNORM' ?
            ((textureInfo.info.width + 1) >> 1) * 4 :
            Math.round(Math.max(1, ((textureInfo.info.width + 3) / 4) ) * returnFormatTable(textureInfo.info.format)[0]), // pixel format
        textureInfo.info.depth, // depth
        1, // mipmap count - Setting this to the normal value breaks everything, don't do that
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // reserved[11]
        
        32, // ddpf size
        0x4, // flags
        fourCC, // fourCC
        0, 0, 0, 0, 0, // rgb bit masks
        4198408, // caps
        0, // caps2
        0, // caps3
        0, // caps4
        0, // reserved
        
        // BC6H_UF16
        ...additionalHeaders
    ]).buffer
}

function loadDDSTexture(textureInfo, textureData, callback=undefined) {
    // Add header to data
    let ddsFile = new Uint8Array(getDDSHeader(textureInfo).byteLength + textureData.byteLength);
    let ddsHeader = getDDSHeader(textureInfo);
    ddsFile.set(new Uint8Array(ddsHeader));
    ddsFile.set(new Uint8Array(textureData), ddsHeader.byteLength);
    let blob = new Blob([ddsFile.buffer], { type: 'image/dds', name: 'image.dds' });

    let ddsLoader = new DDSLoader();
    return ddsLoader.load(URL.createObjectURL(blob), callback);
}

export function loadDDS(textureInfo, textureData) {
    // set up the scene
    let scene = new THREE.Scene();
    //let camera = new THREE.PerspectiveCamera(50, textureInfo.info.width / textureInfo.info.height, 0.1, 1000);
    let camera = new THREE.OrthographicCamera(-textureInfo.info.width, textureInfo.info.width, textureInfo.info.height, -textureInfo.info.height, 0.1, 5000);
    camera.position.z = 5;
    camera.lookAt(0, 0, 0)

    let renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setSize( textureInfo.info.width, textureInfo.info.height );


    let texture = loadDDSTexture(textureInfo, textureData, () => { renderer.render(scene, camera); });

    

    // add a plane
    let geometry = new THREE.PlaneGeometry(2, 2);
    geometry.scale.x = textureInfo.info.width;
    geometry.scale.y = textureInfo.info.height;
    let material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    let mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    mesh.scale.set(textureInfo.info.width, textureInfo.info.height, 1);
    mesh.rotation.x = Math.PI; // Rotate the image around so that it displays correctly

    return renderer.domElement;
}

/* Failed attempt with OPENGL. May revisit in the future, but I couldn't get anything to display to the canvas.
// Loads a DDS texture into a canvas element.
export function loadDDS(textureInfo, textureData) {
    let canvas = document.createElement('canvas');
    let gl = canvas.getContext('webgl');

    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return null;
    }


    canvas.width = textureInfo.info.width;
    canvas.height = textureInfo.info.height;

    gl.viewport(0, 0, textureInfo.info.width, textureInfo.info.height);

    gl.clearColor(0.0, 0.0, 0.0, 0.1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var ext = (
        gl.getExtension('WEBGL_compressed_texture_s3tc_srgb') ||
        gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc_srgb') ||
        gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc_srgb')
      );
    
    
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.compressedTexImage2D(
        gl.TEXTURE_2D,
        1,
        ext.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT,
        textureInfo.info.width,
        textureInfo.info.height,
        0,
        new Uint8Array(textureData));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

    gl.activeTexture(gl.TEXTURE0);
    gl.generateMipmap(gl.TEXTURE_2D);
    console.log(texture)


    return canvas;
}
*/