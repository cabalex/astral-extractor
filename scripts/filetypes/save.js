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
          localFiles[`Image ${i}.jpg`] = {'offset': pos, 'data': new Blob([arr.slice(pos, pos+200048)], {type: 'image/jpeg'})}
        } else {
          break;
        }
        pos += 200048;
        i += 1;
      }
      var form = "<table><tr><th>ACTIONS</th><th>NAME</th><th>IMAGE</th>";
      for (const [ key, value ] of Object.entries(localFiles)) {
        var imageUrl = URL.createObjectURL(value['data']);
        form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'gameData\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><input type="file" id="${file.name}-${key}-upload" accept=".jpg, .jpeg" style="display:none"/><a class="hidden" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a></th><th><input type="text" disabled="true" size="16" value='${key}'></input></th><th><img src="${imageUrl}" height="100px"></img></th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
      }
      $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'gameData\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
      $//('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
      $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
      $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
      /*for (const key of Object.keys(localFiles)) {
        document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitDAT("dat", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
      }*/
      globalFiles[file.name] = {'fp': file, 'files': localFiles}
    }
  }
  reader.readAsArrayBuffer(file)
}

function exportSubFileGameData(fileType, name, subFile, returnFile) {
  sendOutSubFile(fileType, name, subFile, globalFiles[name]['files'][subFile]['data'], returnFile);
}

function loadInitialSlotData(fileType, file) {
  alert('Currently, only GameData editing is supported. SlotData save editing is coming soon!')
}