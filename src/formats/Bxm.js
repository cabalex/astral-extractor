import { ExplorerFile } from "../core/ExplorerFile.js";
import { readableBytes } from "../core/Explorer.js";


/* Support for BXM files */

export class Bxm extends ExplorerFile {
    constructor(arrayBuffer, name, size) {
        super(name, size || arrayBuffer.byteLength);
        this.arrayBuffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);

        if (this.metadata.size == 0) {
            this.header = {
                nodeCount: 0,
                dataCount: 0,
                dataSize: 0
            }
        } else {
            this.header = {
                //magic: this.dataView.getUint32(0, true), // BXM\x00 or XML\x00
                //flags: this.dataView.getUint32(4, true),
                nodeCount: this.dataView.getUint16(8), // note: these are all big endian
                dataCount: this.dataView.getUint16(10),
                dataSize: this.dataView.getUint32(12),
            }
        }
    }

    contextMenuOpts() {
        return {
            scope: this,
            items: {
                "SIZE": readableBytes(Number(this.metadata.size)),
                "NODES": this.header.nodeCount.toString(),
                "DATA": this.header.dataCount.toString(),
                "<!--spacing a-->": null,
                "<span class='material-icons'>download</span> Download": this.download,
                "<!--danger--><span class='material-icons'>delete</span> Delete": this.delete
            }
        }
    }

    // Reads the BXM and returns a JSON object of the nodes.
    readBxmAsJson() {
        // node info starts at 0x10 (16)
        let nodes = [];
        let offset = 16;
        for (let i = 0; i < this.header.nodeCount; i++) {
            nodes.push([this.dataView.getUint16(offset), this.dataView.getUint16(offset+2), this.dataView.getUint16(offset+4), this.dataView.getUint16(offset+6)])
            offset += 8;
        }
        // data offsets
        let dataOffsets = [];
        for (var i = 0; i < this.header.dataCount; i++) {
            dataOffsets.push([this.dataView.getUint16(offset), this.dataView.getUint16(offset+2)])
            // name offset - 0
            // value offset - 1
            offset += 4;
        }

        let enc = new TextDecoder("SHIFT-JIS")

        const scope = this;
        function readString(pos) {
            pos = pos + offset;
            var tmppos = pos;
            while (tmppos < scope.arrayBuffer.byteLength && scope.dataView.getUint8(tmppos) != 0) {
                tmppos += 1;
            }
            var decoded = enc.decode(scope.arrayBuffer.slice(pos, tmppos));
            if (decoded.includes("�")) {
                // quest data is in UTF-8; must support both formats
                enc = new TextDecoder("UTF-8");
                decoded = enc.decode(scope.arrayBuffer.slice(pos, tmppos));
            }
            return decoded;
        }

        function readTree(nodeNum) {
            let node = nodes[nodeNum];
            // child count - 0
            // first child index/next sibling list index - 1
            // attribute count - 2
            // data index - offset inside the data offset table - 3
            let name = "";
            let value = "";
            
            if (dataOffsets[node[3]][0] != -1) {
                name = readString(dataOffsets[node[3]][0])
            }
            if (dataOffsets[node[3]][1] != -1) {
                value = readString(dataOffsets[node[3]][1])
            }
            let outputJSON = {"name": name, "value": value, "attributes": {}, "children": []}; // the current node
            // attributes
            if (node[2] > 0) {
                for (var i = 0; i < node[2]; i++) {
                var attrname = "";
                var attrvalue = "";
                if (dataOffsets[node[3]+i+1][0] != -1) {
                    attrname = readString(dataOffsets[node[3]+i+1][0])
                }
                if (dataOffsets[node[3]+i+1][1] != -1) {
                    attrvalue = readString(dataOffsets[node[3]+i+1][1])
                }
                outputJSON['attributes'][attrname] = attrvalue;
                }
            }
            // children
            if (node[0] > 0) {
                var childNodeNum = node[1];
                for (var i = 0; i < node[0]; i++) {
                outputJSON['children'].push(readTree(childNodeNum+i))
                }
            }
            return outputJSON;
        }

        return readTree(0);
    }

    async load() {
        if (this.metadata.size == 0) {
            return `<div>${this.name} - file is empty</div>`;
        }

        const output = this.readBxmAsJson();

        // Iterate to find identifiers:
        
        /*function findSpecialFields(js) {
            for (let [key, value] of Object.entries(js.attributes)) {
                switch(key) {
                    case "Identifier":
                        // identifier value is weird
                        js.attributes.Identifier = value.replace(/\s+/g, '');
                }
            }

            for (var i = 0; i < js['children'].length; i++) {
                findSpecialFields(js['children'][i]);
            }
        }

        findSpecialFields(output);*/

        function JSONtoXML(js) {
            var out = `&#60;${js['name']}`
            for (var i = 0; i < Object.keys(js['attributes']).length; i++) {
                out += ` ${Object.keys(js['attributes'])[i]}="${Object.values(js['attributes'])[i]}"`
            }
            out += `&#62;${js['value']}`
            for (var i = 0; i < js['children'].length; i++) {
                out += "\n\t" + JSONtoXML(js['children'][i]).replace(/\n/g, "\n\t");
            }
            if (js['children'].length > 0) {
                out += "\n";
            }
            return out + `&#60;/${js['name']}>`;
        }
        const xmlOutput = JSONtoXML(output)

        return `<div class="text">${xmlOutput}</div>`;
    }
}