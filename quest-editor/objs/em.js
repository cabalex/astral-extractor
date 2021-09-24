// A set of Ems, used in every case.
class EmSet {
    /*
    this.original - The original emSet object as a string.
    this.ems - The list of ems.
    -------------- Attributes -----
    this.name
    this.number
    
    this.CanSet
    this.GroupNameHash
    this.easy
    this.normal
    this.hard
    this.very_hard
    */
    constructor(bxm, rawESN) {
        this._original = JSON.stringify(bxm);
        // EmSetNo is the canonical position in the EmSet list; rawESN is the raw position
        this.position = rawESN;
        if (bxm['name'] != 'GroupList') console.warn("Loaded object may not be a valid EmSet...");
        
        Object.assign(this, bxm['attributes']);
        
        // Reference
        this.EmSetNo = this.number;

        this.ems = [];
        for (var i = 0; i < bxm['children'].length; i++) {
            this.ems.push(new Em(bxm['children'][i], this.number, this.position))
        }
    }
    
    // Exports the EmSet back to a BXM-type object.
    export() {
        var output = {"name": "GroupList", "value": "", "children": [], "attributes": {...this}};
        // remove attributes we don't want
        delete output['attributes'].ems;
        delete output['attributes'].EmSetNo;
        delete output['attributes'].position
        delete output['attributes']._original;
        
        for (var i = 0; i < this.ems.length; i++) {
            output['children'].push(this.ems[i].export());
        }
        return output;
    }

    clipboardCopy(type) {
        if (type == "csv") {
            return `${this.number},${this.name},` + this.ems.map(elem => questLookup(parseInt(elem.attributes.Id).toString(16))).join(",")
        } else {
            return {"EmSetNo": parseInt(this.number), "name": this.name, "Ems": this.ems.map(elem => questLookup(parseInt(elem.attributes.Id).toString(16)))};
        }
    }

    // Display the EmList in the sidebar.
    display() {
        var output = `<span id="emSet-${this.position}"><li class="listheader" translate="yes"><span onclick='addEmObj(this, ${this.EmSetNo})' title="Add an item" translate="no" class="material-icons btn">add</span> ${this.name}</li>`;
        for (let i = 0; i < this.ems.length; i++) {
            output += this.ems[i].display(i);
        }
        return output + "</span>";
    }

    addEm(emObj) {
        this.ems.push(emObj);
        $(`#emSet-${this.number}`).append(emObj.display(this.ems.length - 1));
    }

    removeEm(index) {
        var [removedEm] = this.ems.splice(index, 1);
        // manually remove pin :/
        $(`div#set-${this.position}-${removedEm.SetNo}`).remove();
        $(`#emSet-${this.number}`).replaceWith(this.display());
        return removedEm;
    }
}

class Em {
    /*
    SetNo
    Id
    Id
    BaseRot
    BaseRotL
    Trans
    TransL
    Rotation
    SetType
    Type
    SetRtn
    SetFlag
    PathNo
    EscapeNo
    TmpPos
    ExSetTypeA
    ExSetTypeB
    ExSetTypeC
    ExSetTypeD
    ExSetAttr
    ExSetRtn
    ExSetFlag
    NoticeNo
    SetWait
    LvMin
    LvMax
    ParentId
    PartsNo
    HashNo
    ItemId
    SetTimer
    SetCounter
    SetRadius
    GroupPos
    GridDisp
    EventSuspend
    SimpleSubspaceSuspend
    */
    constructor(bxm, EmSetNo, position=-1) {
        if (position == -1) {
            // find the position manually
            position = getIndexByEmSetNo(EmSetNo);
        }
        this._original = JSON.stringify(bxm);
        this.EmSetNo = EmSetNo;
        this.position = position;
        if (bxm['name'] != 'SetInfo') console.warn("Loaded object may not be a valid Em...");
        this.attributes = {};
        for (var i = 0; i < bxm['children'].length; i++) {
            if (bxm['children'][i]['name'] == "Id" && this.attributes.Id != undefined) {
                this['attributes']["Id2"] = bxm['children'][i]['value'];
            } else {
                this['attributes'][bxm['children'][i]['name']] = bxm['children'][i]['value'];
            }
        }
        this.references = {};
        this.SetNo = this.attributes.SetNo;
    }

    export() {
        const output = {"name": "SetInfo", "value": "", "children": [], "attributes": {}};
        for (const [key, value] of Object.entries(this.attributes)) {
            if (key == 'Id2') {
                output['children'].push({"name": "Id", "value": value, "children": [], "attributes": {}});
            } else {
                output['children'].push({"name": key, "value": value, "children": [], "attributes": {}})
            }
        }
        return output;
    }

    display(SetNo) {
        let name = questLookup(parseInt(this.attributes.Id).toString(16));
        this.addPinToMap(SetNo);
        return `<li id="set-${this.position}-${SetNo}" class="clickableLi" oncontextmenu="showContextMenu(event, 'em', [this]); return false" onclick="showContextMenu(event, 'em', [this])" style="filter: hue-rotate(${this.EmSetNo*45}deg); color: #F25086">${this.EmSetNo} <b>${name}</b></li>`
    }

    addPinToMap(SetNo) {
        $(`div#set-${this.position}-${SetNo}`).remove();
        this.SetNo = SetNo;
        this.attributes.SetNo = this.SetNo;
        const id = parseInt(this.attributes.Id).toString(16);
        const pos = this.attributes.Trans.split(" ").map(item => parseFloat(item));
        const pos2 = this.attributes.TransL.split(" ").map(item => parseFloat(item));
        if (id.startsWith("2") || id.startsWith("1")) {
            $('#map').append(`<div class="marker" id="set-${this.position}-${SetNo}" oncontextmenu="showContextMenu(event, 'em', [this]); return false" onclick="showContextMenu(event, 'em', [this])" style="filter: hue-rotate(${this.EmSetNo*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom))) rotate(${this.attributes.Rotation}rad)"><img src="../assets/marker-3.png" height="30px"></div>`)
            if (pos[0] != pos2[0] || pos[1] != pos2[1] && pos[2] != pos2[2]) {
                $('#map').append(`<div class="marker" id="set-${this.position}-${SetNo}" oncontextmenu="showContextMenu(event, 'em', [this]); return false" onclick="showContextMenu(event, 'em', [this])" style="filter: hue-rotate(${this.EmSetNo*45}deg); transform: translateX(calc(${pos2[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos2[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-2b.png" height="30px"></div>`)
            }
        } else if (true||id.startsWith("ba")) {
            $('#map').append(`<div class="marker" id="set-${this.position}-${SetNo}" oncontextmenu="showContextMenu(event, 'em', [this]); return false" onclick="showContextMenu(event, 'em', [this])" style="filter: hue-rotate(${this.EmSetNo*45}deg); transform: translateX(calc(${pos[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos[0] * 4 + "px"} * var(--mapZoom))) rotate(${this.attributes.Rotation}rad)"><img src="../assets/marker-1b.png" height="30px"></div>`)
            // No-Entry Wall visualization
            if ((parseInt(id, 16) > 827391 && parseInt(id, 16) < 827396) || (parseInt(id, 16) > 827439 && parseInt(id, 16) < 827445)) {
                $(`div#set-${this.position}-${SetNo}`).css('--markerHeight', this.attributes.Type*4 + 'px')
            }
            if (pos[0] != pos2[0] || pos[1] != pos2[1] && pos[2] != pos2[2]) {
                $('#map').append(`<div class="marker" id="set-${this.position}-${SetNo}" oncontextmenu="showContextMenu(event, 'em', [this]); return false" onclick="showContextMenu(event, 'em', [this])" style="filter: hue-rotate(${this.EmSetNo*45}deg); transform: translateX(calc(${pos2[2] * -4 + "px"} * var(--mapZoom))) translateY(calc(${pos2[0] * 4 + "px"} * var(--mapZoom)))"><img src="../assets/marker-2b.png" height="30px"></div>`)
            }
        }
    }
}