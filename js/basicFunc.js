// check if api token is cached
const prevToken = localStorage.getItem('apiv2_key_override');
if (prevToken === null) returnToPage();
var username = checkApiToken(prevToken);

// show user name in link row
async function setUserName() {
    document.getElementById('usernamespan').innerHTML = "Logged In: <b>" + (await username) + "</b>";
}
setUserName();

//// definitions ////
const blackOverlay = document.getElementById("blackoverlay");
const whiteOverlay = document.getElementById("whiteoverlay");
const wkofDiv = document.getElementById("wkof_ds");

let offsetHours = 0;

//// pre data-fetching ////
loadTimeOffset();
// Color scheme list and init functions
const colorSchemes = {
    "light": {
        "background": "#f1f1f1",
        "cardColor": "#ffffff",
        "navColor": "#fac5c7",
        "darkScheme": false,
        "name": "Light ㊐"
    },
    "breezeDark": {
        "background": "#31363b",
        "cardColor": "#232629",
        "navColor": "#1f4948",
        "darkScheme": true,
        "name": "Breeze Dark ㊰"
    },
    "black": {
        "background": "#000000",
        "cardColor": "#1b1b1b",
        "navColor": "#1d3938",
        "darkScheme": true,
        "name": "Black ㊊"
    }
};
var currentScheme = "";
changeMode([], (localStorage["colorScheme"] == undefined || Object.keys(colorSchemes).indexOf(localStorage["colorScheme"]) == -1) ? "light" : localStorage["colorScheme"]);
loadColourSchemes();
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

// simple formatting functions
function dateLongFormat(date) {
    return date.toDateString().split(' ').slice(1).join(' ');
}

function loadTimeOffset() {
    offsetHours = parseInt(localStorage.getItem('timeOffset'));
    if (isNaN(offsetHours)) offsetHours = 0;
    timeOffsetElement = document.getElementById("time-offset-select")
    if (timeOffsetElement) timeOffsetElement.selectedIndex = offsetHours;
}

function setTimeOffset(offset) {
    offsetHours = offset;
    localStorage["timeOffset"] = offsetHours;
    fetchData();
}

function dateNoTime(date) {
    // subtract hours from date and return without time (for example with 2h offset
    // 01:30am on the 21st would become 11:30pm on the 20th -> classed as the 20th)
    date.setHours(date.getHours() - offsetHours);
    return new Date(date.toDateString());
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

// load color schemes into dropdown list
function loadColourSchemes() {
    let schemeSelectDropdown = document.getElementById("color-scheme-select");

    Object.keys(colorSchemes).forEach((key, index) => {
        let opt = document.createElement("option");
        opt.value = key;
        opt.innerHTML = colorSchemes[key].name;
        schemeSelectDropdown.appendChild(opt);
        if (currentScheme == key) schemeSelectDropdown.selectedIndex = index;
    });
}

// switch color scheme
function changeMode(apexChartList, newScheme) {
    if (newScheme != currentScheme) {
        let header = document.getElementsByClassName('header')[0];
        let wkofdiv = document.getElementById('wkof_ds');
        if (colorSchemes[newScheme].darkScheme) {
            document.body.classList.add('dark-mode');
            header.style["-webkit-filter"] = "invert(90%)";
            header.style.filter = "invert(90%)";
            wkofdiv.style["-webkit-filter"] = "invert(100%)";
            wkofdiv.style.filter = "invert(100%)";
        } else {
            document.body.classList.remove('dark-mode');
            header.style["-webkit-filter"] = "";
            header.style.filter = "";
            wkofdiv.style["-webkit-filter"] = "";
            wkofdiv.style.filter = "";
        }

        document.documentElement.style.setProperty('color-scheme', colorSchemes[newScheme].darkScheme ? 'dark' : 'light');
        if (apexChartList !== undefined) for (let chart of apexChartList) chart.updateOptions({ theme: { mode: colorSchemes[newScheme].darkScheme ? 'dark' : 'light' }, chart: { background: colorSchemes[newScheme].cardColor } });
        document.body.style.setProperty("--card-color", colorSchemes[newScheme].cardColor);
        document.body.style.setProperty("--background", colorSchemes[newScheme].background);
        document.body.style.setProperty("--nav-color", colorSchemes[newScheme].navColor);

        localStorage["colorScheme"] = newScheme;
        currentScheme = newScheme;
    }
}

// return bool for is current scheme a dark scheme
function isDarkMode() {
    return colorSchemes[currentScheme].darkScheme;
}

// google chart arrow move function
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

// check api token (if invalid -> logout)
async function checkApiToken(apiToken) {
    let requestHeaders = new Headers({ 'Wanikani-Revision': '20170710', Authorization: 'Bearer ' + apiToken }), promise;
    try {
        promise = fetch(new Request("https://api.wanikani.com/v2/user", { method: 'GET', headers: requestHeaders }))
            .then(response => response.json());
    } catch (e) {
        console.log(e);
        document.getElementById('loadingdiv').innerHTML = 'API check error. Letting you through...';
    }
    let data = await promise;
    if (data['code'] !== undefined && data['code'] !== 429) {
        logout();
        return null;
    }
    return data.data.username;
}