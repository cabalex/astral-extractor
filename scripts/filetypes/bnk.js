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
                this.wems[chunkMedia.pLoadedMedia[i]['id']] = chunkData.pData.slice(chunkMedia.pLoadedMedia[i]['offset'], chunkMedia.pLoadedMedia[i]['offset'] + chunkMedia.pLoadedMedia[i]['size'])
            }
        }
    }
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
          console.log(bnk)
          console.log(bnk.wems)
          //$('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
          //$('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
          $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
          //$('div[id="' + file.name + '"]').append("<div id='files' style='display: inline-block;' class='scroll'>" + form + "</table></div>")
          globalFiles[file.name] = {"fp": file, "bnk": bnk}
          resolve();
      }
    }
    reader.readAsArrayBuffer(file);
  })
}