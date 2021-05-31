function swap16(val) {
    return ((val & 0xFF) << 8)
           | ((val >> 8) & 0xFF);
}

function swap32(val) {
    return ((val & 0xFF) << 24)
           | ((val & 0xFF00) << 8)
           | ((val >> 8) & 0xFF00)
           | ((val >> 24) & 0xFF);
}

function loadInitialBXM(fileType, file, encoding="SHIFT-JIS", forceEncoding=false) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onloadend = function(e) {
      if (e.target.readyState == FileReader.DONE) {
        // stuff is in BIG ENDIAN; gotta do some jank
        const header = new DataView(e.target.result.slice(0, 16));
        // magic - 0-4 - magic may be BXM\x00 or XML\x00
        // unk (flags?) - 4-8
        const nodeCount = header.getInt16(8);
        const dataCount = header.getInt16(10);
        const dataSize = header.getUint32(12);

        // node info starts at 0x10 (16)
        var nodeInfo = [];
        var offset = 16;
        for (var i = 0; i < nodeCount; i++) {
          nodeInfo.push(new Uint16Array(e.target.result.slice(offset, offset+8)).map(function (item){return swap16(item)}))
          offset += 8;
        }
        const dataOffsetsOffset = offset;
        var dataOffsets = [];
        for (var i = 0; i < dataCount; i++) {
          le_data = new Uint16Array(e.target.result.slice(offset, offset+4))
          dataOffsets.push([swap16(le_data[0]), swap16(le_data[1])])
          // name offset - 0
          // value offset - 1
          offset += 4;
        }
        var enc;
        var encAlt;
        if (encoding == "UTF-8") {
          enc = new TextDecoder("UTF-8")
          encAlt = new TextDecoder("SHIFT-JIS")
        } else {
          enc = new TextDecoder("SHIFT-JIS")
          encAlt = new TextDecoder("UTF-8")
        }
        const uint8 = new Uint8Array(e.target.result)
        function readString(pos) {
          pos = pos + offset;
          var tmppos = pos;
          while (tmppos < uint8.byteLength && uint8[tmppos] != 0) {
            tmppos += 1;
          }
          var decoded = enc.decode(e.target.result.slice(pos, tmppos));
          if (decoded.includes("�") && forceEncoding == false) {
            // quest data is in UTF-8; must support both formats
            decoded = encAlt.decode(e.target.result.slice(pos, tmppos));
            if (encoding == "UTF-8") {
              encoding = "SHIFT-JIS"
            } else {
              encoding = "UTF-8"
            }
          }
          return decoded;
        }
        var overflow = false;
        function readTree(nodeNum) {
          var node = nodeInfo[nodeNum];
          // child count - 0
          // first child index/next sibling list index - 1
          // attribute count - 2
          // data index - offset inside the data offset table - 3
          var name = "";
          var value = "";
          
          if (dataOffsets[node[3]][0] != -1) {
            name = readString(dataOffsets[node[3]][0])
          }
          if (dataOffsets[node[3]][1] != -1) {
            value = readString(dataOffsets[node[3]][1])
          }
          var outputJSON = {"name": name, "value": value, "attributes": {}, "children": []}; // the current node
          // attributes
          if (node[2] > 0) {
            for (var i = 0; i < node[2]; i++) {
              var attrname = "";
              var attrvalue = "";
              if (dataOffsets[node[3]+i+1][0] != -1) {
                attrname = readString(dataOffsets[node[3]+i+1][0])
              }
              if (dataOffsets[node[3]+i+1][1] != -1) {
                attrvalue = readString(dataOffsets[node[3]+i+1][1])
              }
              outputJSON['attributes'][attrname] = attrvalue;
            }
          }
          // children
          if (node[0] > 0) {
            var childNodeNum = node[1];
            for (var i = 0; i < node[0]; i++) {
              outputJSON['children'].push(readTree(childNodeNum+i))
            }
          }
          return outputJSON;
        }
        console.log(`reading tree... ${nodeCount} nodes, ${dataCount} data offsets, ${dataSize} total data size`)
        const output = readTree(0);
        console.log(output) // woo
        function JSONtoXML(js) {
          var out = `&#60;${js['name']}`
          for (var i = 0; i < Object.keys(js['attributes']).length; i++) {
            out += ` ${Object.keys(js['attributes'])[i]}="${Object.values(js['attributes'])[i]}"`
          }
          out += `&#62;${js['value']}`
          for (var i = 0; i < js['children'].length; i++) {
            out += "\n\t" + JSONtoXML(js['children'][i]).replace(/\n/g, "\n\t");
          }
          if (js['children'].length > 0) {
            out += "\n";
          }
          return out + `&#60;/${js['name']}>`;
        }
        const xmlOutput = JSONtoXML(output)
        $('div[id="' + file.name + '"]').find('h4').append(` <a class='download' title='Download the file as a readable XML.' onclick="downloadFile(\'bxm\', '${file.name}')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD XML</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(`<a class='disabled' title='Repack the file into a game-ready BXM.' onclick="packXML('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK (COMING SOON)</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['bxm'].replace(/{encoding}/g, encoding))
        $('div[id="' + file.name + '"]').append(`<div class="scroll" style="margin-left: 10px;"><span class="xml_body" style="white-space: pre-wrap; tab-size: 4; font-family: Consolas, sans-serif;">${xmlOutput}</span></div>`)
        globalFiles[file.name] = {'fp': file, 'json': output, 'xml': xmlOutput, 'encoding': encoding}
        resolve();
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function changeEncodingBXM(oldEncoding, elem) {
  var encoding = "SHIFT-JIS";
  if (oldEncoding == "SHIFT-JIS") {
    encoding = "UTF-8"
  }
  const filename = $(elem).parents('h4').attr('title')
  const file = globalFiles[filename]['fp']
  delete globalFiles[filename]
  $(elem).parents('h4').replaceWith(`<h4 title="${filename}"><img style="cursor: pointer;" onclick="deleteItem(this)" onmouseover="onHover(this)" onmouseout="offHover(this)" src="assets/legatus.png" height="30px"> ${filename}</h4>`)
  $('div[id="' + filename + '"]').find("div.scroll").remove()
  loadInitialBXM('bxm', file, encoding, true)
}

function packBXM(name) {
  // todo
}

function downloadBXM(fileType, name) {
  output = $(`div[id="${name}"`).find('span.xml_body').text()
  var blob = new Blob([output], {type: "application/text"})
  saveAs(blob, name.replace(".bxm", ".xml"));
}