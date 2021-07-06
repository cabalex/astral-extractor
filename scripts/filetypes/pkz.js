// Stuff for PKZ files (ZSTD archives)

function loadInitialPKZ(fileType, file, showDetail=false) {
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
        if (showDetail) {
          var form = `<table><tr><th style="text-align: center;"><a onclick='loadAllSubFiles(\"pkz\", \"${file.name}\")'>OPEN ALL</a></th><th>NAME</th><th>LOOKUP</th><th>SIZE</th><th>COMPR.</th><th>OFFSET</th>`;
          for (const [ key, value ] of Object.entries(localFiles)) {
            let supported = "hidden"
            if (endsWithAny(fileTypes, key)) {
              supported = "open_in_new"
            }
            let replace = "hidden"
            form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".${key.split('.')[1]}" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a><a title="Remove this file permanently from the PKZ." onclick="removeSubFile(\'dat\', \'${file.name}\', \'${key}\', this)"><span class="material-icons">close</span></a></th><th><input type="text" size="25" value='${key}'></input></th><th>${lookup(key)}</th><th title="${value['size']} bytes">${readableBytes(Number(value['size']))}</th><th title="${value['compressedSize']} bytes">${readableBytes(Number(value['compressedSize']))}</th><th title="${readableBytes(Number(value['offset']))}">${Number(value['offset'])}</th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
          }
          $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['pkz'].replace("{filename}", file.name).replace("PKZShowDetail", "PKZHideDetail").replace("more details", "less details"))
        } else {
          var form = `<table><tr><th style="text-align: center;"><a onclick='loadAllSubFiles(\"pkz\", \"${file.name}\")'>OPEN ALL</a></th><th>NAME</th><th>LOOKUP</th><th>SIZE</th>`;
          for (const [ key, value ] of Object.entries(localFiles)) {
            let supported = "hidden"
            if (endsWithAny(fileTypes, key)) {
              supported = "open_in_new"
            }
            let replace = "hidden"
            form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".${key.split('.')[1]}" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a><a title="Remove this file permanently from the PKZ." onclick="removeSubFile(\'dat\', \'${file.name}\', \'${key}\', this)"><span class="material-icons">close</span></a></th><th><input type="text" size="25" value='${key}'></input></th><th>${lookup(key)}</th><th title="${value['size']} bytes">${readableBytes(Number(value['size']))}</th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
          }
          $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['pkz'].replace("{filename}", file.name))
        }
        $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'pkz\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready PKZ.' onclick="packPKZ('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll' style='display: inline-block;'>" + form + "</table></div>")
        globalFiles[file.name] = {'fp': file, 'files': localFiles, 'fileOrder': names}
        for (const key of Object.keys(localFiles)) {
          document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitPKZ("pkz", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
        }
      }
    }
  }
  reader.readAsArrayBuffer(file.slice(0, 32))
}

function PKZShowDetail(filename, elem) {
  $('div[id="' + filename + '"]').remove();
  $('div#content').append(`<div id="${filename}"><h4 title="${filename}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${filename}</h4><div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> PKZ File</h5><p>${fileInfo['pkz']}</p></div></div>`);
  loadInitialPKZ('pkz', globalFiles[filename]['fp'], true)
}

function PKZHideDetail(filename, elem) {
  $('div[id="' + filename + '"]').remove();
  $('div#content').append(`<div id="${filename}"><h4 title="${filename}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${filename}</h4><div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> PKZ File</h5><p>${fileInfo['pkz']}</p></div></div>`);
  loadInitialPKZ('pkz', globalFiles[filename]['fp'], false)
}

function replaceInitPKZ(fileType, name, subFile, files) {
  globalFiles[name]['files'][subFile] = {'fp': files[0], 'size': files[0].size, 'kind': 'custom'}
  $(this).val('');
  if (files[0].size > 16000000) {
    alert("WARNING: The current ZSTD encoder used does not support files above ~16 MB, as it runs out of memory. While I am trying to find a fix, you may not be able to export this PKZ. Proceed with caution!")
  }
  console.log(`custom file - ${files[0].name} -> ${subFile}`)
  return true;
}

function exportSubFilePKZ(fileType, name, subFile, returnFile) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    var workingfile = globalFiles[name]
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        // Old decoder is much faster for decoding purposes; using for decoding ZSTD
        const decoder = new ZSTDDecoder();
        await decoder.init();
        const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(workingfile['files'][subFile]['size']))
        var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
        sendOutSubFile(fileType, name, subFile, blob, returnFile);
        resolve()
      }
    }
    reader.readAsArrayBuffer(workingfile.fp.slice(Number(workingfile['files'][subFile]['offset']), Number(workingfile['files'][subFile]['offset']) + Number(workingfile['files'][subFile]['compressedSize'])));
  })
}

function generatePKZFileTable(fileOrder) {
  const enc = new TextEncoder();
  var offsets = [];
  var str = "ZStandard\x00\x00\x00\x00\x00\x00\x00" 
  for (var i = 0; i < fileOrder.length; i++) {
    offsets.push(str.length)
    str += fileOrder[i]
    str += "\x00".repeat(8 - (str.length % 8))
  }
  var encoded = enc.encode(str)
  console.log(str)
  return [encoded, offsets, encoded.byteLength]
}

async function packPKZ(file) {
  $(`div[id="${file}"]`).find('h4').children('a.repack').replaceWith(`<div class='repack' style="padding: 0; background-color:#C5C5C5;"><span class='material-icons'>auto_fix_high</span> REPACKING...</div>`)
  var newFileOrder = [];
  $(`div[id="${file}"]`).find('div#files').find('tr').each(function(index) {
    if (index == 0) {return}
    newFileOrder[index-1] = $(this).find('input[type="text"]').val()
  })
  var workingfile = globalFiles[file];
  const numFiles = Object.keys(workingfile['files']).length
  var files = {};
  console.log('[DAT REPACKING] Reading files...')
  function afterRepack() {
    console.log("[DAT REPACKING] Writing DAT body...")
    var [names, nameOffsets, fileNameTableLength] = generatePKZFileTable(newFileOrder)
    var fileOffsets = [];
    var size = Math.ceil((32 + 32*numFiles + fileNameTableLength)/64)*64;
    for (var i = 0; i < numFiles; i++) {
      fileOffsets.push(size)
      size += Math.ceil(Number(workingfile['files'][workingfile['fileOrder'][i]]['compressedSize'])/64)*64 // padded to 64 byte increments
    }
    console.log(fileOffsets)
    var buffer = Uint32Array.from([1819962224, 65536, 0, 0, numFiles, 32, 0, 0]).buffer
    var dataView = new DataView(buffer)
    dataView.setBigUint64(8, BigInt(size), true)
    dataView.setBigUint64(24, BigInt(fileNameTableLength), true)
    outputArray = new Uint8Array(buffer)
    for (var i = 0; i < numFiles; i++) {
      var fileHeader = [nameOffsets[i], workingfile['files'][workingfile['fileOrder'][i]]['size'], fileOffsets[i], workingfile['files'][workingfile['fileOrder'][i]]['compressedSize']]
      outputArray = concatenateToUint8(outputArray, BigUint64Array.from(fileHeader.map(function (item) {return BigInt(item)})))
    }
    outputArray = concatenateToUint8(outputArray, names)
    var pos = outputArray.byteLength;
    for (var x = 0; x < numFiles; x++) {
      outputArray = concatenateToUint8(outputArray, new Uint8Array(fileOffsets[x] - pos));
      pos = fileOffsets[x];
      outputArray = concatenateToUint8(outputArray, new Uint8Array(files[workingfile['fileOrder'][x]]));
      pos = outputArray.byteLength;
      console.log(`[${x+1}/${numFiles}][${workingfile['fileOrder'][x]}]`)
    }
    outputArray = concatenateToUint8(outputArray, new Uint8Array(Math.ceil(pos/16)*16 - pos));
    var blob = new Blob([outputArray], {type: 'application/octet-stream'});
    console.log("PKZ Export complete. :)")
    saveAs(blob, file)
    $(`div[id="${file}"]`).find('h4').children('.repack').replaceWith(`<a class='repack' title='Repack the file into a game-ready PKZ.' onclick="packPKZ('${file}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
    return;
  }
  for (let i = 0; i < numFiles; i++) {
    let subFile = workingfile['files'][workingfile['fileOrder'][i]]
    let subFileName = workingfile['fileOrder'][i];
    let reader = new FileReader();
    let currentFile = i;
    reader.onloadend = async function(e) {
        if (e.target.readyState == FileReader.DONE) {
          if (subFile['kind'] == "custom") {
            ZstdCodec.run(zstd => {
              const streaming = new zstd.Streaming();
              files[subFileName] = streaming.compress(new Uint8Array(e.target.result));
              workingfile['files'][subFileName]['compressedSize'] = BigInt(files[subFileName].byteLength);
              workingfile['files'][subFileName]['size'] = BigInt(subFile.size);
              if (Object.keys(files).length == numFiles) {
                afterRepack();
              }
            })
          } else {
            files[subFileName] = e.target.result;
            if (Object.keys(files).length == numFiles) {
              afterRepack();
            }
          }
        }
      }
    if (subFile['kind'] == 'extracted') {
      // included file
      reader.readAsArrayBuffer(workingfile.fp.slice(Number(subFile['offset']), Number(subFile['offset']) + Number(subFile['compressedSize'])))
    } else {
      // custom file
      reader.readAsArrayBuffer(subFile.fp)
    }
  }
}