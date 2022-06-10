const prevToken = localStorage.getItem('apiv2_key_override');
if (prevToken === null) returnToPage();

//// definitions ////
const blackOverlay = document.getElementById("blackoverlay");
const whiteOverlay = document.getElementById("whiteoverlay");
const wkofDiv = document.getElementById("wkof_ds");

//// pre data-fetching ////
// dark/light mode
var lightMode = localStorage["mode"] == "light" ? true : false;
changeMode();
// device
var isMobile = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) // normal mobile
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0); // ipad pro

//// other functions ////
// logout out of wk apiv2 account
function returnToPage() {
    window.location.href = 'index.html?origin=' + window.location.pathname.split('/').slice(-1)[0];
}

async function logout() {
    try {
        await wkof.Apiv2.clear_cache();
        await wkof.file_cache.clear();
    } catch (e) {
        deleteDatabase('wkof.file_cache');
    }
    localStorage.removeItem('apiv2_key_override');
    returnToPage();
}

// delete indexeddb database
async function deleteDatabase(dbName) {
    return await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);

        request.onerror = (event) => { // fails to open
            console.error(`IndexedDatabase error: ${event.target.errorCode}`);
            reject(`IndexedDatabase error: ${event.target.errorCode}`);
        };

        request.onsuccess = async (event) => { // deleted successfully
            resolve(event.result);
        };
    });
}

// change between dark and light mode
function changeMode() {
    if (lightMode) {
        lightMode = false;
        let modebtn = document.getElementById('modebtn')
        modebtn.innerHTML = "㊐ Light Mode";
        modebtn.style.color = "black";
        modebtn.style.backgroundColor = "white";
        document.body.classList.add('dark-mode');
        document.documentElement.style.setProperty('color-scheme', 'dark');
        let header = document.getElementsByClassName('header')[0];
        header.style["-webkit-filter"] = "invert(90%)";
        header.style.filter = "invert(90%)";
        let wkofdiv = document.getElementById('wkof_ds');
        wkofdiv.style["-webkit-filter"] = "invert(100%)";
        wkofdiv.style.filter = "invert(100%)";
        document.body.style.background = "black";
        localStorage["mode"] = "light";
    } else {
        lightMode = true;
        let modebtn = document.getElementById('modebtn')
        modebtn.innerHTML = "㊊ Dark Mode";
        modebtn.style.color = "white";
        modebtn.style.backgroundColor = "black";
        document.body.classList.remove('dark-mode');
        document.documentElement.style.setProperty('color-scheme', 'light');
        let header = document.getElementsByClassName('header')[0];
        header.style["-webkit-filter"] = "";
        header.style.filter = "";
        let wkofdiv = document.getElementById('wkof_ds');
        wkofdiv.style["-webkit-filter"] = "";
        wkofdiv.style.filter = "";
        document.body.style.background = "#f1f1f1";
        localStorage["mode"] = "dark";
    }
}

// google chart arrow move functions
function chartSelectionSetter(chart) {
    let selection = chart.getSelection();
    if (selection.length == 0) { currentSelection = []; return; }
    if (currentSelection.length != 0) currentSelection[0].setSelection();
    currentSelection = [chart, { row: selection[0].row, column: null }];
    chart.setSelection([currentSelection[1]]);
}

// fix html
function fixHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.innerHTML;
}