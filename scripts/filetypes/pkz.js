// Stuff for PKZ files (ZSTD archives)

function loadInitialPKZ(fileType, file) {
  var header = null;
  var tmpFiles = null;
  var reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      if (header == null) {
        header = new Uint32Array(e.target.result);
        // magic - 0
        // unk - 1
        var size = new BigUint64Array(e.target.result.slice(8, 16));
        // numFiles - 4
        // offset_file_descriptors - 5
        var fileNameTableLength = new BigUint64Array(e.target.result.slice(24, 32));
        reader.readAsArrayBuffer(file.slice(header[5], header[5] + header[4] * 32))
      } else if (tmpFiles == null) {
        tmpFiles = [];
        for (var i = 0; i < header[4]; i++) {
          tmpFiles.push(new BigUint64Array(e.target.result.slice(i*32, (i+1)*32)));
          // nameoffset - 0
          // size - 1
          // offset - 2
          // compressed_size - 3
        }
        reader.readAsText(file.slice(header[5] + header[4] * 32, header[5] + header[4] * 32 + Number(tmpFiles[0][2])))
      } else {
        var localFiles = {}
        var names = []
        var substring = e.target.result.substr(16, e.target.result.length).replace(/[^\x20-\x7E]/g, '')
        var tmpstr = ""
        for (var i = 0; i < substring.length; i++) {
          tmpstr += substring[i]
          if (tmpstr.charAt(tmpstr.length-4) == ".") {
            if (tmpstr.endsWith(".bnv")) {
              tmpstr += "ib"
            }
            names.push(tmpstr)
            tmpstr = ""
          }
        }
        for (var i = 0; i < header[4]; i++) {
          localFiles[names[i]] = tmpFiles[i]
        }
        var form = "<table><tr><th>ACTIONS</th><th>NAME</th><th>SIZE</th><th>COMPR.</th><th>OFFSET</th>";
        for (const [ key, value ] of Object.entries(localFiles)) {
          let supported = "hidden"
          if (endsWithAny(fileTypes, key)) {
            supported = "open_in_new"
          }
          let replace = "hidden"
          form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><a class="${replace}" title="Replace this file." onclick="replaceFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">upload_file</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th>${value[1]}</th><th>${value[3]}</th><th>${value[2]}</th></tr>`
        }
        $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'pkz\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
        globalFiles[file.name] = {'fp': file, 'files': localFiles}
      }
    }
  }
  reader.readAsArrayBuffer(file.slice(0, 32))
}

function exportSubFilePKZ(fileType, name, subFile, returnFile) {
  var reader = new FileReader();
  var workingfile = globalFiles[name]
  reader.onloadend = async function(e) {
    if (e.target.readyState == FileReader.DONE) {
      const decoder = new ZSTDDecoder();
      await decoder.init();
      const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(workingfile['files'][subFile][1]))
      var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
      sendOutSubFile(fileType, name, subFile, blob, returnFile);
    }
  }
  reader.readAsArrayBuffer(workingfile.fp.slice(Number(workingfile['files'][subFile][2]), Number(workingfile['files'][subFile][2]) + Number(workingfile['files'][subFile][3])));
}