import { Search } from './Search.js';
import { ContextMenu } from './ContextMenu.js'
import { loadFileByType, deleteFiles } from '../index.js';


import { RootFolder, Folder } from './Folder.js';
import { ExplorerFile } from './ExplorerFile.js';

export function readableBytes(bytes) {
    if (bytes == 0) return "0 B";

    let i = Math.floor(Math.log(bytes) / Math.log(1024));
    let sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}

/*
Represents the Explorer component.
*/
export class Explorer {
    constructor(files=[]) {
        this.rootDirectory = new RootFolder('root');
        
        for (let file of files) {
            loadFileByType(file);
        }

        this.search = new Search(this);
        this.contextMenu = new ContextMenu(this);
        this.loadedFile = null;
    }

    createPathForFile(file) {
        let path = file.absolutePath.split('/');
        let currentFolder = this.rootDirectory;
        for (let i = 0; i < path.length - 1; i++) {
            if (!currentFolder.files.get(path[i])) {
                currentFolder.files.set(path[i], new Folder(path.slice(i, i + 1)));
            }
            currentFolder = currentFolder.files.get(path[i]);
        }
        currentFolder.files.set(file.name, file);
    }

    // finds a file by instance, returning a path array if found and null if not.
    getPathFromFile(file) {
        function findPath(folder, path) {
            if (!(folder instanceof RootFolder)) path.push(folder.name);

            for (const [key,  value] of folder.files.entries()) {
                if (value.id === file.id) {
                    path.push(key);
                    return path;
                }
                if (value.type == 'folder') {
                    let result = findPath(value, JSON.parse(JSON.stringify(path)));
                    
                    if (result) return result;
                }
            }
            return null;
        }

        return findPath(this.rootDirectory, []);
    }

    getFolderFromFile(file) {
        let searchByName = typeof file == 'string';
        let name = searchByName ? file : file.name;

        function findFolder(folder) {
            for (const [key,  value] of folder.files.entries()) {
                if (key == name) {
                    return folder;
                }
                if (value.type == 'folder') {
                    let result = findFolder(value);
                    
                    if (result) {
                        return result;
                    };
                }
            }
            return null;
        }

        return findFolder(this.rootDirectory);
    }

    // Make sure the file or folder's delete function has been called before this!
    deleteFileById(id) {
        let found = false;

        function findFolder(folder) {
            folder.files.forEach((value, key) => {
                if (value.id == id) {
                    folder.files.delete(key);
                    found = true;
                    return true;
                }
                if (value.type == 'folder') {
                    findFolder(value);
                    if (found) {
                        return true;
                    };
                }
            });
        }

        findFolder(this.rootDirectory);

        if (this.rootDirectory.files.size == 0) {
            deleteFiles();
        }
    }

    // gets a file from a path.
    getFileFromPath(path) {
        path = path.split('/');

        let currentFolder = this.rootDirectory;
        for (let i = 0; i < path.length - 1; i++) {
            currentFolder = currentFolder.files.get(path[i]);
            currentFolder.open();
        }

        return currentFolder.files.get(path[path.length - 1]);
    }

    navigatePathForFile(file) {
        var currentFolder;
        if (typeof file === 'string') {
            currentFolder = this.getFileFromPath(file);
        } else {
            currentFolder = this.getFileFromPath(file.explorer + '/' + file.id);
        }

        if (currentFolder instanceof Folder) {
            currentFolder.open();
            var path = `[id="folder-${currentFolder.id}"]`
        } else {
            var path = `[id="file-${currentFolder.id}"]`
        }
        setTimeout(() => {
            $('#explorer').scrollTo($(path), 100, {axis: 'y', offset: {top: -100}});
            $(path).css('animation', 'attention 1s ease-out');
            setTimeout(() => {$(path).css('animation', '')}, 1000);
        }, 100)
    }

    render() {
        var output = `<div id="explorer">` + this.search.render();

        output += this.rootDirectory.render();
        $('#explorer').replaceWith(output + '</div>');
        this.rootDirectory.addListener();
        this.search.addListener();
    }
}