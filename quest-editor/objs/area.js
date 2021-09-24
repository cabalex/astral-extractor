// A group of areas.
class AreaGroup {
    /*
    this.original - The original areaGroup object as a string.
    this.areas - The list of areas.
    -------------- Attributes -----
    this.GroupIndex
    this.GroupName
    this.GroupDebugDisp
    */
    constructor(bxm, rawESN) {
        this._original = JSON.stringify(bxm);
        // EmSetNo is the canonical position in the EmSet list; rawESN is the raw position
        this.position = rawESN;
        if (bxm['name'] != 'GroupList') console.warn("Loaded object may not be a valid EmSet...");
        
        Object.assign(this, bxm['attributes']);

        this.areas = [];
        for (var i = 0; i < bxm['children'].length; i++) {
            this.areas.push(new Area(bxm['children'][i], this.GroupIndex, this.position))
        }
    }
    
    // Exports the EmSet back to a BXM-type object.
    export() {
        var output = {"name": "GroupList", "value": "", "children": [], "attributes": {...this}};
        // remove attributes we don't want
        delete output['attributes'].areas;
        delete output['attributes'].position;
        delete output['attributes']._original;
        
        for (var i = 0; i < this.areas.length; i++) {
            output['children'].push(this.areas[i].export());
        }
        return output;
    }

    // Display the EmList in the sidebar.
    display() {
        var output = `<span id="areagroup-${this.position}"><li class="listheader" translate="yes"><span onclick='addAreaObj(this, ${this.AreaGroupNo})' title="Add an item" translate="no" class="material-icons btn">add</span> ${this.GroupName} <span class="li-rightnav" title="Toggle if debug display is enabled" translate="no"><span class="material-icons">${parseInt(this.GroupDebugDisp) ? "visibility" : "visibility_off"}</span></span></li>`;
        for (let i = 0; i < this.areas.length; i++) {
            output += this.areas[i].display(i);
        }
        return output + "</span>";
    }

    addArea(areaObj) {
        areaObj.AreaGroupNo = this.GroupIndex;
        this.areas.push(areaObj);
        $(`#areagroup-${this.position}`).append(areaObj.display(this.areas.length - 1));
    }

    removeArea(index) {
        var [removedArea] = this.areas.splice(index, 1);
        // manually remove pin :/
        $(`#area-${this.position}-${removedArea.SetNo}`).remove();
        $(`#areagroup-${this.position}`).replaceWith(this.display());
        return removedArea;
    }
}

class Area {
    /*
    AreaIndex
    AreaType
    Center
    Pos1
    Pos2
    Pos3
    Pos4
    Height
    DebugDisp
    */
    constructor(bxm, AreaGroupNo, position=-1) {
        if (position == -1) {
            // find the position manually
            position = getIndexByAreaGroupNo(AreaGroupNo);
        }
        this._original = JSON.stringify(bxm);
        this.AreaGroupNo = AreaGroupNo;
        this.position = position;
        if (bxm['name'] != 'WorkList') console.warn("Loaded object may not be a valid Area...");
        this.attributes = {};
        for (var i = 0; i < bxm['children'].length; i++) {
            this['attributes'][bxm['children'][i]['name']] = bxm['children'][i]['value'];
        }
        this.references = {};
        this.SetNo = this.attributes.SetNo;
    }

    export() {
        const output = {"name": "WorkList", "value": "", "children": [], "attributes": {}};
        for (const [key, value] of Object.entries(this.attributes)) {
            output['children'].push({"name": key, "value": value, "children": [], "attributes": {}})
        }
        return output;
    }

    display(SetNo) {
        let name = questLookup(parseInt(this.attributes.Id).toString(16));
        this.addPinToMap(SetNo);
        return `<li class="clickableLi" oncontextmenu="showContextMenu(event, 'area', [this]); return false" onclick="showContextMenu(event, 'area', [this])" style="filter: hue-rotate(${this.AreaGroupNo*45}deg); color: #F25086" id="area-${this.position}-${this.SetNo}">${this.AreaGroupNo} <b>${(parseInt(this.attributes.AreaType) == 1) ? "Zone-defined" : "Point-defined"} Area</b></li>`;
    }

    addPinToMap(SetNo) {
        // Don't want to remove the li
        $(`svg#area-${this.position}-${SetNo}`).remove();
        $(`div#area-${this.position}-${SetNo}`).remove();
        this.SetNo = SetNo;
        this.attributes.AreaIndex = this.SetNo;
        if (parseInt(this.attributes.AreaType) == 1) {
            const zoom = parseFloat(getComputedStyle(document.body).getPropertyValue('--mapZoom'))
            const convertPos = (item, index) => {
                item = parseFloat(item);
                if (index == 2) {
                    item *= -4 * zoom;
                } else {
                    item *= 4 * zoom;
                }
                return item;
            }
            const posList = [
                this.attributes.Pos1.split(" ").map(convertPos),
                this.attributes.Pos2.split(" ").map(convertPos),
                this.attributes.Pos3.split(" ").map(convertPos),
                this.attributes.Pos4.split(" ").map(convertPos)
            ]
            const posCenter = this.attributes.Center.split(" ").map(item => parseFloat(item));
            // X Z Y UNK - min, max
            const minMax = [
                [Math.min(posList[0][0], posList[1][0], posList[2][0], posList[3][0]), Math.max(posList[0][0], posList[1][0], posList[2][0], posList[3][0])],
                [Math.min(posList[0][1], posList[1][1], posList[2][1], posList[3][1]), Math.max(posList[0][1], posList[1][1], posList[2][1], posList[3][1])],
                [Math.min(posList[0][2], posList[1][2], posList[2][2], posList[3][2]), Math.max(posList[0][2], posList[1][2], posList[2][2], posList[3][2])],
                [Math.min(posList[0][3], posList[1][3], posList[2][3], posList[3][3]), Math.max(posList[0][3], posList[1][3], posList[2][3], posList[3][3])]
            ];
    
            // does not need to change transform with shape as it is redrawn every time
            var svg = `<svg class="marker" id="area-${this.position}-${SetNo}" style="filter: opacity(0.25) hue-rotate(${this.AreaGroupNo*45}deg); width: ${minMax[2][1] - minMax[2][0]}px; height: ${minMax[0][1] - minMax[0][0]}px; transform: translateX(${minMax[2][0] + "px"}) translateY(${minMax[0][0] + "px"})" version="1.1" xmlns="http://www.w3.org/2000/svg">`
            var polygonPosList = []
            posList.forEach((pos) => {
                polygonPosList.push(`${pos[2] - minMax[2][0]}, ${pos[0] - minMax[0][0]}`)
            })
            svg += `<polygon fill="red" oncontextmenu="showContextMenu(event, 'area', [$(this).parent()[0]]); return false" onclick="showContextMenu(event, 'area', [$(this).parent()[0]])" points="${polygonPosList.join(" ")}"></svg>`
            $('#map').append(svg)
            $('#map').append(`<div class="marker" id="areacenter-${this.position}-${SetNo}" style="z-index: 0; filter: hue-rotate(${this.AreaGroupNo*45}deg); transform: translateX(calc(${posCenter[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${posCenter[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/neuron.png" height="30px"></div>`)
        } else if (parseInt(this.attributes.AreaType) == 2) {
            const posCenter = this.attributes.Center.split(" ").map(item => parseFloat(item));
            $('#map').append(`<div class="marker" id="areacenter-${this.position}-${SetNo}" style="z-index: 0; filter: hue-rotate(${this.AreaGroupNo*45}deg); transform: translateX(calc(${posCenter[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${posCenter[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/neuron.png" height="30px"></div>`)
        } else {
            console.warn(`Unknown area type ${this.attributes.AreaType} detected`)
        }
    }
}