import { GLTFLoader } from './GLTFLoader.js';

// Loads a map by its ID (e.g, "r100") and returns the scene in which the object is contained.
export function loadMap(mapId) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        loader.load(`../../../assets/maps/${mapId}.glb`, function(gltf) {
            // maps are rotated for some reason
            gltf.scene.children.forEach((child) => {
                child.partOfMap = true; // Detection later
            })

            resolve(gltf.scene);
        }, undefined, function(error) {
            reject(error);
        })
    })   
}