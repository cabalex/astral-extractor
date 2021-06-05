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

function clickFiles(event) {
  loadFiles(event.files).then(function() {
    $(event).val('');
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
  return new Promise(async (resolve, reject) => {
    let image = "assets/marker-3.png"
    if (unzippable.includes(fileType)) {
      image = "assets/marker-2.png"
    }
    file.name = file.name.replace(" ", "_")
    $('#sideBarContents').append(`<li class="sidebarList" title="${file.name}"><a href="#${file.name}" title="${file.name}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src=${image} height="30px">${file.name}</a></li>`)
    $('div#loading').replaceWith(`<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> ${fileType.toUpperCase()} File</h5><p>${fileInfo[fileType]}</p></div>`)
    if (fileType == 'pkz') {
      await loadInitialPKZ(fileType, file)
    } else if (['dat', 'dtt', 'evn', 'eff'].includes(fileType)) {
      await loadInitialDAT('dat', file)
    } else if (fileType == 'csv') {
      await loadInitialCSV(fileType, file)
    } else if (fileType == 'wmb') {
      await loadInitialWMB(fileType, file)
    } else if (['bxm', 'sar', 'seq', 'gad', 'ccd', 'rld'].includes(fileType)) {
      await loadInitialBXM('bxm', file)
    } else if (fileType == 'wta') {
      await loadInitialWTA('wta', file)
    } else if (fileType == 'bin') {
      await loadInitialPTD('ptd', file)
    } else {
      console.log("Unsupported file type!")
    }
    resolve()
  })
}


var blobs = 0;
var blobWriter;
var writer;
function downloadFile(fileType, name) {
  // this is actually inefficient for files that aren't PKZ and DAT, since all it does is pass to the other function. I'll fix it later
  if (fileType == 'csv') {
    downloadCSV(fileType, name);
  } else if (fileType == 'bxm') {
    downloadBXM(fileType, name);
  } else if (fileType == 'wmb') {
    downloadWMB(fileType, name)
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
    return new Promise(async (resolve, reject) => {
      blob.name = subFile
      console.log('new file = ' + subFile);
      if (!endsWithAny(fileTypes, subFile)) {
        $('div#content').append(`<h4 title=${subFile}><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ${subFile}</h4><p><b>This file type isn\'t valid (or at least, not yet).</b> Did you upload the wrong one?</p>`)
      } else {
        $('div#content').append(`<div id="${subFile}"><h4 title="${subFile}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${subFile}</h4><div id="loading"><div id="loadingBar">Loading file...</div></div></div>`)
        await loadInitial(blob.name.split('.')[blob.name.split('.').length-1], blob);
        resolve();
      }
      return;
    })
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
  return new Promise(async (resolve, reject) => {
    if (fileType == 'pkz') {
      await exportSubFilePKZ(fileType, name, subFile, returnFile)
    } else if (fileType == 'dat') {
      await exportSubFileDAT(fileType, name, subFile, returnFile)
    } else if (fileType == 'gameData') {
      await exportSubFileGameData(fileType, name, subFile, returnFile)
    } else {
      console.log(`unimplemented download of ${subFile} from ${name}`);
    }
    resolve()
  })
}

async function loadAllSubFiles(fileType, name) {
  var filenames = Object.keys(globalFiles[name]['files'])
  for (let i = 0, p = Promise.resolve(); i < filenames.length; i++) {
    if (!(Object.keys(globalFiles).includes(filenames[i])) && fileTypes.includes("." + filenames[i].split(".")[1])) {
      await downloadSubFile(fileType, name, filenames[i], "blob")
    }
  }
} 

async function loadSubFile(fileType, name, subFile) {
  await downloadSubFile(fileType, name, subFile, "blob")
  if (subFile.endsWith('.dat') && Object.keys(globalFiles[name]['files']).includes(subFile.replace('.dat', '.dtt'))) {
    if (globalFiles[name]['files'][subFile.replace('.dat', '.dtt')]['size'] != 0) {
      await downloadSubFile(fileType, name, subFile.replace('.dat', '.dtt'), "blob")
    }
  } else if ((subFile.endsWith('.dtt') && Object.keys(globalFiles[name]['files']).includes(subFile.replace('.dtt', '.dat')))) {
    if (globalFiles[name]['files'][subFile.replace('.dtt', '.dat')]['size'] != 0) {
      await downloadSubFile(fileType, name, subFile.replace('.dtt', '.dat'), "blob")
    }
  }
}

async function loadFiles(files) {
  
  if (!$('#initial').find('hr').length) {
    $('#initial').prepend('<hr class="rounded" style="margin-bottom: 30px">')
    $('#drop_zone_headings').css('display', 'none')
    $('#drop_zone').css('padding', '5px')
    $('drop_zone::before').css('background-image', '')
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
    if (Object.keys(globalFiles).includes(files[i].name)) {
      continue;
    }
    console.log('file[' + i + '].name = ' + files[i].name);
    if (!endsWithAny(fileTypes, files[i].name)) {
      $('div#content').append(`<div id="${files[i].name}"><h4 title="${files[i].name}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/lock.png" height="30px"> ${files[i].name}</h4><p><b>This file type isn\'t valid (or at least, not yet).</b> Did you upload the wrong one?</p></div>`)
      continue;
    } else {
      $('div#content').append(`<div id="${files[i].name}"><h4 title="${files[i].name}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${files[i].name}</h4><div id="loading"><div id="loadingBar">Loading file...</div></div></div>`)
      await loadInitial(files[i].name.split('.')[files[i].name.split('.').length-1], files[i]);
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
    var nameToDelete = $(elem).parents('li').attr('title');
  } else {
    var nameToDelete = $(elem).parents('h4').attr('title');
  }
  $(`div[id="${nameToDelete}"]`).remove();
  $(`li[title="${nameToDelete}"`).remove();
  delete globalFiles[nameToDelete];
  console.log()
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

function minimize(elem) {
  $(elem).closest('div').children('div').css('display', 'none')
  $(elem).replaceWith("<a class='maximize' onclick='maximize(this)'><span class='material-icons'>expand_more</span></a>")
}
function maximize(elem) {
  $(elem).closest('div').children('div').css('display', '')
  $(elem).replaceWith("<a class='minimize' onclick='minimize(this)'><span class='material-icons'>expand_less</span></a>")
}

function showDropdown(elem) {
  $(elem).parent().find('.dropdown').css('display', '')
  $(elem).replaceWith('<a onclick="hideDropdown(this)"><span class="material-icons">menu_open</span></a>')
}

function hideDropdown(elem) {
  $(elem).parent().find('.dropdown').css('display', 'none')
  $(elem).replaceWith('<a onclick="showDropdown(this)"><span class="material-icons">menu</span></a>')
}

function getHelp(elem) {
  // Improve in the future
  window.open("https://cabalex.github.io/astral-chain-romfs/romfs/")
}

function readableBytes(bytes) {
  if (bytes == 0) {
    return "0 B"
  }
  var i = Math.floor(Math.log(bytes) / Math.log(1024)),
  sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}

var fileTypes = ['.pkz', '.dat', '.dtt', '.eff', '.evn', '.csv', '.wmb', '.bxm', '.sar', '.seq', '.gad', '.ccd', '.rld', '.bin', 'GameData.dat']
var fileInfo = {
  "bxm": "Binary XML. Used for storing information about the game, especially events, cases, and cutscenes. Some strings are in Japanese, usually encoded with SHIFT-JIS; however, in quest/, they are encoded with UTF-8. It should autodetect this, but if it doesn't, click \"Change encoding\" in the dropdown menu.<br><b>BXM files are currently read-only right now.</b> I've  yet to come up with a clean editor, but it's coming soon!",
  "sar": "Binary XML files.",
  "seq": "Binary XML files.",
  "gad": "Binary XML files. Deals with cutscene lighting, depth of field, shadows, fog, filters, etc.",
  "ccd": "Binary XML files. CCD files hold more environmental parameters (?).",
  "rld": "Binary XML files. RLD files hold lighting effects in environments (?).",
  "pkz": "Compressed ZSTD archives containing most of the game's files.<br><b>NOTE: For most use cases, you do not need to repack these.</b> Usually, you can just place your files in the directory, and the game will load them fine.<br><b>You DO need to repack files in:</b> event/, core/, Text/",
  "dat": "DAT archive. Holds most of the game's files.",
  "dtt": "DAT archive. Almost identical to .DAT, but separated for performance.",
  "evn": "DAT archive. Identical to .DAT files.",
  "eff": "DAT archive. Identical to .DAT files.",
  "csv": "Comma-separated values. Holds parameters regarding the game. REPACKING encodes the file as SHIFT-JIS (the encoding used by the game), while DOWNLOADING encodes the file as UTF-16 (the encoding used by most modern devices).",
  "wmb": "Model files. Astral Extractor does not support re-adding models to the game- use Blender2AstralChain / AstralChain2Blender for that.<br><b>Model previews are still in development!</b> Some models may not display correctly, and textures (WTA/WTP) have not been implemented.",
  "bin": "Text files in PTD format. Stores most of the text in the game, except ones hardcoded (see MCD files in ui/). Note that empty sections are skipped.<br><b>Some of these files may take a while to load (especially TalkSubtitleMessage), so wait a bit!</b>"
}
var hamburgers = {
  'dat': '<div class="hamburger"><a onclick="showDropdown(this)"><span class="material-icons">menu</span></a></div>',
  'wmb': '<div class="hamburger" title=""><a onclick="showDropdown(this)"><span class="material-icons">menu</span></a><div style="display: none" class="dropdown"><span style="color: var(--light-grey)">MODEL PROPERTIES</span><a onclick="getHelp(this)"><span class="material-icons">help</span> What is this file?</a><a class="addTextures" onclick="addTexturesWMB(\'wmb\', this)"><span class="material-icons">collections</span> Add Textures <span class="nextArrow"><span class="material-icons">navigate_next</span></span></a><a class="addAnimations" onclick="addAnimationsWMB(\'wmb\', this)"><span class="material-icons">animation</span> Add Animations <span class="nextArrow"><span class="material-icons">navigate_next</span></span></a></div></div>',
  'bxm': '<div class="hamburger" title=""><a onclick="showDropdown(this)"><span class="material-icons">menu</span></a><div style="display: none" class="dropdown"><span style="color: var(--light-grey)">ENCODING: {encoding}</span><a onclick="changeEncodingBXM(\'{encoding}\', this)"><span class="material-icons">article</span> Change encoding</a></div></div>'
}

var unzippable = ['csv', 'bxm', 'wmb', 'uvd', 'wta']
$('#supportedFiles').text(fileTypes.join(", "))
var globalFiles = {}

var modal = document.getElementById("infoModal");
// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    if ($("script[src='" + src + "']").length === 0) {
        var script = document.createElement('script');
        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            reject();
        };
        script.src = src;
        document.body.appendChild(script);
    } else {
        resolve();
    }
});
}
loadScript("scripts/zstd-encoder.js") // like 3 MB JS file; load it in the background (usually you don't repack files that quickly)