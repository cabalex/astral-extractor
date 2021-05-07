function dropHandler(ev) {
  
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  var files = [];
  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        files.push(ev.dataTransfer.items[i].getAsFile());
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      files.push(ev.dataTransfer.files[i]);
    }
  }
  if (files.length > 0) {
    loadFiles(files);
  }
}
function dragOverHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function clickFiles() {
  loadFiles(this.files);
}

function endsWithAny(suffixes, string) {
    for (let suffix of suffixes) {
        if(string.endsWith(suffix))
            return true;
    }
    return false;
}
// reading bytes
function getInt64Bytes(x) {
  let y= Math.floor(x/2**32);
  return [y,(y<<8),(y<<16),(y<<24), x,(x<<8),(x<<16),(x<<24)].map(z=> z>>>24)
}

function intFromBytes(byteArr) {
    return byteArr.reduce((a,c,i)=> a+c*2**(56-i*8),0)
}


// loading
function loadInitial(fileType, file) {
  var reader = new FileReader();
  if (fileType == 'pkz') {
    var header = null;
    var tmpFiles = null;
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
              names.push(tmpstr)
              tmpstr = ""
            }
          }
          console.log(names)
          for (var i = 0; i < header[4]; i++) {
            localFiles[names[i]] = tmpFiles[i]
          }
          var form = "<table><tr><th></th><th>NAME</th><th>SIZE</th><th>COMPR.</th><th>OFFSET</th>";
          for (const [ key, value ] of Object.entries(localFiles)) {
            form += `<tr><th><a onclick="downloadSubFile(\'pkz\', '${file.name}', '${key}')"><span class="material-icons">download</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th>${value[1]}</th><th>${value[3]}</th><th>${value[2]}</th></tr>`
          }
          $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' onclick="downloadFile(\'pkz\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
          $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
          $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
          globalFiles[file.name] = {'fp': file, 'files': localFiles}
          $('div#loading').replaceWith('<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> PKZ File</h5><p><b>PKZ files</b> are compressed ZSTD archives that hold almost all of the game\'s files.<br>Note: You don\'t need to repack these to mod the game- just putting the .DAT/.DTT files in the right place works fine.</p></div>')
        }
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 32))
  } else if (fileType == 'dat' || fileType == 'dtt') {
    return;
  }
}
blobs = [];
function downloadFile(fileType, name) {
  blobs = [];
  $(`div[id="${name}"]`).find('h4').find('a.download').replaceWith(`<a class='downloading'><span class='material-icons'>folder</span> DOWNLOADING ZIP...</a>`)
  const blobWriter = new zip.BlobWriter("application/zip");
  const writer = new zip.ZipWriter(blobWriter);
  for (const key of Object.keys(globalFiles[name]['files'])) {
    downloadSubFile(fileType, name, key, true)
  }
  async function wait() {
    if (blobs.length < Object.keys(globalFiles[name]['files']).length) {
      $(`div[id="${name}"]`).find('h4').find('a.downloading').replaceWith(`<a class='downloading'><span class='material-icons'>folder</span> DOWNLOADING ZIP... (DECOMPRESSING ${blobs.length}/${Object.keys(globalFiles[name]['files']).length})</a>`)
      setTimeout(function () {wait();}, 100);
    } else {
      for (var i = 0; i < blobs.length; i++) {
        $(`div[id="${name}"]`).find('h4').find('a.downloading').replaceWith(`<a class='downloading'><span class='material-icons'>folder</span> DOWNLOADING ZIP... (PACKING ${i}/${blobs.length})</a>`)
        await writer.add(Object.keys(globalFiles[name]['files'])[i], new zip.BlobReader(blobs[i]))
      }
      await writer.close()
      const blob = await blobWriter.getData();
      saveAs(blob, name.split('.')[0] + '.zip');
      $(`div[id="${name}"]`).find('h4').find('a.downloading').replaceWith(`<a class='download' onclick="downloadFile(\'pkz\', '${name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
    }
  }
  wait();
}

function downloadSubFile(fileType, name, subFile, returnFile = false) {
  var reader = new FileReader();
  if (fileType == 'pkz') {
    let workingfile = globalFiles[name];
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        const decoder = new ZSTDDecoder();
        await decoder.init();
        const decompressedArray = decoder.decode(new Uint8Array(e.target.result), Number(workingfile['files'][subFile][1]))
        var blob = new Blob([decompressedArray], {type: 'application/octet-stream'});
        if (returnFile == true) {
          blobs.push(blob);
          return
        }
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = subFile;
        document.body.appendChild(a);
        a.style = 'display: none';
        a.click();
        a.remove();
        setTimeout(function() {
          return window.URL.revokeObjectURL(url);
        }, 1000);
      }
    }
    reader.readAsArrayBuffer(workingfile.fp.slice(Number(workingfile['files'][subFile][2]), Number(workingfile['files'][subFile][2]) + Number(workingfile['files'][subFile][3])));
  } else {
    console.log(`unimplemented download of ${subFile} from ${name}`);
  }
}

function loadFiles(files) {
  $('#drop_zone').css('padding', '5px')
  $('#drop_zone_headings').remove()
  if (!$('#initial').find('hr').length) {
    $('#initial').prepend('<hr class="rounded" style="margin-bottom: 30px">')
  }
  $('#dropMessage').replaceWith('<p id="dropMessage"><b>More files?</b> Drag and drop or click to upload...</p>')
  $('html, body').css('overflow', 'inherit')
  for (var i = 0; i < files.length; i++) {
    console.log('file[' + i + '].name = ' + files[i].name);
    if (!endsWithAny(fileTypes, files[i].name)) {
      $('div#content').append('<h4><img src="assets/lock.png" height="30px"> ' + files[i].name + '</h4><p><b>This file type isn\'t valid (or at least, not yet).</b> Did you upload the wrong one?</p>')
      continue;
    }
    $('div#content').append('<div id=' + files[i].name + '><h4><img src="assets/legatus.png" height="30px"> ' + files[i].name + '</h4><div id="loading"><div id="loadingBar">Loading file...</div></div></div>')
    loadInitial(files[i].name.split('.')[1], files[i]);
  }
}

var fileTypes = ['.pkz']
var globalFiles = {}
document.getElementById("upload").addEventListener("change", clickFiles, false);
