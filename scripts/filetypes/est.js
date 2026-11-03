var workingESTFiles = {};


function loadInitialEST(fileTypes, file, translateView = false) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onloadend = function (e) {
      if (e.target.readyState == FileReader.DONE) {
        var chunks = [];

        var newArray = new Uint8Array(e.target.result)

        for (let i = 0; i < newArray.length; i++) {
          let character = newArray[i].toString(16).toUpperCase();
          if (character.length == 1) character = "0" + character;
          chunks.push(character);
        }

        let hex_list = chunks;

        let input_str = "";

        /*for (let string_index = 0; string_index < chunks.length; string_index++) {
          if (string_index % 2 == 0) {
            if (input_str.length > 0) {
              hex_list.push(input_str);
              input_str = "";
            }
          }
          input_str += chunks[string_index];
        }
        console.log(hex_list);*/


        var colorData = parseESTHex(hex_list);

        var form = "<div class='scroll'><table>";


        for (let i = 0; i < colorData.length; i++) {
          form += "<tr>";
          form += `<th style="background-color: 'transparent'">`;
          form += `<input class="${file.name}-${i}-rgb" type="text" value='Color ${i}'</input></th>`;

          let rgb = hexToRGB(`${colorData[i]["r"]["hex"][0]}${colorData[i]["g"]["hex"][0]}${colorData[i]["b"]["hex"][0]}`);


          let color = setColor(rgb[0], rgb[1], rgb[2]);

          form += `<th style="background-color: ${color}">`;

          if (color != "transparent") form += `<input class="${file.name}-i" type="color" value='${color}' onChange='updateValsFromColor(this,${i})'></input><br>`;

          form += `<input class="${file.name}-${i}-rgb" type="text" hexpos='${colorData[i]["r"]["pos"]}' value='${rgb[0]}'`;
          form += `onChange='updateColorFromVals(this,1)'>`;
          form += `</input></th>`;

          form += `<th style="background-color: ${color}">`;

          form += `<input class="${file.name}-${i}-rgb" type="text" hexpos='${colorData[i]["g"]["pos"]}' value='${rgb[1]}'`;
          form += `onChange='updateColorFromVals(this,2)'>`;
          form += `</input></th>`;

          form += `<th style="background-color: ${color}">`;

          form += `<input class="${file.name}-${i}-rgb" type="text" hexpos='${colorData[i]["b"]["pos"]}' value='${rgb[2]}'`;
          form += `onChange='updateColorFromVals(this,3)'>`;
          form += `</input></th>`;

          rgb = hexToRGB(`${colorData[i]["r"]["hex"][1]}${colorData[i]["g"]["hex"][1]}${colorData[i]["b"]["hex"][1]}`);


          form += "</tr><tr>";

          form += `<th style="background-color: 'transparent'">`;
          form += `<input class="${file.name}-${i}-intensity" type="text" value='Intensity ${i}'</input></th>`;

          form += `<th style="background-color: 'transparent'">`;


          form += `<input class="${file.name}-${i}-intensity" type="text" hexpos='${colorData[i]["r"]["pos"]}' value='${rgb[1]}'>`;
          form += `</input></th>`;

          form += `<th style="background-color: 'transparent'">`;

          form += `<input class="${file.name}-${i}-intensity" type="text" hexpos='${colorData[i]["g"]["pos"]}' value='${rgb[1]}'>`;
          form += `</input></th>`;

          form += `<th style="background-color: 'transparent'">`;

          form += `<input class="${file.name}-${i}-intensity" type="text" hexpos='${colorData[i]["b"]["pos"]}' value='${rgb[1]}'>`;
          form += `</input></th>`;



        }

        form += "</tr></table></div>";

        workingESTFiles[file.name] = hex_list;


        $('div[id="' + file.name + '"]').find('h4').append(` - ${hex_list.length} lines <a class='download' onclick="downloadCSV(\'csv\', '${file.name}', false)"><span class='material-icons'>insert_drive_file</span> DOWNLOAD CSV</a>`)
        $('div[id="' + file.name + '"]').find('h4').append(` <a class='repack' title='Repack the file into a game-ready EST.' onclick="downloadEST('${file.name}')"><span class='material-icons'>auto_fix_high</span> REPACK</a>`)
        $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
        $('div[id="' + file.name + '"]').find('h4').find('img').after(hamburgers['est'])
        $('div[id="' + file.name + '"]').append("<div id='files' class='scroll'>" + form + "</table></div>")
        globalFiles[file.name] = { 'fp': file, 'translateView': translateView }
        if (translateView) { resolve(); return }
        /*for (var i = 0; i < maxLengthLength; i++) {
          $(`input[class="${file.name}-${i}"]`).attr('size', maxLength[i])
        }*/
        resolve();


      }



    }
    reader.readAsArrayBuffer(file);
  });
}
function parseESTHex(hex_list) {
  let colour_data = [];
  let val = 0;
  while (val + 36 < hex_list.length) {
    if (hex_list[val] == "3F" && hex_list[val + 24] == "3F" && hex_list[val + 28] == "3F" && hex_list[val + 32] == "3F" && hex_list[val + 36] == "3F") {
      let rgba = {};
      rgba["r"] = { "pos": val - 13, "hex": [hex_list[val - 13], hex_list[val - 12]] };
      rgba["g"] = { "pos": val - 9, "hex": [hex_list[val - 9], hex_list[val - 8]] };
      rgba["b"] = { "pos": val - 5, "hex": [hex_list[val - 5], hex_list[val - 4]] };
      rgba["a"] = { "pos": val - 3, "hex": [hex_list[val - 3], hex_list[val - 2], hex_list[val - 1], hex_list[val]] };
      colour_data.push(rgba);
      val += 37;
    }
    else val += 1;
  }
  console.log(colour_data);
  return colour_data;
}

async function downloadEST(fileName) {

  let hex = workingESTFiles["fileName"];

  let baseDiv = document.getElementById(fileName);

  let inputs = baseDiv.getElementsByTagName("input");

  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].type == "text") {
      if (inputs[i].classList[0].includes("rgb")) hex[parseInt(inputs[i].getAttribute("hexpos"))] = colorValToHex(inputs[i].value);
      else hex[parseInt(inputs[i].getAttribute("hexpos"))+1] = colorValToHex(inputs[i].value);
    }
  }


  let binary = parseInt(hex.join(""), 10).toString(2);

  let blob = new Blob([binary], { type: "application/text" });

  saveAs(blob, fileName);
  

}


