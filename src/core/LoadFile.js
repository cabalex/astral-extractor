// Loads a file with filereader.
export function loadFile(file) {
    return new Promise((resolve, reject) => {
        if (file instanceof ArrayBuffer) return file;
        
        const reader = new FileReader();

        reader.onload = function (e) {
            resolve(e.target.result);
        }
        
        reader.onerror = function (e) {
            reject(e);
        }

        reader.readAsArrayBuffer(file);
    });
}

export function loadText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            resolve(e.target.result);
        }
        
        reader.onerror = function (e) {
            reject(e);
        }

        reader.readAsText(file);
    });
}