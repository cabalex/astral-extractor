import { questLookup } from '../../core/LookupTable.js';

// Handles loading of EmSet.bxm files.

// loads an EmSet.bxm file and returns a map of EmSets.
export async function loadBxmAsEmSet(bxm) {
    let bxmJson = await bxm.readBxmAsJson();
    let map = new Map();

    bxmJson['children'][0]['children'].forEach(groupList => {
        map.set(groupList.attributes.number, new EmSet(groupList));
    })
    console.log(map)
    return map;
}

export class EmSet extends Array {
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
    constructor(bxm="New EmSet", rawESN=0) {
        super();
        if (typeof bxm == "string") {
            bxm = {
                name: 'GroupList',
                value: '',
                children: [],
                attributes: {
                    CanSet: "1",
                    number: rawESN.toString(),
                    easy: "",
                    normal: "",
                    hard: "",
                    very_hard: "",
                    name: bxm,
                    GroupNameHash: (Math.random() * 100000000).toString(),
                }};
        }

        this._original = JSON.stringify(bxm);
        // EmSetNo is the canonical position in the EmSet list; rawESN is the raw position
        if (bxm['name'] != 'GroupList') console.warn("Loaded object may not be a valid EmSet...");
        
        Object.assign(this, bxm['attributes']);

        
        for (var i = 0; i < bxm['children'].length; i++) {
            this.push(new Em(bxm['children'][i], this.number, this.position))
        }
    }
    
    // Exports the EmSet back to a BXM-type object.
    export() {
        var output = {"name": "GroupList", "value": "", "children": [], "attributes": {
            CanSet: this.CanSet,
            number: this.number,
            easy: this.easy,
            normal: this.normal,
            hard: this.hard,
            very_hard: this.very_hard,
            name: this.name,
            GroupNameHash: this.GroupNameHash
        }};
        // remove attributes we don't want
        delete output['attributes'].ems;
        delete output['attributes'].EmSetNo;
        delete output['attributes'].position
        delete output['attributes']._original;
        
        for (var i = 0; i < this.length; i++) {
            output['children'].push(this[i].export());
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

export class Em {
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
    constructor(bxm) {
        this._original = JSON.stringify(bxm);
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

    // Gets the Em's position. xyzOnly dictates if it recieves the fourth Trans value.
    getPosition(xyzOnly=true) {
        return this.attributes.Trans.split(" ", xyzOnly ? 3 : 4).map(item => parseFloat(item));
    }
}