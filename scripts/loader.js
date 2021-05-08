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
  loadFiles(this.files).then(function() {
    $(this).val('');
  });
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

function arrayBufferToString(buffer){

    var bufView = new Uint8Array(buffer);
    var length = bufView.length;
    var result = '';
    var addition = Math.pow(2,16)-1;

    for(var i = 0;i<length;i+=addition){

        if(i + addition > length){
            addition = length - i;
        }
        result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
    }

    return result;

}

// loading
function loadInitial(fileType, file) {
  let image = "assets/marker-3.png"
  if (unzippable.includes(fileType)) {
    image = "assets/marker-2.png"
  }
  $('#sideBarContents').append(`<li class="sidebarList" title="${file.name}"><a href="#${file.name}" title="${file.name}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src=${image} height="30px">${file.name}</a></li>`)
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
          $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' onclick="downloadFile(\'pkz\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
          $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
          $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
          globalFiles[file.name] = {'fp': file, 'files': localFiles}
          $('div#loading').replaceWith('<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> PKZ File</h5><p><b>PKZ files</b> are compressed ZSTD archives that hold almost all of the game\'s files.<br>Note: You don\'t need to repack these to mod the game- just putting the .DAT/.DTT files in the right place works fine.</p></div>')
        }
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 32))
  } else if (fileType == 'dat' || fileType == 'dtt' || fileType == 'evn') {
    var header = null;
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        if (header == null) {
          header = new Uint32Array(e.target.result);
          // magic - 0
          // filenumber - 1
          // fileoffsetsoffset - 2
          // fileextensionsoffset - 3
          // filenamesoffset - 4
          // filesizesoffset - 5
          // hashmapoffset - 6
          reader.readAsArrayBuffer(file.slice(28, header[6] + 16*header[1]))
        } else {
          const fileOffsetsTable = new Uint32Array(e.target.result.slice(header[2] - 28, header[2] - 28 + header[1]*4));
          const wholeFileExt = arrayBufferToString(e.target.result.slice(header[3] - 28, header[3] - 28 + header[1]*4));
          const sizesTable = new Uint32Array(e.target.result.slice(header[5] - 28, header[5] - 28 + header[1]*4));
          var names = [];
          var substring = arrayBufferToString(e.target.result.slice(header[4] - 27, header[6] - 27)).replace(/[^\x20-\x7E]/g, '');
          var tmpstr = "";
          for (var i = 0; i < substring.length; i++) {
            tmpstr += substring[i];
            if (tmpstr.charAt(tmpstr.length-4) == ".") {
              names.push(tmpstr);
              tmpstr = "";
            }
          }
          var localFiles = {}
          for (var i = 0; i < header[1]; i++) {
            localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted'}; // kinds: "extracted" and "custom"
          }
          var form = "<table><tr><th>ACTIONS</th><th>NAME</th><th>SIZE</th><th>OFFSET</th>";
          for (const [ key, value ] of Object.entries(localFiles)) {
            let supported = "hidden"
            if (endsWithAny(fileTypes, key)) {
              supported = "open_in_new"
            }
            let replace = "hidden"//"file_upload"
            form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><a class="${replace}" title="Replace this file." onclick="replaceFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">file_upload</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th>${value.size}</th><th>${value.offset}</th></tr>`
          }
          $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
          $('div[id="' + file.name + '"]').find('h4').append(`<a class='download' onclick="repackFile(\'dat\', '${file.name}')"><span class='material-icons'>archive</span> REPACK</a>`)
          $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
          $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
          globalFiles[file.name] = {'fp': file, 'files': localFiles}
          $('div#loading').replaceWith('<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> DAT/DTT File</h5><p><b>DAT and DTT files</b> are the bread and butter of Astral Chain- that is, they store models, UI, event data, etc...</p></div>')
        }
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 28))
  } else if (fileType == 'csv') {
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        var tmpLines = [];
        lines = e.target.result.split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
          tmpLines[i] = lines[i].split(",")
        }
        globalFiles[file.name] = {'fp': file, 'lines': tmpLines[i]}
        var form = "<div class='scroll'><table>";
        for (var i = 0; i < tmpLines.length; i++) {
          form += `<tr>`
          for (var x = 0; x < tmpLines[i].length; x++) {
            form += `<th><input type="text" size="8" value='${tmpLines[i][x]}'></input></th>`
          }
          form += "</tr>"
        }
        form += "</table></div>"
        $('div[id="' + file.name + '"]').find('h4').append(` - ${tmpLines.length} lines <a class='download' onclick="downloadFile(\'csv\', '${file.name}')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD CSV</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
        $('div#loading').replaceWith('<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> CSV File</h5><p><b>CSV files</b> are unremarkable config files.</p></div>')
      }
    }
    reader.readAsText(file)
  } else {
    console.log("Unsupported file type!")
    return;
  }
}


var blobs = 0;
var blobWriter;
var writer;
function downloadFile(fileType, name) {
  if (fileType == 'csv') {
    var output = ""
    $(`div[id="${name}"`).find('tr').each(function (i, el) {
        $(this).find('th').each(function (i, el) {
          output += $(this).find('input').attr('value') + ","});
        output = output.substr(0, output.length-1) + "\r\n"
    });
    var blob = new Blob([output.substr(0, output.length-2)], {type: "application/text"})
    saveAs(blob, name);
  } else {
    blobs = 0;
    $(`div[id="${name}"]`).find('h4').children('a.download').replaceWith(`<div class='download' style="padding: 0; background-color:#C5C5C5;"><span class='material-icons'>folder</span> DOWNLOADING ZIP...</div>`)
    blobWriter = new zip.BlobWriter("application/zip");
    writer = new zip.ZipWriter(blobWriter);
    for (const key of Object.keys(globalFiles[name]['files'])) {
      downloadSubFile(fileType, name, key, true)
    }
    async function wait() {
      if (blobs < Object.keys(globalFiles[name]['files']).length) {
        $(`div[id="${name}"]`).find('h4').children('.download').replaceWith(`<div class='download' style="padding: 0; background-color:#C5C5C5;"><div id='downloadBar' style='width: calc(100%/${Object.keys(globalFiles[name]['files']).length}*${blobs});'><span class='material-icons'>folder</span> DOWNLOADING ZIP... (${blobs}/${Object.keys(globalFiles[name]['files']).length})</div></div>`)
        setTimeout(function () {wait();}, 100);
      } else {
        await writer.close()
        const blob = await blobWriter.getData();
        saveAs(blob, name.split('.')[0] + '.zip');
        $(`div[id="${name}"]`).find('h4').children('.download').replaceWith(`<a class='download' onclick="downloadFile(\'pkz\', '${name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
      }
    }
    wait();
  }
}
async function sendOutSubFile(fileType, name, subFile, blob, returnFile) {
  if (returnFile == true) {
    await writer.add(subFile, new zip.BlobReader(blob)).then(function() {blobs += 1;});
    return;
  } else if (returnFile == "blob") {
    if (Object.keys(globalFiles).includes(subFile)) {
      return;
    };
    blob.name = subFile
    console.log('new file = ' + subFile);
    if (!endsWithAny(fileTypes, subFile)) {
      if (subFile.endsWith('.wmb')) {
        $('div#content').append('<h4 title=' + subFile + '><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ' + subFile + '</h4><p><b>You can\'t edit WMB files here.</b> Try using <a href="https://github.com/cabalex/AstralChain2Blender">AstralChain2Blender</a> and <a href="https://github.com/cabalex/Blender2AstralChain">Blender2AstralChain</a>.</p>')
      } else {
        $('div#content').append('<h4 title='+ subFile + '><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ' + subFile + '</h4><p><b>This file type isn\'t valid (or at least, not yet).</b> Did you upload the wrong one?</p>')
      }
    } else {
      $('div#content').append('<div id=' + subFile + '><h4 title=' + subFile + '><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ' + subFile + '</h4><div id="loading"><div id="loadingBar">Loading file...</div></div></div>')
      await loadInitial(blob.name.split('.')[1], blob);
    }
    return;
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


function downloadSubFile(fileType, name, subFile, returnFile = false) {
  var reader = new FileReader();
  const workingfile = globalFiles[name];
  if (fileType == 'pkz') {
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
  } else if (fileType == 'dat') {
    reader.onloadend = async function(e) {
      if (e.target.readyState == FileReader.DONE) {
        var blob = new Blob([e.target.result], {type: 'application/octet-stream'});
        sendOutSubFile(fileType, name, subFile, blob, returnFile);
      }
    }
    reader.readAsArrayBuffer(workingfile.fp.slice(workingfile['files'][subFile]['offset'], workingfile['files'][subFile]['offset'] + workingfile['files'][subFile]['size']));
  } else {
    console.log(`unimplemented download of ${subFile} from ${name}`);
  }
}
// repacking
function repackFile(fileType, name) {
  alert('Coming soon!')
}
function replaceFile(fileType, name, subFile) {
  alert('coming soon!')
}

function loadSubFile(fileType, name, subFile) {
  if (subFile.endsWith('.wmb')) {
    window.open("https://github.com/cabalex/AstralChain2Blender")
  } else {
    downloadSubFile(fileType, name, subFile, "blob")
  }
}

async function loadFiles(files) {
  
  if (!$('#initial').find('hr').length) {
    $('#initial').prepend('<hr class="rounded" style="margin-bottom: 30px">')
    $('#drop_zone_headings').css('display', 'none')
    $('#drop_zone').css('padding', '5px')
    $('#workspace').css('margin-left', '180px')
    $('.sideBar').css('display', 'block')
    $('#topBar').css('box-shadow', '0 0 1em rgba(0, 0, 0, 0.5)')
    $('#topBar').css('margin-left', '180px')
    $('#topBar').css('padding-left', '5px')
    $('#title').css('display', 'none')
  }
  $('#dropMessage').replaceWith('<p id="dropMessage"><b>More files?</b> Drag and drop or click to upload...</p>')
  $('html, body').css('overflow', 'inherit')
  for (var i = 0; i < files.length; i++) {
    console.log(Object.keys(globalFiles))
    if (Object.keys(globalFiles).includes(files[i].name)) {
      continue;
    }
    console.log('file[' + i + '].name = ' + files[i].name);
    if (!endsWithAny(fileTypes, files[i].name)) {
      if (files[i].name.endsWith('.wmb')) {
        $('div#content').append(`<div id=${files[i].name}><h4 title=${files[i].name}><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ${files[i].name}</h4><p><b>You can\'t edit WMB files here.</b> Try using <a href="https://github.com/cabalex/AstralChain2Blender">AstralChain2Blender</a> and <a href="https://github.com/cabalex/Blender2AstralChain">Blender2AstralChain</a>.</p></div>`)
      } else {
        $('div#content').append(`<div id=${files[i].name}><h4 title=${files[i].name}><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ${files[i].name}</h4><p><b>This file type isn\'t valid (or at least, not yet).</b> Did you upload the wrong one?</p></div>`)
      }
      continue;
    } else {
      $('div#content').append(`<div id=${files[i].name}><h4 id=${files[i].name}><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${files[i].name}</h4><div id="loading"><div id="loadingBar">Loading file...</div></div></div>`)
      await loadInitial(files[i].name.split('.')[1], files[i]);
    }
  }
}

function onHover(elem) {
  $(elem).attr('alt', $(elem).attr('src'));
  $(elem).attr('src', 'assets/delete.png');
}

function offHover(elem) {
  $(elem).attr('src', $(elem).attr('alt'));
}

function deleteItem(elem) {
  if ($(elem).parents('li').length) {
    var nameToDelete = $(elem).parents('li').text().split(" ")[0];
  } else {
    var nameToDelete = $(elem).parents().text().split(" ")[1];
  }
  $(`div[id="${nameToDelete}"]`).remove();
  $(`li[title="${nameToDelete}"`).remove();
  delete globalFiles[nameToDelete];
  if (Object.keys(globalFiles).length == 0) {
    $('hr').remove()
    $('#drop_zone_headings').css('display', '')
    $('#drop_zone').css('padding', '')
    $('#workspace').css('margin-left', '')
    $('.sideBar').css('display', 'none')
    $('#topBar').css('box-shadow', '')
    $('#topBar').css('margin-left', '')
    $('#topBar').css('padding-left', '')
    $('#title').css('display', '')
    $('#dropMessage').replaceWith('<p id="dropMessage">Drag and drop or click to upload...</p>')
    $('html, body').css('overflow', 'hidden')
  }
}

var fileTypes = ['.pkz', '.dat', '.dtt', '.evn', '.csv', '.wmb']
var unzippable = ['csv']
$('#supportedFiles').text(fileTypes.join(", "))
var globalFiles = {}
document.getElementById("upload").addEventListener("change", clickFiles, false);
