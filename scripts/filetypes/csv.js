function loadInitialCSV(fileTypes, file) {
  var reader = new FileReader();
  reader.onloadend = function(e) {
    if (e.target.readyState == FileReader.DONE) {
      var tmpLines = [];
      lines = e.target.result.split(/\r?\n/);
      for (var i = 0; i < lines.length-1; i++) {
        tmpLines[i] = lines[i].split(",")
      }
      globalFiles[file.name] = {'fp': file, 'lines': tmpLines[i]}
      var form = "<div class='scroll'><table>";
      var maxLength = new Array(tmpLines[0].length).fill(1)
      for (var i = 0; i < tmpLines.length; i++) {
        form += `<tr>`
        for (var x = 0; x < tmpLines[i].length; x++) {
          form += `<th><input class="${file.name}-${x}" type="text" value='${tmpLines[i][x]}'></input></th>`
          if (tmpLines[i][x].length > maxLength[x]) {
            maxLength[x] = tmpLines[i][x].length
          }
        }
        form += "</tr>"
      }
      form += "</table></div>"
      $('div[id="' + file.name + '"]').find('h4').append(` - ${tmpLines.length} lines <a class='download' onclick="downloadFile(\'csv\', '${file.name}')"><span class='material-icons'>insert_drive_file</span> DOWNLOAD CSV</a>`)
      $('div[id="' + file.name + '"]').find('h4').prepend(`<a class='minimize' onclick="minimize(this)"><span class="material-icons">expand_less</span></a>`)
      $('div[id="' + file.name + '"]').append("<div id='files'>" + form + "</table></div>")
      for (var i = 0; i < tmpLines.length; i++) {
        $(`input[class="${file.name}-${i}"]`).attr('size', maxLength[i])
      }
      $('input')
      $('div#loading').replaceWith('<div style="padding-left: 10px; line-height: 25px"><h3><span class="material-icons">description</span> CSV File</h5><p><b>CSV files</b> are config files that tell the game certain parameters, like the strength of a chimera\'s attack or the layout of a red case.</p></div>')
    }
  }
  reader.readAsText(file)
}