import { readableBytes } from './Explorer.js';
import { lookup } from './LookupTable.js';

export function sortFiles(files) {
    // match by file name
    return new Map([...files.entries()].sort((a, b) => {
        if (a[0].includes('.') && !b[0].includes('.')) {
            return 1;
        } else if (!a[0].includes('.') && b[0].includes('.')) {
            return -1;
        } else {
            return a[0] > b[0] ? 1 : -1;
        }
    }));
}

export class Folder {
    // Constructs a folder based on its name.
    constructor(name) {
        this.type = "folder";

        this.metadata = {};

        this.name = name;
        this.id = `${name.replace('.', '')}-${Date.now()}`;
        this.ext = name.split('.').length > 1 ? name.split('.')[name.split('.').length - 1] : '';

        this.friendlyName = lookup(name);

        this.files = new Map();
        this.isOpen = false;
    }

    // toggles the folder's open state. Returns a promise that resolves when the animation completes.
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
        });
    }

    open(scope=this, timing=100) {
        if (!scope.isOpen) {
            scope.toggle(scope, timing);
        }
    }

    close(scope=this, timing=100) {
        if (scope.isOpen) {
            scope.toggle(scope, timing);
        }
    }

    // searches by query and returns any result that matches the string.
    search(query) {
        var result = [];
        this.files.forEach((elem) => {
            if (elem.type == 'folder' && elem.files.size > 0) {
                result.push(...elem.search(query));
            }
            if (elem.name.toLowerCase().includes(query.toLowerCase()) ||
                (elem.friendlyName && elem.friendlyName.toLowerCase().includes(query.toLowerCase()))) {
                result.push(elem);
            }
        })
        return result;
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
        this.files.forEach(file => {file.addListener()});
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "FILES": this.size().toString(),
                "SIZE": readableBytes(Number(this.fileSize())),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download all": this.downloadAll,
                "<span class='material-icons'>system_update_alt</span> Export all": this.exportAll,
                "<!--spacing b-->": null,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    size() {
        let size = 0;
        this.files.forEach((file) => {
            if (file.type == 'folder') {
                size += file.size();
            } else {
                size++;
            }
        });
        return size;
    }

    // Gets the recursive file size of the folder. Returns a bigInt in bytes.
    fileSize() {
        let size = BigInt(0);
        this.files.forEach((file) => {
            if (file.type == 'folder') {
                size += file.fileSize();
            } else {
                size += BigInt(file.metadata.size);
            }
        });
        return size;
    }

    async download() {
        window.statusBar.setMessage(`Zipping ${this.name}...`);
        const zip = new JSZip();

        function recursiveDL(folder) {
            folder.files.forEach(file => {
                if (file.type == 'folder') {
                    recursiveDL(file);
                } else {
                    zip.file(file.name, file.download(false));
                }
            })
        }
        recursiveDL(this);

        const blob = await zip.generateAsync({type: "blob"}, (metadata) => {
            window.statusBar.setMessage(`Zipping ${this.name}... (${metadata.percent.toFixed(2)}% - Packing ${metadata.currentFile})`, -1, metadata.percent);
        });
        const uri = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute('download', this.name + ".zip");
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(uri);

        
        window.statusBar.removeMessage();
    }

    exportAll() {
        console.warn("Not implemented");
    }

    render() {
        //this.files = sortFiles(this.files);
        var output = `<div id="folder-${this.id}" class="folder ${this.ext}">${this.name}<div class="folder-files" ${this.isOpen ? '' : 'style="display: none"'}>`;
        this.files.forEach(file => {
            output += file.render();
        })

        return output + "</div></div>"
    }

    delete() {
        window.explorer.deleteFileById(this.id);
        $(`[id="folder-${this.id}"]`).remove();
    }
}

export class RootFolder extends Folder {
    render() {
        //this.files = sortFiles(this.files);
        var output = '';
        this.files.forEach(file => {
            output += file.render();
        })
        return output;
    }

    addListener() {
        this.files.forEach(file => {file.addListener()});
    }
}

