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
  var returning = new Uint8Array()
  for (var i = 0; i < text.length; i++) {
    if ((text[i] + text[i+1]) == "\\x") {
      returning = concatenateToUint8(returning, Uint8Array.from([parseInt(text.substr(i+2, i+3), 16)]));
      i += 3;
    } else {
      returning = concatenateToUint8(returning, Uint8Array.from([text.charCodeAt(i)]))
    }
  }
  return returning;
}

function loadInitialCSV(fileTypes, file) {
  var reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      var [lines, maxLengthLength] = convertCSVtoArray(e.target.result);
      var maxLength = new Array(maxLengthLength).fill(1)
      var form = "<div class='scroll'><table>";
      decoder = new TextDecoder();
      for (var i = 0; i < lines.length; i++) {
        // lines
        form += "<tr>"
        for (var x = 0; x < lines[i].length; x++) {
          // items in line
          let unitext = lines[i][x]
          if ((/^[\x00-\x7F]*$/.test(decoder.decode(unitext.buffer)))) {
            unitext = decoder.decode(unitext.buffer);
            form += `<th><input class="${file.name}-${x}" type="text" value='${unitext}'></input></th>`;
          } else {
            unitext = escapeInvalidCSV(unitext);
            form += `<th><input class="${file.name}-${x}" type="text" disabled="true" title="This field has binary data, and as such can't be edited (yet). Use an external editor!" value='${unitext}'></input></th>`
          }
          if (unitext.length > maxLength[x]) {
            maxLength[x] = unitext.length;
          }
        }
        form += "</tr>"

      }
      form += "</table></div>"
      $('div[id="' + file.name + '"]').find('h4').append(` - ${lines.length} lines <a class='download' onclick="downloadFile(\'csv\', '${file.name}')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD CSV</a>`)
      $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
      $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
      for (var i = 0; i < maxLengthLength; i++) {
        $(`input[class="${file.name}-${i}"]`).attr('size', maxLength[i])
      }
    }
  }
  reader.readAsArrayBuffer(file)

}

function downloadCSV(fileType, name) {
  var output = new Uint8Array();
  $(`div[id="${name}"`).find('tr').each(function (i, el) {
      $(this).find('th').each(function (i, el) {
        var itemstr = $(this).find('input').val() + ","
        output = concatenateToUint8(output, convertChars(itemstr));
      });
      output = concatenateToUint8(output.slice(0, output.length-1), Uint8Array.from([13, 10]))
  });
  var blob = new Blob([output], {type: "application/text"})
  saveAs(blob, name);
}