// Handling of WTA/WTP and WTB.

class WTA {
	constructor(buffer) {
		this.magic = heade
	}
}

function loadInitialWTA(fileType, file) {
  return
  var reader = new FileReader();
  reader.onloadend = function(e) {
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
        const wholeFileExt = arrayBufferToString(e.target.result.slice(header[3] - 28, header[3] - 28 + header[1]*4));
        const sizesTable = new Uint32Array(e.target.result.slice(header[5] - 28, header[5] - 28 + header[1]*4));
        var substring = arrayBufferToString(e.target.result.slice(header[4] - 27, header[6] - 27)).replace(/[^\x20-\x7E]/g, '');
        var tmpstr = "";
        for (var i = 0; i < substring.length; i++) {
          tmpstr += substring[i];
          if (tmpstr.charAt(tmpstr.length-4) == ".") {
            names.push(tmpstr);
            tmpstr = "";
          }
        }
        for (var i = 0; i < header[1]; i++) {
          localFiles[names[i]] = {'offset': fileOffsetsTable[i], 'size': sizesTable[i], 'kind': 'extracted'}; // kinds: "extracted" and "custom"
        }
        hashes = true
        reader.readAsArrayBuffer(file.slice(header[6], fileOffsetsTable[0]))
      } else {
        var form = `<table><tr><th style="text-align: center;"><a onclick='loadAllSubFiles(\"pkz\", \"${file.name}\")'>OPEN ALL</a></th><th>NAME</th><th>SIZE</th><th>OFFSET</th>`;
        for (const [ key, value ] of Object.entries(localFiles)) {
          let supported = "hidden"
          if (endsWithAny(fileTypes, key)) {
            supported = "open_in_new"
          }
          form += `<tr><th><a title="Download this file." onclick="downloadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">download</span></a><a class="${supported}" title="Open this file in a new editor section." onclick="loadSubFile(\'dat\', '${file.name}', '${key}')"><span class="material-icons">open_in_new</span></a><input type="file" id="${file.name}-${key}-upload" accept=".${key.split('.')[1]}" style="display:none"/><a class="file_upload" title="Replace this file." onclick="$('input[id=&quot;${file.name}-${key}-upload&quot;]').trigger('click');"><span class="material-icons">file_upload</span></a><a title="Remove this file permanently from the DAT." onclick="removeSubFile(\'dat\', \'${file.name}\', \'${key}\', this)"><span class="material-icons">close</span></a></th><th><input type="text" disabled="true" size="25" value='${key}'></input></th><th title="${value['size']} bytes">${readableBytes(value['size'])}</th><th title="${readableBytes(value['offset'])}">${value.offset}</th><th class="replacedIndicator"><img height="30px" title="File has not been replaced." alt="Not replaced" src="assets/unreplaced-black.png"</th></tr>`
        }
        $('div[id="' + file.name + '"]').find('h4').append(` - ${Object.keys(localFiles).length} files <a class='download' title='Download the extracted files as a ZIP.' onclick="downloadFile(\'dat\', '${file.name}')"><span class='material-icons'>folder</span> DOWNLOAD ZIP</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='repack' title='Repack the file into a game-ready DAT.' onclick="packDAT('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll'>" + form + "</table></div>")
        for (const key of Object.keys(localFiles)) {
          document.getElementById(`${file.name}-${key}-upload`).addEventListener("change", function(event) { if (replaceInitDAT("dat", file.name, key, event.target.files) == true) {$(this).closest('tr').find('th.replacedIndicator').replaceWith('<th class="replacedIndicator"><img height="30px" title="Replaced file." alt="Replaced file." src="assets/replaced-black.png"></img></th>')}}, false);
        }
        globalFiles[file.name] = {'fp': file, 'files': localFiles, 'fileOrder': names.slice(0, Object.keys(localFiles).length), 'hashMap': e.target.result}
      }
    }
  }
  reader.readAsArrayBuffer(file.slice(0, 28))
}