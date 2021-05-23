function loadInitialBXM(fileType, file) {
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
        nodeInfo.push(new Uint16Array(e.target.result.slice(offset, offset+8)).map(function (item){return item >> 8}))
        offset += 8;
      }
      const dataOffsetsOffset = offset;
      var dataOffsets = [];
      for (var i = 0; i < dataCount; i++) {
        le_data = new Uint16Array(e.target.result.slice(offset, offset+4))
        dataOffsets.push([le_data[0] >> 8, le_data[1] >> 8])
        // name offset - 0
        // value offset - 1
        offset += 4;
      }
      const enc = new TextDecoder("ascii")
      const uint8 = new Uint8Array(e.target.result)
      function readString(pos) {
        pos = pos + offset;
        var tmppos = pos;
        while (tmppos < uint8.length && uint8[tmppos] != 0) {
          tmppos += 1;
        }
        return enc.decode(e.target.result.slice(pos, tmppos))
      }
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
          console.log(dataOffsets[node[3]+1][1])
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
          for (var i = 0; i < node[0]; i++) {
            outputJSON['children'].push(readTree(nodeNum+i+1))
          }
        }
        return outputJSON;
      }
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
      $('div[id="' + file.name + '"]').append(`<p style="margin-left: 10px;"><span class="xml_body" style="white-space: pre-wrap; font-family: Consolas, sans-serif;">${xmlOutput}</span></p>`)
      globalFiles[file.name] = {'fp': file, 'json': output, 'xml': xmlOutput}
    }
  }
  reader.readAsArrayBuffer(file)
}

function packXML(name) {
  // todo
}

function downloadBXM(fileType, name) {
  output = $(`div[id="${name}"`).find('span.xml_body').text()
  var blob = new Blob([output], {type: "application/text"})
  saveAs(blob, name.replace(".bxm", ".xml"));
}