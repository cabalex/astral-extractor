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

function loadInitialCSV(fileTypes, file, translateView=false) {
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
          var color = "transparent";
          var lastSetColor = -10;
          for (var x = 0; x < lines[i].length; x++) {
            // items in line
            let unitext = lines[i][x]
            unitext = decoder.decode(unitext.buffer);
            var color;
            if (file.name.includes("Color")) {
              if (x - lastSetColor > 2 && (x % 3 == 1 || ['LegionColorPreset.csv', 'LegionColorSet.csv', 'CharacterCustomizeColorSet.csv'].includes(file.name))) {
                try {
                  rgb = [parseInt(unitext), parseInt(decoder.decode(lines[i][x+1].buffer)), parseInt(decoder.decode(lines[i][x+2].buffer))]
                  if (!rgb.includes(NaN)) {
                    color = `rgb(${rgb})`
                    lastSetColor = x;
                  } else {
                    color = 'transparent';
                  }
                } catch {
                  color = 'transparent';
                }
              } else if (x - lastSetColor > 2) {
                color = 'transparent'
              }
            }
            if (!translateView) {
              form += `<th style="background-color: ${color}"><input class="${file.name}-${x}" type="text" value='${unitext}'></input></th>`;
            } else {
              if (unitext.length == 0) {
                form += `<th style="background-color: ${color}"><span class="csv-text" style="background-color: transparent" class="${file.name}-${x}" type="text"></span></th>`
              } else {
                form += `<th style="background-color: ${color}"><span class="csv-text" class="${file.name}-${x}" type="text" title="${unitext}">${lookup(unitext)}</span></th>`
              }
            }
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
        $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['csv'])
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll'>" + form + "</table></div>")
        globalFiles[file.name] = {'fp': file, 'translateView': translateView}
        if (translateView) {resolve(); return}
        for (var i = 0; i < maxLengthLength; i++) {
          $(`input[class="${file.name}-${i}"]`).attr('size', maxLength[i])
        }
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
        var itemstr;
        if (globalFiles[name]['translateView']) {
          itemstr = $(this).find('.csv-text').attr('title') + ",";
        } else {
          $(this).find('input').val() + ","
        }
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

function changeViewCSV(elem) {
  const filename = $(elem).parents('h4').attr('title');
  const file = globalFiles[filename]['fp'];
  var translateView = (globalFiles[filename]['translateView'] == false); // invert it
  defaultSettings['CSVtranslateText'] = translateView; // save the setting to config for future files
  delete globalFiles[filename];
  $(elem).parents('h4').replaceWith(`<h4 title="${filename}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${filename}</h4>`)
  $('div[id="' + filename + '"]').find("div.scroll").remove()
  loadInitialCSV('csv', file, translateView);
}