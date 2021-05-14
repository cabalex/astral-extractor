function loadInitialGameData(fileType, file) {
  // Images.
  reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      arr = new Uint8Array(e.target.result);
      var firstOffset = null;
      var comparison = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).toString()
      var i = 0;
      while (i < 200000) {
        if (arr.slice(i, i+4).toString() == comparison) {
          firstOffset = i;
          break;
        }
        i += 4;
      }
      if (firstOffset == null) {
        alert("Couldn't find images")
        return;
      }
      var pos = firstOffset;
      var i = 0;
      var localFiles = []
      while (pos < arr.length) {
        if (arr.slice(pos, pos+4).toString() == comparison) {
          localFiles[`Image ${i}.jpg`] = {'offset': pos, 'data': arr.slice(pos, pos+200048)}
        } else {
          break;
        }
        pos += 200048;
        i += 1;
      }
      var form = "<table><tr><th>ACTIONS</th><th>NAME</th><th>IMAGE</th>";
      for (const [ key, value ] of Object.entries(localFiles)) {
        var imageUrl = URL.createObjectURL(new Blob([value['data']], {type: 'image/jpeg'}));
        form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'gameData\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="open_in_new" title="Open this file in a new editor section." onclick="window.open('${imageUrl}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".jpg, .jpeg" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th class="imagePreview"><img src="${imageUrl}" height="100px"></img></th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
      }
      $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'gameData\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
      $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' onclick="packGameData('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
      $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
      $('div[id="' + file.name + '"]').append("<p style='margin-left: 10px;'><b>WARNING:</b> While repacking images is supported, the game may not display them correctly if they are incompatible, and will softlock in places where the image is shown (e.g. the photo album). You have been warned!</p>")
      var saveSlots = ["Slot A", "Slot B"]
      $('div[id="' + file.name + '"]').append(`<p>In progress slot (0x08): <b>${saveSlots[arr[8]]}</b></p>`)
      $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
      for (const key of Object.keys(localFiles)) {
        document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitGameData("dat", file.name, key, event.target.files, this) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
      }
      globalFiles[file.name] = {'fp': file, 'files': localFiles, 'beforeData': arr.slice(0, firstOffset), 'afterData': arr.slice(pos, arr.length)}
    }
  }
  reader.readAsArrayBuffer(file)
}

function replaceInitGameData(fileType, name, subFile, files, thisElem) {
  reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      customarr = new Uint8Array(e.target.result)
      oldarray = concatenateToUint8(new Uint8Array(200000), globalFiles[name]['files'][subFile]['data'].slice(200000, 200048))
      for (var i = 0; i < customarr.length; i++) {
        oldarray[i] = customarr[i] // overwrite bytes
      }
      globalFiles[name]['files'][subFile]['data'] = oldarray
      var imageUrl = URL.createObjectURL(new Blob([oldarray], {type: 'image/jpeg'}));
      $(thisElem).parents('tr').find('th.imagePreview').find('img').attr('src', imageUrl)
      console.log(`custom file - ${files[0].name}`)
      $(thisElem).val('');
    }
  }
  reader.readAsArrayBuffer(files[0])
  
  return true;
}

function packGameData(file) {
  var workingfile = globalFiles[file];
  var arr = workingfile['beforeData']
  console.log(workingfile)
  for (const [ key, value ] of Object.entries(workingfile['files'])) {
    arr = concatenateToUint8(arr, value['data'])
  }
  arr = concatenateToUint8(arr, workingfile['afterData'])
  var blob = new Blob([arr], {type: 'application/octet-stream'});
  console.log("GameData Export complete. :)")
  saveAs(blob, file)
}

function exportSubFileGameData(fileType, name, subFile, returnFile) {
  sendOutSubFile(fileType, name, subFile, globalFiles[name]['files'][subFile]['data'], returnFile);
}

function loadInitialSlotData(fileType, file) {
  alert('Currently, only GameData editing is supported. SlotData save editing is coming soon!')
}