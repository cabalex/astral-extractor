// stuff for DAT/DTT/EVN files (DAT archives) 

function loadInitialDAT(fileType, file) {
  return new Promise((resolve, reject) => {
    var header = null;
    var hashes = null;
    var localFiles = {};
    var names = [];
    var reader = new FileReader();
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        if (header == null) {
          header = new Uint32Array(e.target.result);
          if (header[0] != 5521732) { // DAT\x00
            // is probably a save
            if (header[0] == 1) {
              loadInitialGameData(fileType, file); // game data starts with 0x01
            } else {
              loadInitialSlotData(fileType, file); // slot data starts with 0x5063DB08 
            }
            return;
          }
          // magic - 0
          // filenumber - 1
          // fileoffsetsoffset - 2
          // fileextensionsoffset - 3
          // filenamesoffset - 4
          // filesizesoffset - 5
          // hashmapoffset - 6
          reader.readAsArrayBuffer(file.slice(28, header[6]))
        } else if (hashes == null) {
          const fileOffsetsTable = new Uint32Array(e.target.result.slice(header[2] - 28, header[2] - 28 + header[1]*4));
          //const wholeFileExt = arrayBufferToString(e.target.result.slice(header[3] - 28, header[3] - 28 + header[1]*4));
          const sizesTable = new Uint32Array(e.target.result.slice(header[5] - 28, header[5] - 28 + header[1]*4));
          var substring = arrayBufferToString(e.target.result.slice(header[4] - 27, header[6] - 27)).replace(/[^\x20-\x7E]/g, '');
          var tmpstr = "";
          
          for (var i = 0; i < substring.length; i++) {
            tmpstr += substring[i];
            if (tmpstr.charAt(tmpstr.length-4) == ".") {
              if (names.includes(tmpstr)) { 
                var z = 1;
                while (names.includes(tmpstr + `~${z}`)) {
                  z += 1;
                }
                names.push(tmpstr + `~${z}`)
              } else {
                names.push(tmpstr);
              }
              tmpstr = "";
            }
          }
          
          var firstOffset = 0;
          
          for (var i = 0; i < header[1]; i++) {
            // Sometimes the first offset is 0 (0-byte file), find the first real file
            if (!firstOffset && fileOffsetsTable[i]) {
              firstOffset = fileOffsetsTable[i];
            }
            localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted'}; // kinds: "extracted" and "custom"
          }
          
          hashes = true
          reader.readAsArrayBuffer(file.slice(header[6], firstOffset))
        } else {
          var form = `<table><tr><th style="text-align: center;"><a onclick='loadAllSubFiles(\"dat\", \"${file.name}\")'>OPEN ALL</a></th><th>NAME</th><th>SIZE</th><th>OFFSET</th>`;
          
          for (const [ key, value ] of Object.entries(localFiles)) {
            let supported = "hidden"
            if (endsWithAny(fileTypes, key.split("~")[0])) {
              supported = "open_in_new"
            }
            form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".${key.split('.')[1]}" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a><a title="Remove this file permanently from the DAT." onclick="removeSubFile(\'dat\', \'${file.name}\', \'${key}\', this)"><span class="material-icons">close</span></a></th><th><input type="text" size="25" value='${key}'></input></th><th title="${value['size']} bytes">${readableBytes(value['size'])}</th><th title="${readableBytes(value['offset'])}">${value.offset}</th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
          }
          
          $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
          $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
          $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
          $('div[id="' + file.name + '"]').append("<div id='files' style='display: inline-block;' class='scroll'>" + form + "</table></div>")
          
          for (const key of Object.keys(localFiles)) {
            document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitDAT("dat", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
          }

          globalFiles[file.name] = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result}
          resolve()
        }
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 28))
  })
}

function exportSubFileDAT(fileType, name, subFile, returnFile) {
  return new Promise(async (resolve, reject) => {
    var reader = new FileReader();
    var workingfile = globalFiles[name];
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        var blob = new Blob([e.target.result], {type: 'application/octet-stream'});
        await sendOutSubFile(fileType, name, subFile.split("~")[0], blob, returnFile);
        resolve()
      }
    }
    if (workingfile['files'][subFile]['kind'] == 'extracted') {
      reader.readAsArrayBuffer(workingfile.fp.slice(workingfile['files'][subFile]['offset'], workingfile['files'][subFile]['offset'] + workingfile['files'][subFile]['size']));
    } else {
      // custom
      reader.readAsArrayBuffer(workingfile['files'][subFile]['fp'])
    }
  })
}

function replaceInitDAT(fileType, name, subFile, files) {
  globalFiles[name]['files'][subFile] = {'fp': files[0], 'size': files[0].size, 'kind': 'custom'}
  $(this).val('');
  console.log(`custom file - ${files[0].name}`)
  return true;
}

function removeSubFile(fileType, name, subFile, elem) {
  delete globalFiles[name]['files'][subFile]
  $(elem).parents('tr').remove()
  console.log(`removed ${subFile} from ${name}`)
}

function concatenateToUint8(...arrays) {
  let totalLength = 0;
  for (const arr of arrays) {
      totalLength += new Uint8Array(arr.buffer).length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(new Uint8Array(arr.buffer), offset);
    offset += arr.buffer.byteLength;
  }
  return result;
}

function toUint32(bytes) {
  var returning = new Array(Math.ceil(bytes.length/4)*4).fill(0)
  for (var i = 0; i < bytes.length; i++) {
    returning[i] = bytes[i]
  }
  var values = [];
  for (var i = 0; i < (returning.length/4); i++) {
    let cut = returning.slice(i*4, (i+1)*4)
    console.log(cut)
    values.push(((cut[3] << 24) | (cut[2] << 16) | (cut[1] << 8) | cut[0]) >>> 0)
  }
  console.log(values)
  return values;
}

async function packDAT(file) {
  $(`div[id="${file}"]`).find('h4').children('a.repack').replaceWith(`<div class='repack' style="padding: 0; background-color:#C5C5C5;"><span class='material-icons'>auto_fix_high</span> REPACKING...</div>`)
  if (!("TextDecoder" in window) || !("TextEncoder" in window)) {
    alert("This browser doesn't support TextDecoder and TextEncoder, which is required for DAT repacking. Use a newer one?")
    return;
  }
  var newFileOrder = [];
  $(`div[id="${file}"]`).find('div#files').find('tr').each(function(index) {
    if (index == 0) {return}
    newFileOrder[index-1] = $(this).find('input[type="text"]').val()
  })
  var enc = new TextEncoder();
  var workingfile = globalFiles[file];
  var outputFiles = []
  var numFiles = workingfile['fileOrder'].length
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
    let ext = extArray[extArray.length-1].split("~")[0] // Remove any "~"s from duplication prevention
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
      outputArray = concatenateToUint8(outputArray, enc.encode(newFileOrder[i].padEnd(nameLength, "\x00")));
    } else {
      outputArray = concatenateToUint8(outputArray, enc.encode(newFileOrder[i]));
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
  for (let i = 0; i < numFiles; i++) {
    let subFile = workingfile['files'][workingfile['fileOrder'][i]]
    let subFileName = workingfile['fileOrder'][i];
    let reader = new FileReader();
    if (subFile['kind'] == 'extracted') {
      // included file
      files[subFileName] = await readFileDAT(subFile['kind'], workingfile.fp.slice(subFile['offset'], subFile['offset'] + subFile['size']))
    } else {
      // custom file
      files[subFileName] = await readFileDAT(subFile['kind'], subFile.fp)
    }
  }
  console.log("[DAT REPACKING] Writing DAT body...")
  for (var x = 0; x < numFiles; x++) {
    if (fileOffsets[x] == 0) {
      continue
    }
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
  $(`div[id="${file}"]`).find('h4').children('.repack').replaceWith(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
  return;
}

function readFileDAT(kind, fp) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onloadend = async function(e) {
        if (e.target.readyState == FileReader.DONE) {
          resolve(e.target.result)
        }
      }
    if (kind == 'extracted') {
      // included file
      reader.readAsArrayBuffer(fp)
    } else {
      // custom file
      reader.readAsArrayBuffer(fp)
    }
  })
}