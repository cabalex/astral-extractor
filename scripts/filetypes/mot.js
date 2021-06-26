// Couldn't have done it without ya, https://github.com/Kerilk/bayonetta_tools/wiki/Motion-Formats-(mot-files)
// I do not know how 3D models and animation work...

class MOTRecord {
    // A single MOT record.
    constructor(view, offset) {
        this.boneIndex = view.getInt16(offset, true);
        this.valueIndex = view.getUint8(offset+2);
        this.recordType = view.getUint8(offset+3);
        /* RECORD TYPE 
            0x00 - constant (no additional data)
            0x01 - float32 every frame, repeat the last one if there is less
            0x02 - uint16 every frame, has a header
            0x03 - uint8 every frame, has a header
            --- check wiki for the below ones, they are hard on my brain ---
            0x04 - hermit interpolated values... it's complicated, check wiki
            0x05 - hermit interpolated values with quantized float data... ???
            0x06 - same as 0x05, but using pghalf!! float16?
            0x07 - same as 0x06, but with relative frame index
            0x08 - same as 0x07, but with absolute frame index
        */
        this.valueCount = view.getInt16(offset+4, true);
        // this.negativeOne = view.getInt16(offset+6, true); // always -1
        if (this.recordType == 0) {
            this.recordValue = view.getFloat32(offset+8, true);
        } else {
            this.recordValue = view.getUint32(offset+8, true);
        }
        // project a data size for further recording
        switch(this.recordType) {
            case 0x00:
                // constant (no additional data)
                this.dataSize = 0;
                break;
            case 0x01:
                // float every value
                this.dataSize = this.valueCount*4;
                break;
            case 0x02:
                this.dataSize = this.valueCount*2 + 8 // 8 byte header + uint16
                break;
            case 0x03:
                this.dataSize = this.valueCount*2 + 4;
                break;
            case 0x04:
                this.dataSize = this.valueCount*16; // 2 uint16, 3 float32
                break;
            case 0x05:
                this.dataSize = this.valueCount*8 + 24; // 24 byte header + 4 uint16
                break;
            case 0x06:
            case 0x07:
                this.dataSize = this.valueCount*4 + 12; // same as 0x05 but "i sawed this animation frame in half!!"
                break;
            case 0x08:
                this.dataSize = this.valueCount*5 + 12; // 6 float16 header + 1 uint6, 3 uint8
                break;
        }
    }

    addData(arrayBuffer) {
        var view = new DataView(arrayBuffer);
        var dh, da;
        switch(this.recordType) {
            case 0x01:
                // float every value
                this.data = new Float32Array(arrayBuffer);
                break;
            case 0x02:
                this.dataHeader = {"p": view.getFloat32(0), "dp": view.getFloat32(4)};
                this.data = new Uint16Array(arrayBuffer.slice(8));
                break;
            case 0x03:
                this.dataHeader = {"p": view.getFloat16(0), "dp": view.getFloat16(2)}
                this.data = new Float16Array(arrayBuffer.slice(4))
                break;
            case 0x04:
                this.data = [];
                for (var i = 0; i < this.valueCount; i++) {
                    this.data.push({"absoluteFrameIndex": view.getUint16(i*16), "p": view.getFloat32(i*16+4), "m0": view.getFloat32(i*16+8), "m1": view.getFloat32(i*16+12)})
                }
                break;
            case 0x05:
                dh = new Float32Array(arrayBuffer.slice(0, 24));
                this.dataHeader = {"p": dh[0], "dp": dh[1], "m0": dh[2], "dm0": dh[3], "m1": dh[4], "dm1": dh[5]};
                this.data = [];
                da = new Uint16Array(arrayBuffer.slice(24));
                for (var i = 0; i < this.valueCount; i++) {
                    this.data.push({"absoluteFrameIndex": da[i*4], "cp": da[i*4+1], "cm0": da[i*4+2], "cm1": da[i*4+3]})
                }
                break;
            case 0x06:
            case 0x07:
                dh = new Float16Array(arrayBuffer.slice(0, 12));
                this.dataHeader = {"p": dh[0], "dp": dh[1], "m0": dh[2], "dm0": dh[3], "m1": dh[4], "dm1": dh[5]};
                this.data = [];
                da = new Uint8Array(arrayBuffer.slice(12));
                for (var i = 0; i < this.valueCount; i++) {
                    this.data.push({"absoluteFrameIndex": da[i*4], "cp": da[i*4+1], "cm0": da[i*4+2], "cm1": da[i*4+3]})
                }
                if (this.recordType == 0x07) {
                    // 0x07 is same but uses relativeFrameIndexes
                    this.data = JSON.parse(JSON.stringify(this.data).replace("absoluteFrameIndex", "relativeFrameIndex"))
                }
                break;
            case 0x08:
                dh = new Float16Array(arrayBuffer.slice(0, 12));
                this.dataHeader = {"p": dh[0], "dp": dh[1], "m0": dh[2], "dm0": dh[3], "m1": dh[4], "dm1": dh[5]};
                this.data = [];
                da = new Uint8Array(arrayBuffer.slice(12));
                for (var i = 0; i < this.valueCount; i++) {
                    this.data.push({"absoluteFrameIndex": view.getUint16(i*5+12, false), "cp": view.getUint8(i*5+14), "cm0": view.getUint8(i*5+15), "cm1": view.getUint8(i*5+16)})
                }
                if (this.recordType == 0x07) {
                    // 0x07 is same but uses relativeFrameIndexes
                    this.data = JSON.parse(JSON.stringify(this.data).replace("absoluteFrameIndex", "relativeFrameIndex"))
                }
                break;
        }
    }
}

function MOTRecordToGLTFAnim(records) {
    // Haha, I'm not that smart
}

function loadInitialMOT(fileType, file) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onloadend = function(e) {
          if (e.target.readyState == FileReader.DONE) {
            view = new DataView(e.target.result);
            // 0 char[4] - mot\x00
            // 4 uint32 - unknown (version?)
            // 8 uint16 - flags
            frameCount = view.getUint16(10, true);
            recordsOffset = view.getUint32(12, true);
            recordCount = view.getUint32(16, true);
            // 20 uint32 - unknown
            enc = new TextDecoder("shift-jis")
            motionName = enc.decode(new Uint8Array(e.target.result.slice(24, recordsOffset))).trim();
            records = [];
            for (var i = 0; i < recordCount; i++) {
                records.push(new MOTRecord(view, recordsOffset + i*12))
            }
            var pos = recordsOffset + recordCount*12;
            for (var i = 0; i < recordCount; i++) {
                records[i].addData(e.target.result.slice(pos, pos+records[i].dataSize));
                pos += records[i].dataSize;
            }
            console.log(records)
            $('div[id="' + file.name + '"]').find('h4').append(` - ${records.length} records <a class='disabled' title='Download the extracted animation.'><span class='material-icons'>folder</span> COMING SOON?</a>`)
            $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
            resolve();
          }
        }
        reader.readAsArrayBuffer(file)
      })
    }