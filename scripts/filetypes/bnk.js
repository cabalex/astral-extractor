// Thanks to NieR Audio Tools (NSACloud) for a lot of this code
// https://github.com/NSACloud/NieR-Audio-Tools

class BNKChunk {
    constructor(file) {
        var view = new DataView(file);
        var enc = new TextDecoder("utf-8");
        this.type = enc.decode(new Uint8Array(file.slice(0, 4)));
        this.byteLength = view.getUint32(4, true);
        switch(this.type) {
            case "BKHD": // Bank Header
                this.dwBankGeneratorVersion = view.getUint32(8, true);
                this.dwSoundBankID = view.getUint32(12, true);
                this.dwLanguageID = view.getUint32(16, true);
                this.bUnused = view.getUint16(20, true);
                this.bDeviceAllocated = view.getUint16(22, true);
                this.dwProjectID = view.getUint32(24, true);
                //this.padding = file.slice(28, this.byteLength-20);
                break;
            case "DIDX": // Media Index
                this.pLoadedMedia = [];
                for (var i = 0; i < this.byteLength/12; i++) {
                    this.pLoadedMedia.push({"id": view.getUint32(8 + i*12, true), "offset": view.getUint32(12 + i*12, true), "size": view.getUint32(16 + i*12, true)})
                }
                break;
            case "DATA": // WEM data
                this.pData = file.slice(8, 8+this.byteLength);
                break;
            case "HIRC": // Hierarchy
                console.warn("Warning: HIRC parsing is currently not supported.");
                this.HIRCDATA = file.slice(8, 8+this.byteLength);
                break;
            case "STID": // String mappings
                this.uiType = view.getUint32(8, true);
                this.uiSize = view.getUint32(12, true),
                this.BankIDToFileName = [];
                var pos = 0;
                for (var i = 0; i < this.uiSize; i++) {
                    var AKBKHashHeader = {"bankID": view.getUint32(16 + pos, true), "stringSize": view.getUint8(20 + pos)};
                    AKBKHashHeader['FileName'] = enc.decode(new Uint8Array(file.slice(21, 21 + AKBKHashHeader['stringSize'])));
                    this.BankIDToFileName.push(AKBKHashHeader);
                    pos += 5 + AKBKHashHeader['stringSize'];
                }
                break;
            case "INIT":
                break;
            case "STMG":
                break;
            case "ENVS":
                break;
            case "PLAT":
                break;
            default:
                console.warn("Unknown chunk type " + this.type);
                this.unknownData = file.slice(8, 8+this.byteLength);
        }
    } 
}


class BNK {
    constructor(file) {
        this.fileSize = file.byteLength;
        this.chunkList = [];
        this.chunkIndex = [];
        var endpos = 0;
        while (endpos < this.fileSize) {
            var chunk = new BNKChunk(file.slice(endpos))
            endpos += chunk.byteLength+8;
            this.chunkList.push(chunk)
            this.chunkIndex.push(this.chunkList[this.chunkList.length-1].type)
        }
        this.extractWEMs()
    }

    extractWEMs() {
        this.wems = {}
        if (this.chunkIndex.includes("DIDX") && this.chunkIndex.includes("DATA")) {
            var chunkMedia = this.chunkList[this.chunkIndex.indexOf("DIDX")]
            var chunkData = this.chunkList[this.chunkIndex.indexOf("DATA")]
            console.log(`Project ID: ${this.chunkList[0].dwProjectID}`)
            for (var i = 0; i < chunkMedia.pLoadedMedia.length; i++) {
                this.wems[chunkMedia.pLoadedMedia[i]['id']] = new WEM(chunkMedia.pLoadedMedia[i]['id'], chunkData.pData.slice(chunkMedia.pLoadedMedia[i]['offset'], chunkMedia.pLoadedMedia[i]['offset'] + chunkMedia.pLoadedMedia[i]['size']));
            }
        }
    }
}

class WEM {
    constructor(id, arrayBuffer) {
        this.id = id;
        this.data = arrayBuffer;
        this.audioType = Array.from(new Uint8Array(this.data.slice(0, 4))).map(x => String.fromCharCode(x)).join('');
        this.dataView = new DataView(arrayBuffer);
        
        let fmtLength = this.dataView.getUint32(16, true);
        let junkLength = 0;
        let akdLength = 0;
        if (this.dataView.getUint32(20 + fmtLength, true) == 1263424842) { // "JUNK"
            junkLength = this.dataView.getUint32(20 + fmtLength + 4, true) + 4;
        } 
        if (this.dataView.getUint32(20 + fmtLength + junkLength, true) == 543452001) {// "akd "
            akdLength = this.dataView.getUint32(20 + fmtLength + junkLength + 4, true) + 4;
        }
        this.dataOffset = 20 + fmtLength + junkLength + akdLength;

        this.header = {
            fmtLength: fmtLength,
            //unk: this.dataView.getUint16(20, true), // -1 (0xFFFF)
            channels: this.dataView.getUint16(22, true),
            sampleRate: this.dataView.getUint32(24, true),
            avgBytesPerSecond: this.dataView.getUint32(28, true) * 8,
            //extunk: this.dataView.getUint16(32, true), // 0
            subtype: this.dataView.getUint16(34, true),
            cueCount: this.dataView.getUint32(36, true),
            loopCount: this.dataView.getUint32(40, true),
            loopStart: this.dataView.getUint32(44, true),
            loopEnd: this.dataView.getUint32(48, true),
            sampleCount: this.dataView.getUint32(52, true),
            setupPacketOffset: this.dataView.getUint32(56, true),
            firstAudioPacketOffset: this.dataView.getUint32(60, true),
            uid: this.dataView.getUint32(64, true),
            blocksize0pow: this.dataView.getUint8(68, true),
            blocksize1pow: this.dataView.getUint8(69, true),
        }
    }
    toWAV() {
        let data = new Uint8Array(this.data.slice(this.dataOffset));

        let newHeader = new ArrayBuffer(36);
        let dv = new DataView(newHeader);
        dv.setUint32(0, this.dataView.getUint32(0, true), true); // "RIFF"
        dv.setUint32(0x4, 28 + data.byteLength, true); // Size
        dv.setUint32(0x8, this.dataView.getUint32(8, true), true); // "WAVE"
        dv.setUint32(12, this.dataView.getUint32(12, true), true); // "fmt "
        dv.setUint32(16, 16 + data.byteLength, true);
        dv.setUint16(20, 1, true); // PCM format
        dv.setUint16(22, this.header.channels, true); // Number of channels
        dv.setUint32(24, this.header.sampleRate, true); // Sample rate
        dv.setUint32(28, this.header.avgBytesPerSecond, true); // Sample rate * bits per sample * channels / 8
        dv.setUint16(32, this.dataView.getUint16(0x24, true), true); // Bits per sample

        // "data" and then everything else
        return concatenateToUint8(new Uint8Array(newHeader), data);
    }
    async download(asWAV=false) {
        await sendOutSubFile('wem', 'bnkFile', this.id + '.wem', new Blob([asWAV ? this.toWAV() : this.data], {type: 'application/octet-stream'}), false);
    }
    getObjectURL() {
        let blob = new Blob([this.toWAV().buffer], {type: "audio/wav"})

        return URL.createObjectURL(blob);
    }
}

async function downloadSubFileWEM(fileType, fileName, wemID, asWAV=false) {
    await globalFiles[fileName]['bnk']['wems'][wemID].download(asWAV);
}

async function downloadSubFileBNK(fileType, fileName, subFile, returnFile) {
    await sendOutSubFile(fileType, fileName, subFile + '.wem', new Blob([globalFiles[fileName]['files'][subFile].data], {type: 'application/octet-stream'}), returnFile);
}

function loadInitialBNK(fileType, file) {
    return new Promise((resolve, reject) => {
    var header = null;
    var tmpFiles = null;
    var reader = new FileReader();
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        console.log("Reading BNK...")
        var bnk = new BNK(e.target.result)

        let table = ['<tr><th></th><th>NAME</th><th>AUDIO</th><th>SIZE</th></tr>'];
        console.log(bnk)
        for (let [key, value] of Object.entries(bnk.wems)) {
            table.push(`<tr><th><a title="Download this file." onclick="downloadSubFileWEM(\'bnk\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a style="display: none" title="Download this file as WAV." onclick="downloadSubFileWEM(\'bnk\', '${file.name}', '${key}', true)"><span class="material-icons">downloading</span></a></th><th><input value="${key}.wem" disabled></th><th><audio controls><source src=${value.getObjectURL()} type="audio/wav"></audio></th><th>${readableBytes(value.data.byteLength)}</th><th>${value.audioType}</th></tr>`);
        }
        //$('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        //$('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(bnk.wems).length} audio files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'bnk\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files' style='display: inline-block;' class='scroll'><table>" + table.join('') + "</table></div>")
        globalFiles[file.name] = {"fp": file, "bnk": bnk, "files": bnk.wems}
        resolve();
      }
    }
    reader.readAsArrayBuffer(file);
  })
}