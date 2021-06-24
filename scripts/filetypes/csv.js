function convertCSVtoArray(buffer) {
  var arr = new Uint8Array(buffer);
  var individualList = [];
  var returningItem = [];
  var returning = [];
  var commaCount = 0;
  var z = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == 44) {
      // comma
      returningItem.push(Uint8Array.from(individualList));
      individualList = [];
      z ++;
    } else if (arr[i] == 13 && arr[i+1] == 10) {
      // new line
      returningItem.push(Uint8Array.from(individualList));
      returning.push(returningItem);
      returningItem = [];
      individualList = [];
      if (z > commaCount) {
        commaCount = z;
      }
      z = 0;
      i++; // pad out 0x0a
    } else {
      individualList.push(arr[i]);
    }
  }
  return [returning, commaCount];
}

function escapeInvalidCSV(arr) {
  var returning = "";
  for (var i = 0; i < arr.length; i++) {
    returning += "\\x" + arr[i].toString(16)
  }
  return returning;
}

function convertChars(text) {
  var returnarr = Encoding.stringToCode(text)
  var returning = Encoding.convert(returnarr, {
    to: 'SJIS', // to_encoding
    from: 'AUTO' // from_encoding
  });
  return Uint8Array.from(returning);
}

function formatChars(text) {
  var returning = new Uint8Array()
  for (var i = 0; i < text.length; i++) {
    returning = concatenateToUint8(returning, Uint8Array.from([text.charCodeAt(i)]))
  }
  return returning;
}

function loadInitialCSV(fileTypes, file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        var [lines, maxLengthLength] = convertCSVtoArray(e.target.result);
        var maxLength = new Array(maxLengthLength).fill(1)
        var form = "<div class='scroll'><table>";
        var output = [];
        decoder = new TextDecoder("shift-jis");
        for (var i = 0; i < lines.length; i++) {
          // lines
          var currentLine = [];
          form += "<tr>"
          for (var x = 0; x < lines[i].length; x++) {
            // items in line
            let unitext = lines[i][x]
            unitext = decoder.decode(unitext.buffer);
            form += `<th><input class="${file.name}-${x}" type="text" value='${unitext}'></input></th>`;
            currentLine.push(unitext);
            if (unitext.length > maxLength[x]) {
              maxLength[x] = unitext.length;
            }
          }
          output.push(currentLine);
          form += "</tr>";

        }
        form += "</table></div>"
        $('div[id="' + file.name + '"]').find('h4').append(` - ${lines.length} lines <a class='download' onclick="downloadCSV(\'csv\', '${file.name}', 'false')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD CSV</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(` <a class='repack' title='Repack the file into a game-ready CSV.' onclick="downloadCSV(\'csv\', '${file.name}', 'true')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll'>" + form + "</table></div>")
        for (var i = 0; i < maxLengthLength; i++) {
          $(`input[class="${file.name}-${i}"]`).attr('size', maxLength[i])
        }
        globalFiles[file.name] = {'fp': file}
        resolve();
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function downloadCSV(fileType, name, repack=false) {
  var output = new Uint8Array();
  $(`div[id="${name}"`).find('tr').each(function (i, el) {
      $(this).find('th').each(function (i, el) {
        var itemstr = $(this).find('input').val() + ","
        if (repack) {
          output = concatenateToUint8(output, convertChars(itemstr));
        } else {
          output = concatenateToUint8(output, formatChars(itemstr));
        }
      });
      output = concatenateToUint8(output.slice(0, output.length-1), Uint8Array.from([13, 10]))
  });
  var blob = new Blob([output], {type: "application/text"})
  saveAs(blob, name);
}