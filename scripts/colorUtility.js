function hexToRGB(hex) {
    hex = hex.replaceAll("#", "");
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}


function RGBToArray(input) {
    input = (input.replaceAll("rgb", ""));
    input = input.slice(1, -1).replaceAll(" ", "");
    input = input.split(",");
    return input;
}

function arrayToRGB(input) {
    return `rgb(${input})`;
}

function setColor(r, g, b) {
    var color;
    try {
        let rgb = [parseInt(r), parseInt(g), parseInt(b)];
        if (!rgb.includes(NaN)) {
            color = arrayToRGB(rgb);
        } else {
            color = 'transparent';
        }
    } catch {
        color = 'transparent';
    }
    return color;
}


function updateValsFromColor(obj, index) {
    index = parseInt(index);
    var parent = obj.parentElement.parentElement;
    let classBase = obj.classList[0].slice(0, -1);
    for (let i = 0; i < 3; i++) {
        let newObj = parent.children[index + i];
        newObj.style.backgroundColor = obj.value;
        let newIndex = parseInt(index) + i;
        newObj.getElementsByClassName(`${classBase}${newIndex}`)[0].value = RGBToArray(newObj.style.backgroundColor)[i];
    }
}

function updateColorFromVals(obj, index) {
    if (obj.value.length > 0) {
        index = parseInt(index);
        var parent = obj.parentElement.parentElement;
        let classBase = obj.classList[0].slice(0, -1);
        let newObjs = [];
        let rgb = [];
        for (let i = 0; i < 3; i++) {
            newObjs.push(parent.children[index + i]);
            let newIndex = parseInt(index) + i;
            rgb.push(parent.getElementsByClassName(`${classBase}${newIndex}`)[0].value);
        }
        rgb = arrayToRGB(rgb);
        let selector = parent.getElementsByClassName(classBase + "i")[0];
        if (selector != undefined) selector.value = rgb;
        updateBackgroundColor(obj, index, rgb);
    }

}

function updateBackgroundColor(obj, index, color) {
    var parent = obj.parentElement.parentElement;
    index = parseInt(index);
    for (let i = 0; i < 3; i++) {
        parent.children[index + i].style.backgroundColor = color;
    }
}

function colorValToHex(val) {
    var hex = (parseInt(val)).toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function colorToHex(color) {
    if (color.contains("rgb")) color = RGBToArray(color);
    return `#${colorValToHex(color[0])}${colorValToHex(color[1])}${colorValToHex(color[2])}`
}