import { Pkz, loadPkzHeader } from './formats/Pkz.js';
import { Dat } from './formats/Dat.js';
import { Bxm } from './formats/Bxm.js';
import { Csv } from './formats/Csv.js';

import { Wta } from './formats/Wta.js';
import { Wtp } from './formats/Wtp.js';
import { Wmb } from './formats/Wmb.js';


import { loadFile } from './core/LoadFile.js';
import { Explorer } from './core/Explorer.js';
import { StatusBar } from './core/StatusBar.js';
import { ExplorerFile } from './core/ExplorerFile.js';

// Loads a file using the File object.
export async function loadFileByType(file) {
    const fileTypeRegex = new RegExp(/\.([a-zA-Z]{3,})$/);

    // Regex gets the first capturing group (Excludes ., e.g. file.pkz becomes pkz)
    switch(file.name.match(fileTypeRegex)[1]) {
        case 'pkz':
            return new Pkz(...await loadPkzHeader(file));
        case 'dat':
        case 'dtt':
        case 'evn':
            return new Dat(await loadFile(file), file);
        case 'bxm':
        case 'sop':
            return new Bxm(await loadFile(file), file.name, file.size);
        case 'csv':
            return new Csv(await loadFile(file), file.name, file.size);
        case 'wta':
            return new Wta(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'wtp':
            return new Wtp(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'wmb':
            return new Wmb(arrayBuffer, name, size || arrayBuffer.byteLength);
        default:
            console.warn("Unsupported file: " + name);
            return new ExplorerFile(file.name, file.size);
    }
}

// Loads a file using an ArrayBuffer, name, and size. Used for loading files from already loaded files (e.g. DAT).
export function loadArrayBufferByType(arrayBuffer, name, size) {
    const fileTypeRegex = new RegExp(/\.([a-zA-Z]{3,})$/);

    // Regex gets the first capturing group (Excludes ., e.g. file.pkz becomes pkz)
    switch(name.match(fileTypeRegex)[1]) {
        case 'bxm':
        case 'sop':
            return new Bxm(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'csv':
            return new Csv(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'wta':
            return new Wta(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'wtp':
            return new Wtp(arrayBuffer, name, size || arrayBuffer.byteLength);
        case 'wmb':
            return new Wmb(arrayBuffer, name, size || arrayBuffer.byteLength);
        default:
            console.warn("Unsupported file: " + name);
            return new ExplorerFile(name, size);
    }
}


async function loadFiles(files) {
    if (!window.explorer || window.explorer instanceof HTMLElement) {
        window.explorer = new Explorer();
    }
    const stats = {
        success: 0,
        error: 0
    }
    
    for (var i = 0; i < files.length; i++) {
        try {
            let file = await loadFileByType(files[i]);
            window.explorer.rootDirectory.files.set(file.name, file);
            stats.success++;
        } catch(e) {
            console.error(e);
            stats.error++;
        }
    }
    window.explorer.render();

    $('#upload-bar').css('width', '0%');
    window.statusBar.setMessage(`Loaded ${files.length} files (${stats.success} success, ${stats.error} error)`, 3000);
    $('#deleteFiles').css('width', '50px')
}

export function deleteFiles() {
    delete window.explorer;
    $('#explorer').html('')
    $('#deleteFiles').css('width', '0px')
    $('main').html('');
    $('#file-data-content').text("Imports inside a file will show up here.\nYou can click this to copy its text!")
    if (window.loaded) {
        window.loaded.unload();
    }
}



// load settings from local storage if available, or load defaults
let settings = localStorage.getItem('astralExtractorSettings') ||
{
    useLookupTable: true,
    textureExportFormat: 'png',
    modelExportFormat: 'gltf',
    littleEndianDAT: true
};

if (typeof settings == 'string') settings = JSON.parse(settings);

window.settings = settings;


$(document).ready(function () {
    $('#uploadInput').change(function() {
        loadFiles(this.files);
        $(this).val('');
    })
    $('#dropzone').on('dragover', function(ev) {
        ev.preventDefault();
    })
    $('#dropzone').on('drop', function(ev) {
        ev.preventDefault();
        if (ev.originalEvent) ev = ev.originalEvent;

        let files = [];
        console.log(ev)
        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                    files.push(ev.dataTransfer.items[i].getAsFile());
                }
            }
        } else {
            // Use DataTransfer interface to access the file(s)
            for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                files.push(ev.dataTransfer.files[i]);
            }
        }
        if (files.length > 0) {
            loadFiles(files);
        }
        $("#dropzone").css('display', 'none');
    })

    $('#deleteFiles').click(deleteFiles);

    window.statusBar = new StatusBar();

    // File drag support - https://stackoverflow.com/questions/6848043/how-do-i-detect-a-file-is-being-dragged-rather-than-a-draggable-element-on-my-pa
    $(document).on('dragover', function(e) {
        var dt = e.originalEvent.dataTransfer;
        if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
            $("#dropzone").css('display', 'flex');
            window.clearTimeout(window.dragTimer);
        }
    });
    $(document).on('dragleave', function(e) {
        window.dragTimer = window.setTimeout(function() {
            $("#dropzone").css('display', 'none');
        }, 25);
    });

    // Settings menus
    $('select').each(function() {
        switch($(this).attr('id')) {
            case 'datByteOrder':
                $(this).val(window.settings.littleEndianDAT.toString());
                break;
            case 'textureExportFormat':
                $(this).val(window.settings.textureExportFormat);
                break;
            case 'modelExportFormat':
                $(this).val(window.settings.modelExportFormat);
                break;
        }
    })
    $('select').change(function() {
        switch($(this).attr('id')) {
            case 'datByteOrder':
                window.settings.littleEndianDAT = $(this).val() == 'true';
                break;
            case 'textureExportFormat':
                window.settings.textureExportFormat = $(this).val();
                break;
            case 'modelExportFormat':
                window.settings.modelExportFormat = $(this).val();
                break;
        }

        localStorage.setItem('astralExtractorSettings', JSON.stringify(window.settings));
    })
});
