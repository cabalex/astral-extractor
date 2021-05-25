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
          tmpFile = new BigUint64Array(e.target.result.slice(i*32, (i+1)*32));
          tmpFiles.push({'nameOffset': tmpFile[0], 'size': tmpFile[1], 'offset': tmpFile[2], 'compressedSize': tmpFile[3], 'kind': 'extracted'})
          // nameoffset - 0
          // size - 1
          // offset - 2
          // compressedSize - 3
        }
        reader.readAsText(file.slice(header[5] + header[4] * 32, header[5] + header[4] * 32 + Number(tmpFiles[0]['offset'])))
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
        var form = `<table><tr><th><a onclick='loadAllSubFiles(\"pkz\", \"${file.name}\")'><span class="material-icons">open_in_new</span> ALL</a></th><th>NAME</th><th>SIZE</th><th>COMPR.</th><th>OFFSET</th>`;
        for (const [ key, value ] of Object.entries(localFiles)) {
          let supported = "hidden"
          if (endsWithAny(fileTypes, key)) {
            supported = "open_in_new"
          }
          let replace = "hidden"
          form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".${key.split('.')[1]}" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th title="${value['size']} bytes">${readableBytes(Number(value['size']))}</th><th title="${value['compressedSize']} bytes">${readableBytes(Number(value['compressedSize']))}</th><th title="${readableBytes(Number(value['offset']))}">${Number(value['offset'])}</th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
        }
        $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'pkz\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='disabled' title='Repack the file into a game-ready PKZ.' onclick="packPKZ('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK (coming soon)</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll'>" + form + "</table></div>")
        globalFiles[file.name] = {'fp': file, 'files': localFiles}
        for (const key of Object.keys(localFiles)) {
          document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitPKZ("pkz", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
        }
      }
    }
  }
  reader.readAsArrayBuffer(file.slice(0, 32))
}

function replaceInitPKZ(fileType, name, subFile, files) {
  globalFiles[name]['files'][subFile] = {'fp': files[0], 'size': files[0].size, 'kind': 'custom'}
  $(this).val('');
  console.log(`custom file - ${files[0].name}`)
  return true;
}

function exportSubFilePKZ(fileType, name, subFile, returnFile) {
  var reader = new FileReader();
  var workingfile = globalFiles[name]
  reader.onloadend = async function(e) {
    if (e.target.readyState == FileReader.DONE) {
      const decoder = new ZSTDDecoder();
      await decoder.init();
      const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(workingfile['files'][subFile]['size']))
      var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
      sendOutSubFile(fileType, name, subFile, blob, returnFile);
    }
  }
  reader.readAsArrayBuffer(workingfile.fp.slice(Number(workingfile['files'][subFile]['offset']), Number(workingfile['files'][subFile]['offset']) + Number(workingfile['files'][subFile]['compressedSize'])));
}

async function packPKZ(file) {
  $(`div[id="${file}"]`).find('h4').children('a.repack').replaceWith(`<div class='repack' style="padding: 0; background-color:#C5C5C5;"><span class='material-icons'>auto_fix_high</span> REPACKING...</div>`)
  if (!("TextDecoder" in window) || !("TextEncoder" in window)) {
    alert("This browser doesn't support TextDecoder and TextEncoder, which is required for DAT repacking. Use a newer one?")
    return;
  }
  var enc = new TextEncoder();
  var workingfile = globalFiles[file];
  var outputFiles = []
  var numFiles = Object.keys(workingfile['files']).length
  var fileExtensions = []
  var fileExtensionsSize = 0
  var nameLength = 0
  var fileOffsets = []
  // ---
  var fileOffsetsOffset = 32
  var fileExtensionsOffset = Math.ceil((fileOffsetsOffset + (numFiles * 4))/4)*4
  for (var i = 0; i < numFiles; i++) {
    let subFile = workingfile['fileOrder'][i]
    let extArray = subFile.split(".")
    let ext = extArray[extArray.length-1]
    if (subFile.length + 1 > nameLength) {
      nameLength = subFile.length+1
    }
    fileExtensionsSize += ext.length+1
    fileExtensions.push(ext)
  }
  var fileNamesOffset = Math.ceil((fileExtensionsOffset + fileExtensionsSize)/4)*4
  var fileSizesOffset = Math.ceil((fileNamesOffset + (numFiles * nameLength) + 4)/4)*4
  var hashMapOffset = fileSizesOffset + (numFiles * 4)
  var hashMapSize = workingfile['hashMap'].byteLength;
  var pos = Math.ceil((hashMapOffset + hashMapSize)/16)*16
  if (file.endsWith('.dtt')) {
    pos = 0x8000
  }
  for (var i = 0; i < numFiles; i++) {
    let subFile = workingfile['fileOrder'][i]
    // file padding n stuff
    if (file.endsWith('.dtt')) {
      if (workingfile['files'][subFile]['size'] == 0) {
        fileOffsets.push(0)
      } else {
        fileOffsets.push(pos)
      }
      pos = Math.ceil(pos/0x8000)*0x8000
    } else {
      //console.log(subFile)
      if (workingfile['files'][subFile]['size'] == 0) {
        fileOffsets.push(0)
      } else if (subFile.endsWith('bnk')){
        pos = Math.ceil(pos/2048)*2048
        fileOffsets.push(pos)
      } else {
        fileOffsets.push(pos)
      }
      pos += workingfile['files'][subFile]['size'];
      pos = Math.ceil(pos/16)*16
    }
  }
  
  // big boys
  var outputArray = new Uint32Array([5521732, numFiles, fileOffsetsOffset, fileExtensionsOffset, fileNamesOffset, fileSizesOffset, hashMapOffset, 0])
  pos = 32
  for (var i = 0; i < numFiles; i++) {
    outputArray = concatenateToUint8(outputArray, Uint32Array.of(fileOffsets[i]));
    pos += 4;
  }
  outputArray = concatenateToUint8(outputArray, new Uint8Array(fileExtensionsOffset - pos))
  pos = fileExtensionsOffset;
  for (var i = 0; i < numFiles; i++) {
    outputArray = concatenateToUint8(outputArray, enc.encode(fileExtensions[i].padEnd(4, "\x00")));
    pos += 4;
  }
  outputArray = concatenateToUint8(outputArray, new Uint8Array(fileNamesOffset - pos))
  outputArray = concatenateToUint8(outputArray, Uint32Array.of(nameLength));
  pos = fileNamesOffset
  for (var i = 0; i < numFiles; i++) {
    if (i+1 < numFiles) {
      outputArray = concatenateToUint8(outputArray, enc.encode(workingfile['fileOrder'][i].padEnd(nameLength, "\x00")));
    } else {
      outputArray = concatenateToUint8(outputArray, enc.encode(workingfile['fileOrder'][i]));
    }
    pos = outputArray.length
  }
  outputArray = concatenateToUint8(outputArray, new Uint8Array(fileSizesOffset - pos))
  pos = fileSizesOffset
  for (var i = 0; i < numFiles; i++) {
    outputArray = concatenateToUint8(outputArray, Uint32Array.of(workingfile['files'][workingfile['fileOrder'][i]]['size']));
    pos += 4;
  }
  outputArray = concatenateToUint8(outputArray, new Uint8Array(hashMapOffset - pos))
  outputArray = concatenateToUint8(outputArray, new Uint8Array(workingfile['hashMap']));
  pos += workingfile['hashMap'].byteLength
  var files = {};
  console.log('[DAT REPACKING] Reading files...')
  function afterRepack() {
    console.log("[DAT REPACKING] Writing DAT body...")
    for (var x = 0; x < numFiles; x++) {
      outputArray = concatenateToUint8(outputArray, new Uint8Array(fileOffsets[x] - pos));
      pos = fileOffsets[x];
      outputArray = concatenateToUint8(outputArray, new Uint8Array(files[workingfile['fileOrder'][x]]));
      pos = outputArray.byteLength;
      console.log(`[${x+1}/${numFiles}][${workingfile['fileOrder'][x]}]`)
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(Math.ceil(pos/16)*16 - pos));
    var blob = new Blob([outputArray], {type: 'application/octet-stream'});
    console.log("DAT Export complete. :)")
    saveAs(blob, file)
    $(`div[id="${file}"]`).find('h4').children('.repack').replaceWith(`<a class='repack' title='Repack the file into a game-ready PKZ.' onclick="packPKZ('${file}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
    return;
  }
  for (var i = 0; i < numFiles; i++) {
    let subFile = workingfile['files'][workingfile['fileOrder'][i]]
    let subFileName = workingfile['fileOrder'][i];
    let reader = new FileReader();
    let currentFile = i;
    reader.onloadend = async function(e) {
        if (e.target.readyState == FileReader.DONE) {
          files[subFileName] = e.target.result;
          if (Object.keys(files).length == numFiles) {
            afterRepack();
          }
        }
      }
    if (subFile['kind'] == 'extracted') {
      // included file
      reader.readAsArrayBuffer(workingfile.fp.slice(subFile['offset'], subFile['offset'] + subFile['size']))
    } else {
      // custom file
      reader.readAsArrayBuffer(subFile.fp)
    }
  }
}