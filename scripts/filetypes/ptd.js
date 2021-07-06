// PTD text files (.bin) -  a lot of jank code that i'm not sure how it still functions

/*

PTD files are split into 2 tables; one being the key and one being the value.
The tables both have:
- main header
- headers for each string (although value is more complex; see below)
- main text encoded in UTF-16le with a weird offset

Here's how it goes:
- Main header
- String headers
- Actual strings

- Table 2 headers | One per section, only really used in TalkSubtitleMessage where each section is approx. one in-game file.
  - Section headers
  - Hashes
  - String[s] headers (This exists because one key can have more than one value string. The "count" variable determines how many strings it has. Two sections are only really used in TalkSubtitleMessage, where one is the message and the other is the person speaking, but otherwise the second table is null.)
    - String headers
    - String content
  ^ repeat # of string[s] headers
^ repeat # of table 2 headers
Is only table 2 and its hashes used, and table 1 is only used for easier translation? Not sure.
*/

// NOTE: This unpacker/repacker FORCES 2 values per key, which may not always be ideal for other games. For Astral Chain though, it seems like there is 2 values to a key in every text file.

// REMEMBER: STRINGS ARE ZERO (\u0000) PADDED AT THE END!
function matchKeyAndValue(hashes, keyList, valueList) {
  result = {};
  var debug_keylist = []
  const dec = new TextDecoder("utf-16le")
  for (var i = 0; i < hashes.length; i++) {
    var key = "";
    var value = [];
    for (var x = 0; x < keyList.length; x++) {
      if (hashes[i] == keyList[x]['header'][0]) {
        debug_keylist.push(keyList[x])
        key = dec.decode(keyList[x]['text']).replace(/\0/g, '')
      }
    }
    for (var x = 0; x < valueList.length; x++) {
      if (hashes[i] == valueList[x]['header'][0]) {
        value.push(dec.decode(valueList[x]['text']).replace(/\0/g, ''))
        if (value.length > 1) {
          break
        }
      }
    }
    result[key] = value
  }
  var missingKeys = keyList.filter(e => !debug_keylist.includes(e))
  return [result, missingKeys];
}

function loadInitialPTD(fileType, file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        const header = new Uint32Array(e.target.result.slice(0, 28))
        /* MAIN header */
        // 0 - PTD\x00 (4478032)
        // 1 - version? (always 2?)
        // 2 - ??? (always 38?)
        // 3 - amount of keys
        // 4 - table offset
        // 5 - header sections in second table
        // 6 - data offset
        var keyHeaders = [];
        var keyGlobalOffsets = [];
        for (var i = 0; i < header[3]; i++) {
          var strHeader = new Uint32Array(e.target.result.slice(header[4]+i*16, header[4]+(i+1)*16))
          keyHeaders.push(strHeader)
          keyGlobalOffsets.push(strHeader[1]+i*16+28)
        }
        /* STRING headers */
        // 0 - hash
        // 1 - entries relative offset (from this position)
        // 2 - count of 2-byte chars
        // 3 - length of actual string

        var pos = header[4]+header[3]*16
        var stringKeys = [];
        var keys = [];
        for (var i = 0; i < header[3]; i++) {
          stringKeys.push(new Uint8Array(e.target.result.slice(keyGlobalOffsets[i], keyGlobalOffsets[i]+keyHeaders[i][3])).map(function (item) {return ((item - 0x26) % 256)})); // UTF-16; 2 bytes per char
          pos = keyGlobalOffsets[i]+keyHeaders[i][3]
          keys.push({"header": keyHeaders[i], "text": stringKeys[i]})
          if (keyHeaders[i][0] == 413100054) {
            console.log(keys[i])
          }
        }
        var secondTableHeaders = [];
        for (var i = 0; i < header[5]; i++) {
          secondTableHeaders.push(new Uint32Array(e.target.result.slice(pos, pos+20)))
          pos += 20;
        }
        /* header2 (the header of the data) */
        // 0 - hash
        // 1 - count1 (always 1, except for empty tables, which it is 0)
        // 2 - relative offset 1
        // 3 - count2 (always 2 since there are always 2 values?)
        // 4 - relative offset 2
        var hashTable = []
        var totalItems = 0;
        for (var y = 0; y < secondTableHeaders.length; y++) {
          console.log("Loading section " + y)
          var header2 = secondTableHeaders[y];
          var dataHeaders = [];
          for (var i = 0; i < header2[1]; i++) {
            dataHeaders.push(new Uint32Array(e.target.result.slice(pos, pos+12)))
            pos += 12;
          }
          /* DATA headers AND VALUE headers */
          // 0 - hash
          // 1 - count
          // 2 - relative offset from start of current header
          // WHAT'S THE DIFFERENCE? Data headers are the headers that pertain to each section of strings, while VALUE headers are each string's header.
          hashes = [];
          for (var i = 0; i < header2[1]; i++) {
            hashes.push(new Uint32Array(e.target.result.slice(pos, pos+(dataHeaders[i][1]*4))))
            pos += dataHeaders[i][1]*4;
          }
          var valueHeaders = [];
          for (var i = 0; i < header2[3]; i++) {
            var strHeader = new Uint32Array(e.target.result.slice(pos, pos+12))
            valueHeaders.push(strHeader)
            pos += 12;
            // follows same header structure above
          }
          hashTable[y] = {"hash": header2[0], "dataHeaders": dataHeaders.map(function (item) {return item[0]}), "valueHeaders": valueHeaders.map(function (item) {return item[0]})}
          if (valueHeaders[0][1] == 0) {
            console.log("No text here, continuing")
            $('div[id="' + file.name + '"]').append(`<h3 style="margin-left: 10px;">Section ${y} (empty)</h3><div id='files' style='display: inline-block;' class='scroll'><table id="section-${y}" hash="${header2[0].toString(16)}"></table></div>`)
            continue
          }
          console.log(valueHeaders[0][1], valueHeaders[1][1], header[3])
          var values = [];
          for (var i = 0; i < valueHeaders.length; i++) {
            var localValueHeaders = [];
            for (var x = 0; x < valueHeaders[i][1]; x++) {
              localValueHeaders.push(new Uint32Array(e.target.result.slice(pos, pos+16)))
              pos += 16;
            }
            var localValueStrings = [];
            for (var x = 0; x < valueHeaders[i][1]; x++) {
              localValueStrings.push(new Uint8Array(e.target.result.slice(pos, pos+(localValueHeaders[x][2]*2))).map(function (item) {return ((item - 0x26) % 256)})); // UTF-16; 2 bytes per char
              pos += localValueHeaders[x][2]*2;
              values.push({"header": localValueHeaders[x], "text": localValueStrings[x]})
            }
          }
          // sendouts
          var [dict, missingKeys] = matchKeyAndValue(hashes[0], keys, values)
          var form = `<table id="section-${y}" hash="${header2[0].toString(16)}">`;
          for (var i = 0; i < Object.keys(dict).length; i++) {
            // lines
            form += `<tr><th class="hash">${hashes[0][i].toString(16).toUpperCase()}</th><th class="key"><input class="${file.name}?${i}" type="text" size="32" value="${Object.keys(dict)[i]}"></input></th>`
            form += `<th class="value1"><textarea class="${file.name}-0" rows="4" cols="36">${dict[Object.keys(dict)[i]][0]}</textarea></th><th class="value2"><textarea class="${file.name}-1" rows="4" cols="36">${dict[Object.keys(dict)[i]][1]}</textarea></th>`;
            form += "</tr>"
          }
          totalItems += Object.keys(dict).length;
          form += "</table></div>"
          $('div[id="' + file.name + '"]').append(`<h3 style="margin-left: 10px;">Section ${y}</h3><div id='files' style='display: inline-block;' class='scroll'>` + form + "</table></div>")
        }
        $('div[id="' + file.name + '"]').find('h4').append(`<span style="display: none;" class="sectionCount" count="${secondTableHeaders.length}"></span>`)
        $('div[id="' + file.name + '"]').find('h4').append(` - ${secondTableHeaders.length} sections (${totalItems} items total) <a class='download' onclick="downloadPTD(\'ptd\', '${file.name}', 'false')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD AS JSON</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(` <a class='repack' title='Repack the file into a game-ready PTD.' onclick="packPTD(\'ptd\', '${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        console.log("Loaded PTD successfully :)")
        globalFiles[file.name] = {'fp': file, 'missingKeys': missingKeys, 'hashTable': hashTable}
        resolve();
      }
    }
    // the max text file size is like 3 MB so I think it's fine to load the whole thing
    reader.readAsArrayBuffer(file)
  })
}

function downloadPTD(fileType, filename) {
  const root = $(`div[id="${filename}"]`)
  const sectionCount = $(root).find('span.sectionCount').attr('count')
  var sections = [];
  for (var i = 0; i < sectionCount; i++) {
    var section = [];
    $(root).find(`table#section-${i}`).find('tr').each(function(index) {
      // sorta redundant but its whatever
      section.push({"hash": $(this).find("th[class='hash']").text(), "key": $(this).find("input").val(), "value": [$(this).find("th[class='value1']").find("textarea").val(), $(this).find("th[class='value2']").find("textarea").val()]})
    })
    sections.push({"hash": globalFiles[filename]['hashTable'][i]['hash'], "items": section})
  }
  var data = JSON.stringify(sections, null, 2)
  var blob = new Blob([data], {type: "application/text"})
  saveAs(blob, filename.replace(".bin", ".json"));
}

function PTDEncode(str) {
  str = str.replace(/\r?\n/g, "\r\n") // account for formatting; game uses \r\n
  var uint8 = new Uint8Array(str.length*2 + 2) // +2 to account for zero padding
  for (var i = 0; i < str.length; i++) {
      uint8[i*2] = str.charCodeAt(i);
      uint8[i*2+1] = str.charCodeAt(i) >> 8;
  }
  uint8 = uint8.map(function(item) {return (item + 0x26) % 256})
  return uint8;
}

function PTDcreateOffsets(arr) {
  var output = new Uint8Array();
  var headers = new Uint8Array();
  var x = arr.length*16
  for (var i = 0; i < arr.length; i++) {
    headers = concatenateToUint8(headers, Uint32Array.from([arr[i]['hash'], x, arr[i]['text'].byteLength/2, arr[i]['text'].byteLength]))
    output = concatenateToUint8(output, arr[i]['text'])
    x += arr[i]['text'].byteLength - 16 // add length of UTF-16 text; subtract new offset
  }
  return [output, headers]
}

function packPTD(fileType, filename) {
  /*
  There are four keys (that have no corresponding values of the same hash) that are always included, yet never used.
  One of the keys is the file name. Below are the constant ones. Their hashes stay consistent.
  I assume they are headers for the sections?
  */
  /*const missingKeys = [
    {"hash": 999008199, "text": PTDEncode("Text")},
    {"hash": 1019393273, "text": PTDEncode("CharName")},
    {"hash": 2013637650, "text": PTDEncode("groupid")}
  ]*/
  $(`div[id="${filename}"]`).find('h4').children('a.repack').replaceWith(`<div class='repack' style="padding: 0; background-color:#C5C5C5;"><span class='material-icons'>auto_fix_high</span> REPACKING...</div>`)
  var keys = [];
  for (var i = 0; i < globalFiles[filename]['missingKeys'].length; i++) {
    keys.push({"hash": globalFiles[filename]['missingKeys'][i]['header'][0], "text": globalFiles[filename]['missingKeys'][i]['text'].map(function(item) {return (item + 0x26) % 256})})
  }
  const root = $(`div[id="${filename}"]`)
  const sectionCount = $(root).find('span.sectionCount').attr('count')
  console.log("Repacking PTD...")
  var sections = [];
  for (var i = 0; i < sectionCount; i++) {
    var section = {"hash": globalFiles[filename]['hashTable'][i]['hash'], "hashes": [], "items": [], "values1": [], "values2": []};
    $(root).find(`table#section-${i}`).find('tr').each(function(index) {
      // sorta redundant but its whatever
      section['items'][index] = {"hash": parseInt($(this).find("th[class='hash']").text(), 16), "key": PTDEncode($(this).find("input").val()), "value": [PTDEncode($(this).find("th[class='value1']").find("textarea").val()), PTDEncode($(this).find("th[class='value2']").find("textarea").val())]}
      // there is one global keylist; but the values differ from section to section
      section['values1'][index] = {"hash": section['items'][index]['hash'], "text": section['items'][index]['value'][0]}
      section['values2'][index] = {"hash": section['items'][index]['hash'], "text": section['items'][index]['value'][1]}
      section['hashes'][index] = section['items'][index]['hash']
      keys.push({"hash": section['items'][index]['hash'], "text": section['items'][index]['key']})
    })
    sections.push(section)
  }
  keys = keys.sort((a,b)=>a['hash']-b['hash']);
  var [keyStrings, keyHeaders] = PTDcreateOffsets(keys)
  /* STRING headers */
  // 0 - hash
  // 1 - entries relative offset (from this position)
  // 2 - count of 2-byte chars
  // 3 - length of actual string
  // header
  var secondTableOffset = keyHeaders.byteLength + keyStrings.byteLength + 28
  var data = Uint32Array.from([4478032, 2, 38, keys.length, 28, sectionCount, secondTableOffset])
  // strings
  data = concatenateToUint8(data, keyHeaders)
  data = concatenateToUint8(data, keyStrings)
  // everything breaks if section 0 has nothing in it but that happens in no file so :)
  for (var i = 0; i < sectionCount; i++) {
    sections[i]['initHeader'] = Uint32Array.from([globalFiles[filename]['hashTable'][i]['dataHeaders'][0], sections[i]['values1'].length, 12]) // only one of these since there is only one key - constant 12 offset
    if (sections[i]['hashes'].length == 0) {
      // blank section; fill everything in
      sections[i]['initHeader'] = new Uint8Array(); // no header
      sections[i]['hashes'] = new Uint8Array();
      sections[i]['strings1'] = new Uint8Array();
      sections[i]['valueStringHeaders1'] = new Uint8Array();
      sections[i]['strings2'] = new Uint8Array();
      sections[i]['valueStringHeaders2'] = new Uint8Array();

      sections[i]['valueStringsHeaders'] = Uint32Array.from([globalFiles[filename]['hashTable'][i]['valueHeaders'][0], 0, 24,
      globalFiles[filename]['hashTable'][i]['valueHeaders'][1], 0, 12])

      sections[i]['totalLength'] = 24;
      continue;
    }
    sections[i]['hashes'] = Uint32Array.from(sections[i]['hashes'])
    
    var returned = PTDcreateOffsets(sections[i]['values1'].sort((a,b)=>a['hash']-b['hash']))
    sections[i]['strings1'] = returned[0]
    sections[i]['valueStringHeaders1'] = returned[1]
    returned = PTDcreateOffsets(sections[i]['values2'].sort((a,b)=>a['hash']-b['hash']))
    sections[i]['strings2'] = returned[0]
    sections[i]['valueStringHeaders2'] = returned[1]
    
    var relativeOffset = 12 + 16*sections[i]['values1'].length + sections[i]['strings1'].byteLength // initial header + first section headers + first section strings
    
    sections[i]['valueStringsHeaders'] = Uint32Array.from([globalFiles[filename]['hashTable'][i]['valueHeaders'][0], sections[i]['values1'].length, 24,
    globalFiles[filename]['hashTable'][i]['valueHeaders'][1], sections[i]['values2'].length, relativeOffset])
    sections[i]['totalLength'] = 12 + sections[i]['hashes'].byteLength + 24 + sections[i]['valueStringHeaders1'].byteLength + sections[i]['strings1'].byteLength + sections[i]['valueStringHeaders2'].byteLength + sections[i]['strings2'].byteLength
  }
  var x = 20*sections.length // existing headers
  var y = 20*sections.length + 12 + 4*sections[0]['values1'].length // existing headers + single header + hashes 
  for (var i = 0; i < sectionCount; i++) {
    var section = sections[i]
    if (section['items'].length == 0) {
      data = concatenateToUint8(data, Uint32Array.from([section['hash'], 0, x, 2, x])) // both are the same
    } else {
      data = concatenateToUint8(data, Uint32Array.from([section['hash'], 1, x, 2, y]))
    }
    x += section['totalLength'] - 20
    if (i+1 == sectionCount) {
      break
    }
    y = x + 12 + sections[i+1]['hashes'].byteLength
  }
  for (var i = 0; i < sectionCount; i++) {
    data = concatenateToUint8(data, sections[i]['initHeader'])
    data = concatenateToUint8(data, sections[i]['hashes'])
    data = concatenateToUint8(data, sections[i]['valueStringsHeaders'])
    data = concatenateToUint8(data, sections[i]['valueStringHeaders1'])
    data = concatenateToUint8(data, sections[i]['strings1'])
    data = concatenateToUint8(data, sections[i]['valueStringHeaders2'])
    data = concatenateToUint8(data, sections[i]['strings2'])
  }
  /* header2 (the header of the data) */
  // 0 - hash
  // 1 - count1 (always 1, except for empty tables, which it is 0)
  // 2 - relative offset 1
  // 3 - count2 (always 2 since there are always 2 values?)
  // 4 - relative offset 2
  console.log("REPACK COMPLETE. :D")
  var blob = new Blob([data], {type: "application/octet-stream"})
  saveAs(blob, filename);
  $(`div[id="${filename}"]`).find('h4').children('.repack').replaceWith(` <a class='repack' title='Repack the file into a game-ready PTD.' onclick="packPTD(\'ptd\', '${filename}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
}