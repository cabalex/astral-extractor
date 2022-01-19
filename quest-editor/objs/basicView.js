const areaSelect = `
<select class="areaSelect" onchange="updateEmAttribute('KEY', this)">
    <option value="100">Zone 36 Central City</option>
    <option value="200">Zone 33 Harmony Square</option>
    <option value="240">Zone 33 Ark Transport</option>
    <option value="300">Zone 09 Sector V</option>
    <option value="310">Zone 09 Hermit Hideout</option>
    <option value="400">Zone 32 Ark Mall</option>
    <option value="500">Ark Sewers</option>
    <option value="600">Aegis Research Institute</option>
    <option value="800">Zone 09 Hal's Hideout</option>
    <option value="840">Zone 30 Maison Forest</option>
    <option value="900">Zone 10 Police HQ</option>
    <option value="910">Highway Junction</option>
    <option value="b01">Astral Plane</option>
    <option value="c00">Max's Safehouse</option>
</select>
`

function loadBasicView(emSet) {
    const obj = basicViews[questLookup(parseInt(emSet.attributes.Id), returnId=true)];

    console.log(obj)
    if (!obj) {
        return '';
    }
    
    var output = '<tr>';
    
    for (const [key, data] of Object.entries(obj)) {
        output += `<tr><th class="tablekey">${data.label}</th><th class="tablevalue">`;

        switch (data.type) {
            case 'areaSelect':
                output += areaSelect.replace('KEY', key);
                break;
            case 'text':
            default:
                output += `<input type="text" onchange="updateEmAttribute('${key}', this, ISHEX)" class="${data.type}" value="${data.isHex ? parseInt(emSet.attributes[key]).toString(16) : emSet.attributes[key]}">`;
                // text
        }
        output.replace(', ISHEX', data.isHex ? 'true' : '');

        output += '</th></tr>';
    }
    return output;
}

const basicViews = {
    'ba0029': {
        'ExSetTypeA': {
            'type': 'text',
            'label': 'Quest to load',
            'isHex': true
        },
        'ExSetTypeB': {
            'type': 'areaSelect',
            'label': 'Area to load',
            'isHex': false
        }
    }
}