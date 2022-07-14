// load packages
google.charts.load('current', { 'packages': ['corechart', 'bar', 'table'] });

// API vars
var apiToken;
var requestHeaders;
var db;

//// pre data-fetching ////
// date one year ago
let yearAgoDate = new Date();
yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
yearAgoDate = yearAgoDate.toLocaleDateString("sv");
// settings
var defaultSettings = {
    showmedian: ['checked', true], // level chart
    levelclamp: ['checked', false],
    levelcomb: ['checked', false],
    levelresets: ['checked', false],
    pastLevels: ['checked', true], // projections
    showBurn: ['checked', true],
    showCheck: ['checked', true],
    hypothetical: ['checked', false],
    speed: ['value', 240],
    'speed-current': ['value', 240],
    'speed-590400': ['value', 240],
    'speed-295200': ['value', 240],
    projectionsspeed: ['checked', false], // simple projections
    startdate: ['value', yearAgoDate], // time settings
    nullify: ['checked', false],
    smoothreview: ['value', 0], // review
    smoothacc: ['value', 10], // accuracy
    tablemonth: ['value', 1], // info table
    tableday: ['value', 0],
    timelimit: ['selectedIndex', 1], // time info
    timestagetypeswitch: ['checked', false],
    avgtime: ['value', 3],
    timeonlytotal: ['checked', false],
};
var settings = localStorage["settings"] === undefined || localStorage["settings"] == '[object Object]' ? undefined : JSON.parse(localStorage["settings"]);
// card order
var leftCards = [].slice.call(document.getElementsByClassName('leftcolumn')[0].children);
var rightCards = [].slice.call(document.getElementsByClassName('rightcolumn')[0].children[0].children);
setCardOrder();

// elements
const maindivs = document.getElementsByClassName("allinfo");
const newdatediv = document.getElementById("newdatediv");
const newdateinp = document.getElementById("startdate");
const newdatebtn = document.getElementById("newdatebtn");
const newdateche = document.getElementById("nullify");
const smoothInp = document.getElementById("smoothreview");
const smoothAccInp = document.getElementById("smoothacc");
const detailWindow = document.getElementById('detailwindow');
const reviewProgress = document.getElementById("reviewprogress");
const reviewAll = document.getElementsByClassName("reviewall");
const wordAll = document.getElementsByClassName("wordall");
const reviewPg = document.getElementById("reviewpg");
const levelResetsBox = document.getElementById("levelresets");
const levelClampBox = document.getElementById("levelclamp");
const levelCombBox = document.getElementById("levelcomb");
const levelMedianBox = document.getElementById("showmedian");
const projSpeedBox = document.getElementById("projectionsspeed");

// global vars
var timeChart, timeTotalChart;
var unalteredItemData = {};
var srsData = [];
var userData = [];
var reviewData = [];
var reviewArray = [];
var reviewAccTotal = [];
var totalArray = [];
var averageArray = [];
var srsArray = [];
var levelData = [];
var levelLengths = [];
var wordData = [];
var resetData = [];
var resets = [];
var subjectData = [];
var assignmentData = [];
var reviewAccuracy = [];
var resurrectedItems = [];
var itemArray = [];
var wordProgressData = [];
var hiddenItems = [];
var midreviewAccuracy = [];
var readingAccuracy = [];
var meaningAccuracy = [];
var levelChart = [];
var pureLevelChart = [];
var combLevelChart = [];
var combPureLevelChart = [];
var levelDates = [];
var kanjiWall = "";
var possibleYojijukugo = [];
var projectionsData = [];
var timeData = [];
var timeTotalData = [];
var tableOffset = 0;
var currentPage = 1;
var shortLevels = [43, 44, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 1, 2];
var levelStages = ['快', '苦', '死', '地獄', '天国', '現実']; 
var totalAverages = [];
var detailWindowOpen = false;
var snapshotDate, snapshotData, currentSnapshot;
var currentSelection = [];

// event listener
newdateche.addEventListener('change', () => { updateReviewCharts(); updateReviewAccuracy(); });
levelResetsBox.addEventListener('change', () => { updateLevelChart(); });
levelClampBox.addEventListener('change', () => { updateLevelChart(); });
levelCombBox.addEventListener('change', () => { updateLevelChart(); });
levelMedianBox.addEventListener('change', () => { updateLevelChart(); });
projSpeedBox.addEventListener('change', () => { updateSimpleProjections(); });
document.onkeydown = function (evt) { // esc button closes detail window
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) isEscape = (evt.key === "Escape" || evt.key === "Esc");
    else isEscape = (evt.keyCode === 27);
    if (isEscape) closeDetailWindow();
    if (evt.key == "ArrowLeft" || evt.key == "a") chartSelectionMover(-1);//moveSnapshot(-1);
    if (evt.key == "ArrowRight" || evt.key == "d") chartSelectionMover(1);//moveSnapshot(1);
};

// before refresh or close (caching)
window.onbeforeunload = cacheData;
window.onunload = cacheData;
window.addEventListener('pagehide', cacheData);

function cacheData() {
    localStorage["scrollposition"] = document.documentElement.scrollTop || document.body.scrollTop;
    saveSettings();
    saveCardOrder();
}

// main code

function chartSelectionMover(direction) {
    if (currentSelection.length == 0) return;
    currentSelection[1].row += direction;
    try { currentSelection[0].setSelection([currentSelection[1]]); }
    catch (e) { currentSelection[1].row -= direction; currentSelection[0].setSelection([currentSelection[1]]); }
}

function openDetailWindow(htmlInput) {
    detailWindowOpen = true;
    document.body.style.overflow = 'hidden';
    detailWindow.children[1].innerHTML = htmlInput;
    detailWindow.style.visibility = 'visible';
    blackOverlay.style.visibility = 'visible';
}

function closeDetailWindow() {
    if (!detailWindowOpen) return;
    detailWindowOpen = false;
    document.body.style.overflow = '';
    detailWindow.style.visibility = 'hidden';
    blackOverlay.style.visibility = 'hidden';
    detailWindow.children[1].innerHTML = "";
}

function setCardOrder() {
    var cardOrder = localStorage['cardorder'];
    if (cardOrder === undefined) return;
    cardOrder = JSON.parse(cardOrder); // '[["0","1","2","3","4","5","6","7","8","9"],["1","3","0","4","2"]]'
    var leftCardOrder = cardOrder[0],
        rightCardOrder = cardOrder[1];
    // add new cards
    for (let i = leftCardOrder.length; i < leftCards.length; i++) leftCardOrder.push(String(i));
    for (let i = rightCardOrder.length; i < rightCards.length; i++) rightCardOrder.push(String(i));
    // subtract removed cards
    for (let i = leftCardOrder.length; i > leftCards.length; i--) leftCardOrder.splice(leftCardOrder.indexOf(String(i)), 1);
    for (let i = rightCardOrder.length; i > rightCards.length; i--) rightCardOrder.splice(rightCardOrder.indexOf(String(i)), 1);
    // reorganize cards
    for (let i = 0; i < leftCards.length; i++) leftCards[i].style.order = leftCardOrder[i];
    for (let i = 0; i < rightCards.length; i++) rightCards[i].style.order = rightCardOrder[i];
}

function moveCard(card, direction, moveBool = true) {
    let orderPrev = card.style.order;
    let changeCard = Array.from(card.parentNode.children).find(e => parseInt(e.style.order) === parseInt(orderPrev) + direction);
    if (changeCard === undefined) return;
    let orderNew = changeCard.style.order;
    // change pos
    card.style.order = orderNew,
        changeCard.style.order = orderPrev;
    // scroll
    if (moveBool) { window.location.hash = ''; window.location.hash = '#' + card.getElementsByTagName('a')[0].id; }
    saveCardOrder() // save card order
}

function saveCardOrder() {
    localStorage["cardorder"] = JSON.stringify([[].slice.call(leftCards[0].parentNode.children).map(element => element.style.order), [].slice.call(rightCards[0].parentNode.children).map(element => element.style.order)]);
}

function setSettings() {
    if (typeof settings !== "object" || settings === null) settings = defaultSettings;
    for (var key of Object.keys(defaultSettings)) {
        let value;
        if (settings.hasOwnProperty(key)) {
            value = settings[key];
            if (value[0] !== defaultSettings[key][0]) { console.log('false'); delete settings[key]; value = defaultSettings[key]; }
        } else value = defaultSettings[key];
        let element = document.getElementById(key);
        if (element) element[value[0]] = value[1];
        else console.log("Setting not found: ", key, settings[key]);
    }
    saveSettings();
}

function saveSettings() {
    for (var key of Object.keys(defaultSettings)) {
        let element = document.getElementById(key);
        let value = element[defaultSettings[key][0]];
        value = value === -1 ? settings[key][1] : value;
        if (element) settings[key] = [defaultSettings[key][0], value];
        else console.log("Element for setting not found: ", key);
    }
    localStorage["settings"] = JSON.stringify(settings);
}

async function fetchData() {
    assignmentData = []; resurrectedItems = []; userData = []; reviewData = []; reviewArray = []; totalArray = []; averageArray = []; srsArray = []; levelData = []; wordData = []; resetData = []; resets = []; subjectData = []; reviewAccuracy = [];
    for (const maindiv of maindivs) maindiv.style.display = "none";
    blackOverlay.style.visibility = "visible";
    whiteOverlay.style.visibility = "visible";

    let modules = 'Settings, Progress, ItemData, Apiv2';
    wkof.include(modules);
    await wkof.ready(modules).then(dataPasser);

    repairSubjectArray();
    createResetArray();
    repairLevelArray();
    reviewData.sort((a, b) => new Date(a.data.created_at) - new Date(b.data.created_at));
    for (let i = 0; i < assignmentData.length; i++) if (assignmentData[i]["data"]["resurrected_at"] != null) resurrectedItems.push([assignmentData[i]["data"]["resurrected_at"], assignmentData[i]["data"]["subject_id"]]);
    for (let i = 0; i < subjectData.length; i++) if (subjectData[i]["object"] != "placeholder" && subjectData[i]["data"]["hidden_at"] != null) hiddenItems.push([subjectData[i]["data"]["hidden_at"], subjectData[i]["id"], subjectData[i]]);
    resurrectedItems.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    hiddenItems.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    await reviewInfo();
    setSettings(); // set all settings to previous value
    blackOverlay.style.visibility = "hidden";
    whiteOverlay.style.visibility = "hidden";
    for (const maindiv of maindivs) if (maindiv.classList.contains('leftcolumn') || maindiv.parentNode.classList.contains('rightcolumn')) maindiv.style.display = "flex"; else maindiv.style.display = "block";
    loadGraphs().then(() => { if (localStorage["scrollposition"]) document.documentElement.scrollTop = document.body.scrollTop = localStorage["scrollposition"] });
}

async function dataPasser() {
    wkofDiv.style.display = 'block';
    var progress = {
        name: 'total',
        label: 'Progress',
        value: 0,
        max: 6
    };
    wkof.Progress.update(progress);
    await Promise.all([wkof.ItemData.get_items('assignments, subjects, review_statistics').then(data => { progress['value']++; wkof.Progress.update(progress); itemDataHandler(data); }),
    wkof.Apiv2.get_endpoint('user').then(data => { progress['value']++; wkof.Progress.update(progress); userData = data; }),
    wkof.Apiv2.get_endpoint('resets').then(data => { progress['value']++; wkof.Progress.update(progress); resetData = Object.values(data); }),
    wkof.Apiv2.get_endpoint('level_progressions').then(data => { progress['value']++; wkof.Progress.update(progress); levelData = Object.values(data); }),
    wkof.Apiv2.get_endpoint('spaced_repetition_systems').then(data => { progress['value']++; wkof.Progress.update(progress); srsData = data; }),
    wkof.Apiv2.get_endpoint('reviews').then(data => { progress['value']++; wkof.Progress.update(progress); reviewData = Object.values(data); })]);
    wkofDiv.style.display = 'none';
}

function itemDataHandler(items) {
    unalteredItemData = items.filter(item => !item.data.hidden_at);
    for (let i = 0; i < items.length; i++) {
        currentItem = Object.assign({}, items[i]);
        if (currentItem['assignments'] != undefined) { assignmentData.push({ 'data': currentItem['assignments'] }); delete currentItem['assignments']; }
        if (currentItem['review_statistics'] != undefined) { wordData.push({ 'data': currentItem['review_statistics'] }); delete currentItem['review_statistics']; }
        subjectData.push(currentItem);
    }
}

function createResetArray() {
    for (let i = 0; i < resetData.length; i++) {
        let target = resetData[i]["data"]["target_level"];
        resets.push([target, resetData[i]["data"]["original_level"] - target, new Date(resetData[i]["data"]["confirmed_at"])]);
    }
    resets.sort((a, b) => { return a[2] - b[2]; });
}

function repairSubjectArray() {
    subjectData.push({ id: 0, object: "placeholder" });
    subjectData.sort((a, b) => a["id"] - b["id"]);
    for (let i = 0; i < subjectData.length; i++) if (subjectData[i]["id"] != i) subjectData.splice(i, 0, { id: i, object: "placeholder" });
}

function repairLevelArray() {
    currentLevel = levelData[0];
    if (currentLevel["data"]["level"] != 1) {
        var newLevels = [];
        var prevDate = currentLevel["data"]["unlocked_at"];
        for (let i = currentLevel["data"]["level"] - 1; i > 0; i--) newLevels.push({ "data": { "created_at": null, "level": i, "unlocked_at": prevDate, "started_at": prevDate, "passed_at": prevDate, "completed_at": prevDate, "abandoned_at": null } });
        levelData.unshift(...newLevels.reverse());
    }
}

async function loadGraphs() {
    calculateTotalAverages();
    userInfo();
    levelInfo().then(() => { projections(); overviewInfo(); });
    wordInfo().then(updateCombinedAverages());
    updateReviewCharts();
    updateReviewAccuracy();
    updateTables();
}

async function userInfo() {
    let userInfo = "";
    userInfo += fixHtml("<b>Username: ") + userData["username"] + "\n";
    userInfo += fixHtml("<b>Current Level: ") + userData["level"] + "\n";
    userInfo += fixHtml("<b>User For: ") + parseInt((new Date() - new Date(userData["started_at"])) / (3600000 * 24)) + " days\n";
    userInfo += fixHtml("<b>Subscription Active: ") + userData["subscription"]["active"] + "\n";
    let userPre = document.getElementById("userinfo");
    userPre.innerHTML = userInfo;
}

function levelReorder(lvl) {
    if (lvl <= 4) {
        return 1;
    } else if (lvl <= 6) {
        return 2;
    } else if (lvl == 7) {
        return 3;
    } else if (lvl == 8) {
        return 4;
    } else if (lvl == 9) {
        return 5;
    }
}

async function projections() {
    const annotationsArray = [[16, "N5 Kanji & Joyo 25%"], [27, "N4 Kanji"], [51, "N3 & N2 Kanji"], [7, "Joyo 10%"], [32, "Joyo 50%"], [48, "Joyo 75%"], [58, "Joyo 90%"]];
    // create data array
    var [rawData, _] = P.api(userData, levelData, srsData, unalteredItemData); // raw projections data
    projectionsData = [["Level", { role: "tooltip", 'p': { 'html': true } }, { role: "annotation" }, "Fastest Finish", "Hypothetical Finish", "Reset Finish", "Predicted Finish"],
    [0, "<div style='margin: 5px'><div><b>Start</b></div><div style='white-space: nowrap'><i>Started Level 1:</i> " + dateLongFormat(new Date(levelData[0]["data"]["unlocked_at"])) + "</div></div>", null, null, null, null, new Date(levelData[0]["data"]["unlocked_at"])]];
    var text;
    var prevReset = false;
    for (let i = 1; i < 62; i++) {
        if (i != 61) text = "<div style='margin: 5px'><div><b>Level " + i + "</b></div>";
        else text = "<div style='margin: 5px'><div style='color: #f0ca00'><b>Burn All Items (全火)</b></div>";
        if (i < userData["level"]) {
            text += "<div style='white-space: nowrap'>" + fixHtml("<i>Finished Level: </i>") + dateLongFormat(levelDates[i - 1][2]) + "</div>";
            let resetLevelDate = null;
            if (levelDates[i - 1][levelDates[i - 1].length - 1] == "R") {
                if (!prevReset) projectionsData[projectionsData.length - 1][5] = projectionsData[projectionsData.length - 1][6];
                prevReset = true;
                resetLevelDate = levelDates[i - 1][levelDates[i - 1].length - 2][2];
                text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:indianred'>Reset Level: </i>") + dateLongFormat(resetLevelDate) + "</div></div>";
            } else {
                prevReset = false;
                text += "</div>";
            }
            projectionsData.push([i, text, null, null, null, resetLevelDate, levelDates[i - 1][2]]);
        }
        else {
            let [f, h, p] = [new Date(rawData[i + 1]['fastest']), new Date(rawData[i + 1]['given']), new Date(rawData[i + 1]['real'])];
            text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:darkgray'>Predicted Finish: </i>") + dateLongFormat(p) + "</div>";
            text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:#7aa7f5'>Hypothetical Finish: </i>") + dateLongFormat(h) + "</div>";
            text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:#EEBC1D'>Fastest Finish: </i>") + dateLongFormat(f) + "</div></div>";
            projectionsData.push([i, text, null, f, h, i == userData["level"] ? p : null, p]);
        }
    }
    for (let i = 0; i < annotationsArray.length; i++) projectionsData.find(element => element[0] == annotationsArray[i][0])[2] = annotationsArray[i][1];
    updateProjections();
}

async function updateProjections() {
    var [rawData, _] = P.api(userData, levelData, srsData, unalteredItemData);
    var text;
    for (let i = userData["level"] + 1; i <= 62; i++) {
        if (i != 62) text = "<div style='margin: 5px'><div><b>Level " + projectionsData[i][0] + "</b></div>";
        else text = "<div style='margin: 5px'><div style='color: #f0ca00'><b>Burn All Items (全火)</b></div>";
        let [f, h, p] = [projectionsData[i][3], new Date(rawData[i]['given']), projectionsData[i][6]];
        text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:darkgray'>Predicted Finish: </i>") + dateLongFormat(p) + "</div>";
        text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:#7aa7f5'>Hypothetical Finish: </i>") + dateLongFormat(h) + "</div>";
        text += "<div style='white-space: nowrap'>" + fixHtml("<i style='color:#EEBC1D'>Fastest Finish: </i>") + dateLongFormat(f) + "</div></div>";
        projectionsData[i][1] = text;
        projectionsData[i][4] = h;
    }
    let editedData = (document.getElementById('pastLevels').checked ? projectionsData.slice() : [projectionsData[0], ...projectionsData.slice(userData['level'] + 1)]).slice(...(document.getElementById('showBurn').checked ? [] : [0, -1]));
    if (!document.getElementById('showCheck').checked) editedData = editedData.map(x => [...x.slice(0, 2), ...x.slice(3)])
    let chartData = google.visualization.arrayToDataTable(editedData);
    var dateFormatter = new google.visualization.DateFormat({ pattern: "MMM dd yyyy" });
    dateFormatter.format(chartData, 1);
    dateFormatter.format(chartData, 2);
    dateFormatter.format(chartData, 3);
    var options = {
        chartArea: { width: '80%', height: '85%' },
        curveType: 'none',
        hAxis: { format: '0' },
        legend: { position: "none" },
        colors: ['#EEBC1D', '#7aa7f5', 'indianred', 'darkgray'],
        width: 1000,
        height: 333,
        tooltip: { isHtml: true },
        annotations: {
            style: 'line',
            domain: { stem: { color: '#7fbd7d' } } // darkgreen vertical lines
        },
        backgroundColor: { fill: 'transparent' },
        focusTarget: 'category'
    };
    var chartDiv = document.getElementById('projectionschart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    // click special data event
    google.visualization.events.addListener(chart, 'select', function () {
        const specificDiv = document.getElementById('specifics');
        var selection = chart.getSelection();
        if (selection.length == 0) { specificDiv.style.display = 'none'; document.getElementById('expand').checked = false; return; }
        var level = chartData.getValue(chart.getSelection()[0]['row'], 0);
        if (level == 61 || level == 0) { specificDiv.style.display = 'none'; document.getElementById('expand').checked = false; return; }
        document.getElementById('expanded').value = String(level);
        document.getElementById('expand').checked = true;
        var pastBox = document.getElementById('showPast'); // allow past levels to have an item breakdown
        pastBox.checked = true;
        var [_, output] = P.api(userData, levelData, srsData, unalteredItemData);
        pastBox.checked = false;
        var specificData = output.slice(output.indexOf('<table class="coverage">')).replace('class="header"', 'class="tableheader"');
        if (isMobile) {
            specificDiv.children[0].innerHTML = '<b>Specific Item Breakdown for Level ' + level + '</b>';
            specificDiv.children[1].innerHTML = specificData;
            specificDiv.style.display = 'block';
        } else {
            specificData = '<div style="margin-bottom: 5px"><b>Specific Item Breakdown for Level ' + level + '</b></div><div>' + specificData + '</div>';
            chart.setSelection();
            openDetailWindow(specificData);
        }
    });
}

function expandHypothetical() {
    let expandBool = document.getElementById('hypothetical').checked;
    if (expandBool) {
        document.getElementById('easyhypothetical').style.display = 'none';
        document.getElementById('advhypothetical').style.display = 'block';
    } else {
        document.getElementById('easyhypothetical').style.display = 'block';
        document.getElementById('advhypothetical').style.display = 'none';
    }
}

function calculateTotalAverages() {
    // (each 4) midacc, readacc, meanacc, reviews, lessons
    for (const arr of [midreviewAccuracy, readingAccuracy, meaningAccuracy]) {
        let tempAcc = arr.slice(1).reduce((p, c) => { s = [undefined]; for (let i = 1; i < 5; i++) s.push([p[i][0] + c[i][0], p[i][1] + c[i][1]]); return s; }).slice(1);
        for (let i = 0; i < 4; i++) tempAcc[i] = roundToDecimals((1 - tempAcc[i][0] / tempAcc[i][1]) * 100, 2, true) + "%";
        totalAverages.push(...tempAcc);
    }
    let tempArr = reviewArray.slice(1).reduce((p, c) => { s = [undefined]; for (let i = 1; i < 5; i++) s.push(p[i] + c[i]); return s; }).slice(1);
    for (let i = 0; i < 4; i++) tempArr[i] = roundToDecimals(tempArr[i] / (reviewArray.length - 1), 1);
    totalAverages.push(...tempArr);
    tempArr = itemArray.slice(1).reduce((p, c) => { s = [undefined]; for (let i = 1; i < 5; i++) s.push(p[i] + c[i]); return s; }).slice(1);
    for (let i = 0; i < 4; i++) tempArr[i] = roundToDecimals(tempArr[i] / (itemArray.length - 1), 2);
    totalAverages.push(...tempArr);
}

function updateCombinedAverages() {
    var chartArray = [["", "All", "部首", "漢字", "単語"], ["Accuracy"], ["↳ Meaning"], ["↳ Reading"], ["Avg Reviews"], ["Total Reviews"], ["Avg Lessons"], ["Total Items"]];
    var chartData = [totalAverages.slice(0, 4), totalAverages.slice(8, 12), totalAverages.slice(4, 8), totalAverages.slice(12, 16), totalArray[totalArray.length - 1].slice(1), totalAverages.slice(16, 20)];
    for (const i of [0, 1, 2]) chartData[i].unshift(chartData[i].pop());
    chartData[2][1] = "-";
    let wordProgressTotals = wordProgressData.slice(1, 4);
    let runningTotal = 0;
    for (let i = 0; i < 3; i++) {
        wordProgressTotals[i] = wordProgressTotals[i][1];
        runningTotal += wordProgressTotals[i];
    }
    chartData.push([runningTotal, ...wordProgressTotals]);
    for (let i = 0; i < 7; i++) chartArray[i + 1].push(...chartData[i]);
    // generate table
    var averageTable = document.getElementById('averagetable');
    let tableHeadTr = averageTable.children[0].children[0];
    let colors = ['dodgerblue', 'hotpink', 'mediumpurple'];
    for (let i = 0; i < chartArray[0].length; i++) {
        let thNew = document.createElement('th');
        let text = i == 0 ? chartArray[0][i] : "<p style='" + (i == 1 ? "" : "color: " + colors[i - 2] + "; ") + "font-size: 130%; margin: 0; padding: 0'>" + chartArray[0][i] + "</p>";
        thNew.innerHTML = text;
        tableHeadTr.appendChild(thNew);
    }
    let tableBody = averageTable.children[1];
    for (let i = 1; i < chartArray.length; i++) {
        let trNew = document.createElement('tr');
        for (let j = 0; j < 5; j++) {
            let tdNew = document.createElement('td');
            switch (j) {
                case 0: tdNew.style.textAlign = 'left'; tdNew.style.border = '1px solid #dddfe1'; break;
                case 2: tdNew.classList.add('radtable'); break;
                case 3: tdNew.classList.add('kantable'); break;
                case 4: tdNew.classList.add('voctable'); break;
            }
            tdNew.innerHTML = chartArray[i][j];
            trNew.appendChild(tdNew);
        }
        tableBody.appendChild(trNew);
    }
}

function sameDay(d1, d2) {
    return Math.abs(d1 - d2) < 43200000; // twelve hourse 
}

function openSnapshot(date) {
    // generate data
    snapshotDate = new Date(date.getTime());
    let currentIndex = midreviewAccuracy.length - 1, currentOtherIndex = reviewArray.length - 1;
    currentSnapshot = [...midreviewAccuracy[currentIndex].slice(1), ...readingAccuracy[currentIndex].slice(1), ...meaningAccuracy[currentIndex].slice(1),
    ...reviewArray[currentOtherIndex].slice(1), ...itemArray[currentIndex].slice(1), totalArray[currentOtherIndex][1]];
    for (let i = 0; i < 12; i++) currentSnapshot[i] = currentSnapshot[i][1] == 0 ? "-" : roundToDecimals((1 - currentSnapshot[i][0] / currentSnapshot[i][1]) * 100) + "%";
    openDetailWindow('<h2>One Day Snapshot</h2><div id="snapshottable"></div><p><b>Info:</b> Use arrow keys or a/d to change the currently viewed date.</p>'); // open window
    moveSnapshot(0);
}

function moveSnapshot(n) {
    if (!detailWindowOpen) return; // window not open
    let date = new Date(snapshotDate.getTime()); // temporary date
    date.setDate(date.getDate() + n);
    let index = midreviewAccuracy.slice(1).findIndex(element => sameDay(element[0], date)) + 1;
    let otherIndex = reviewArray.slice(1).findIndex(element => sameDay(element[0], date)) + 1;
    if (otherIndex == 0) return; // is out of range (date before start or after today)
    snapshotDate.setDate(snapshotDate.getDate() + n);
    if (index == 0) snapshotData = ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-",
        ...reviewArray[otherIndex].slice(1), "-", "-", "-", "-", totalArray[otherIndex][1]];
    else { // there is data
        snapshotData = [...midreviewAccuracy[index].slice(1), ...readingAccuracy[index].slice(1), ...meaningAccuracy[index].slice(1),
        ...reviewArray[otherIndex].slice(1), ...itemArray[index].slice(1), totalArray[otherIndex][1]];
        for (let i = 0; i < 12; i++) snapshotData[i] = snapshotData[i][1] == 0 ? "-" : roundToDecimals((1 - snapshotData[i][0] / snapshotData[i][1]) * 100) + "%";
    }
    generateSnapshotTable();
}

function generateSnapshotTable() {
    // fill out chart array
    chartArray = [["Data Point", dateLongFormat(snapshotDate), dateLongFormat(midreviewAccuracy[midreviewAccuracy.length - 1][0]), "Average"]];
    chartNames = ["Accuracy Radical", "Accuracy Kanji", "Accuracy Vocab", "Accuracy",
        "Reading Acc Radical", "Reading Acc Kanji", "Reading Acc Vocab", "Reading Acc",
        "Meaning Acc Radical", "Meaning Acc Kanji", "Meaning Acc Vocab", "Meaning Acc",
        "Reviews", "Reviews Radical", "Reviews Kanji", "Reviews Vocab",
        "Lessons", "Lessons Radical", "Lessons Kanji", "Lessons Vocab", "Total Reviews"]
    for (const i of [3, 0, 1, 2, 7, 4, 5, 6, 11, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20]) chartArray.push([chartNames[i], snapshotData[i], currentSnapshot[i], totalAverages[i] == undefined || totalAverages[i] == "NaN%" ? "-" : totalAverages[i]]);
    // generate table
    let tableData = google.visualization.arrayToDataTable(chartArray);
    var table = new google.visualization.Table(document.getElementById('snapshottable'));
    var options = {
        showRowNumber: false,
        allowHtml: true,
        alternatingRowStyle: false,
        width: '100%',
        height: '100%',
        sort: 'event', // no sorting
        cssClassNames: lightMode ? undefined : {
            headerRow: 'charttableheaderdark',
            tableRow: 'charttablerowdark',
            hoverTableRow: 'charttablehoverdark'
        }
    }
    const colors = lightMode ? ['azure', '#ffe6f8', '#f3ebfc'] : ['#102b38', '#401439', '#2a1440'];
    for (const row of [1, 5, 9, 13, 17]) {
        for (let col = 0; col < 4; col++) tableData.setProperty(row, col, 'style', 'background-color: ' + colors[0] + ';');
        for (let col = 0; col < 4; col++) tableData.setProperty(row + 1, col, 'style', 'background-color: ' + colors[1] + ';');
        for (let col = 0; col < 4; col++) tableData.setProperty(row + 2, col, 'style', 'background-color: ' + colors[2] + ';');
    }
    table.draw(tableData, options);
    google.visualization.events.addListener(table, 'select', () => { table.setSelection([]); }); // no selecting
}

async function reviewInfo() {
    // create array
    for (const div of reviewAll) div.style.display = "block";
    const dataLength = reviewData.length;
    if (dataLength == 0) { for (const div of reviewAll) div.style.display = "none"; return; }
    var resetArray = [];
    reviewArray = [["Date", "Reviews", "Radical", "Kanji", "Vocab"]];
    srsArray = [["Date", "Apprentice", "Guru", "Master", "Enlightened", "Burned"], [0, 0, 0, 0, 0, 0]];
    itemArray = [["Date", "All", "Radical", "Kanji", "Vocab"], [0, 0, 0, 0, 0]];
    var usedIds = [];
    var found;
    reviewAccuracy = [["Date", "Radical", "Kanji", "Vocab", "All"], [1, 1, 1, 1, 1]];
    midreviewAccuracy = [["Date", "Radical", "Kanji", "Vocab", "All"], [1, [1, 1], [1, 1], [1, 1], [1, 1]]];
    readingAccuracy = [["Date", "Radical", "Kanji", "Vocab", "All"], [1, [1, 1], [1, 1], [1, 1], [1, 1]]];
    meaningAccuracy = [["Date", "Radical", "Kanji", "Vocab", "All"], [1, [1, 1], [1, 1], [1, 1], [1, 1]]];
    reviewAccTotal = [[1, 1, 1, 1]];
    timeData = [["Date", "Total Time", ["Radicals", "Kanji", "Vocab"], ["Apprentice", "Guru", "Master", "Enlightened", "Burned"]]];
    timeTotalData = [["Date", "Total Time", ["Radicals", "Kanji", "Vocab"], ["Apprentice", "Guru", "Master", "Enlightened", "Burned"]]];
    var timeLimits = [0.5, 1, 2, 4]; // unit is minutes
    let timelimitSelect = document.getElementById('timelimit');
    for (let i = 0; i < timeLimits.length; i++) {
        let option = document.createElement('option');
        option.innerHTML = minsToDurationString(timeLimits[i], true, false);
        option.value = timeLimits[i];
        timelimitSelect.appendChild(option);
    }
    var correct;
    for (let i = 0; i < dataLength; i++) {
        let currentReview = reviewData[i]["data"];
        let subId = currentReview["subject_id"];
        if (subjectData[subId]["object"] == "placeholder") continue;
        // bare review data
        let date = dateNoTime(new Date(currentReview["created_at"])), newDate;
        found = reviewArray.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (found == -1) {
            reviewArray.push([new Date(date.getTime()), 0, 0, 0, 0]);
            let newTimeDataPoint = [new Date(date.getTime())];
            for (let j = 0; j < timeLimits.length; j++) newTimeDataPoint.push([0, [0, 0, 0], [0, 0, 0, 0, 0]]);
            timeData.push(newTimeDataPoint);
            found = reviewArray.length - 1;
        }
        reviewArray[found][1]++;
        switch (subjectData[subId]["object"]) {
            case "vocabulary": reviewArray[found][4]++; break;
            case "kanji": reviewArray[found][3]++; break;
            case "radical": reviewArray[found][2]++; break;
        }
        // time data
        let typeStart = levelReorder(currentReview["starting_srs_stage"]);
        let typeEnd = levelReorder(currentReview["ending_srs_stage"]);
        if (i != 0) {
            let diff = (new Date(currentReview["created_at"]) - new Date(reviewData[i - 1]["data"]["created_at"])) / 60000; // difference in minutes
            for (let j = 0; j < timeLimits.length; j++) {
                let timeAdded = diff;
                if (diff > timeLimits[j]) { timeAdded = timeLimits[j] / 5; } // do not count afk reviews or spaces between session
                timeData[found][j + 1][0] += timeAdded; // all
                switch (subjectData[subId]["object"]) { // type
                    case "vocabulary": timeData[found][j + 1][1][2] += timeAdded; break;
                    case "kanji": timeData[found][j + 1][1][1] += timeAdded; break;
                    case "radical": timeData[found][j + 1][1][0] += timeAdded; break;
                }
                timeData[found][j + 1][2][typeEnd - 1] += timeAdded; // srs stage
                
            }
        }
        // srs review data
        correct = currentReview["incorrect_meaning_answers"] == 0 && currentReview["incorrect_reading_answers"] == 0 ? 1 : 0;
        let [incRead, incMean] = [currentReview["incorrect_reading_answers"], currentReview["incorrect_meaning_answers"]];
        let foundSrs = srsArray.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (foundSrs == -1) {
            newDate = [...srsArray[srsArray.length - 1]];
            newDate[0] = date;
            srsArray.push(newDate);
            for (let i = 0; i < 4; i++) {
                let value = (reviewAccTotal[reviewAccuracy.length - 2][i] != 0 ?
                    reviewAccuracy[reviewAccuracy.length - 1][i + 1] / reviewAccTotal[reviewAccuracy.length - 2][i] * 100 :
                    reviewAccuracy[reviewAccuracy.length - 2][i + 1]);
                reviewAccuracy[reviewAccuracy.length - 1][i + 1] = value != 0 ? value : reviewAccuracy[reviewAccuracy.length - 2][i + 1];
            }
            itemArray.push([date, 0, 0, 0, 0]);
            reviewAccuracy.push([date, 0, 0, 0, 0]);
            reviewAccTotal.push([0, 0, 0, 0]);
            midreviewAccuracy.push([date, [0, 0], [0, 0], [0, 0], [0, 0]]); meaningAccuracy.push([date, [0, 0], [0, 0], [0, 0], [0, 0]]); readingAccuracy.push([date, [0, 0], [0, 0], [0, 0], [0, 0]]);
            foundSrs = srsArray.length - 1;
        }
        srsArray[foundSrs][typeStart]--;
        let foundId = usedIds.findIndex(element => element[0] == subId);
        if (foundId == -1) {
            usedIds.push([subId, typeEnd]);
            srsArray[foundSrs][typeEnd]++;
        } else usedIds[foundId][1] = typeEnd;
        srsArray[foundSrs][typeEnd]++;
        // review acc
        let accLength = reviewAccuracy.length - 1;
        reviewAccuracy[accLength][4] += correct;
        reviewAccTotal[accLength - 1][3]++;
        midreviewAccuracy[accLength][4][0] += incRead + incMean; midreviewAccuracy[accLength][4][1] += incRead + incMean + (subjectData[subId]["object"] == "radical" ? 1 : 2);
        meaningAccuracy[accLength][4][0] += incMean; meaningAccuracy[accLength][4][1] += incMean + 1;
        readingAccuracy[accLength][4][0] += incRead; readingAccuracy[accLength][4][1] += incRead + (subjectData[subId]["object"] == "radical" ? 0 : 1);
        if (foundId == -1) itemArray[accLength][1]++;
        switch (subjectData[subId]["object"]) {
            case "vocabulary":
                reviewAccuracy[accLength][3] += correct;
                reviewAccTotal[accLength - 1][2]++;
                if (foundId == -1) itemArray[accLength][4]++;
                midreviewAccuracy[accLength][3][0] += incRead + incMean; midreviewAccuracy[accLength][3][1] += incRead + incMean + 2;
                meaningAccuracy[accLength][3][0] += incMean; meaningAccuracy[accLength][3][1] += incMean + 1;
                readingAccuracy[accLength][3][0] += incRead; readingAccuracy[accLength][3][1] += incRead + 1;
                break;
            case "kanji":
                reviewAccuracy[accLength][2] += correct;
                reviewAccTotal[accLength - 1][1]++;
                if (foundId == -1) itemArray[accLength][3]++;
                midreviewAccuracy[accLength][2][0] += incRead + incMean; midreviewAccuracy[accLength][2][1] += incRead + incMean + 2;
                meaningAccuracy[accLength][2][0] += incMean; meaningAccuracy[accLength][2][1] += incMean + 1;
                readingAccuracy[accLength][2][0] += incRead; readingAccuracy[accLength][2][1] += incRead + 1;
                break;
            case "radical":
                reviewAccuracy[accLength][1] += correct;
                reviewAccTotal[accLength - 1][0]++;
                if (foundId == -1) itemArray[accLength][2]++;
                midreviewAccuracy[accLength][1][0] += incRead + incMean; midreviewAccuracy[accLength][1][1] += incRead + incMean + 1;
                meaningAccuracy[accLength][1][0] += incMean; meaningAccuracy[accLength][1][1] += incMean + 1;
                readingAccuracy[accLength][1][0] += incRead; readingAccuracy[accLength][1][1] += incRead;
                break;
        }
        let exactDate = new Date(currentReview["created_at"]);
        // hidden items
        while (hiddenItems.length != 0 && dateNoTime(new Date(hiddenItems[0][0])) <= date) {
            let hiddenLevel = usedIds.findIndex(element => element[0] == hiddenItems[0][1]);
            if (hiddenLevel == -1) { hiddenItems.splice(0, 1); continue; }
            srsArray[foundSrs][usedIds[hiddenLevel][1]]--; // delete from srs stage
            hiddenItems.splice(0, 1);
        }
        // srs reset
        let resetIndex = -1;
        for (let j = 0; j < resets.length; j++) {
            if (exactDate >= resets[j][2] && !resetArray.includes(j)) {
                resetIndex = j;
                break;
            }
        }
        if (resetIndex != -1) {
            // resurrected items before reset
            if (resurrectedItems.length != 0) {
                while (new Date(resurrectedItems[0][0]) < resets[resetIndex][2]) {
                    let resurrectedLevel = usedIds.findIndex(element => element[0] == resurrectedItems[0][1]);
                    if (resurrectedLevel == -1) continue;
                    srsArray[foundSrs][usedIds[resurrectedLevel][1]]--; // delete from srs stage
                    srsArray[foundSrs][1]++; // add to apprentice
                    usedIds[resurrectedLevel][1] = 1;
                    resurrectedItems.splice(0, 1);
                    if (resurrectedItems.length == 0) break;
                }
            }
            let deleteIds = [];
            for (let k = 0; k < usedIds.length; k++) {
                if (subjectData[usedIds[k][0]]["data"]["level"] >= resets[resetIndex][0]) {
                    deleteIds.push(k);
                    srsArray[foundSrs][usedIds[k][1]]--;
                }
            }
            for (var j = deleteIds.length - 1; j >= 0; j--) usedIds.splice(deleteIds[j], 1);
            resetArray.push(resetIndex);
        }
        // resurrect items after reset
        if (resurrectedItems.length != 0) {
            let resurrectedDate = dateNoTime(new Date(resurrectedItems[0][0]));
            while (resurrectedDate <= date) {
                let resurrectedLevel = usedIds.findIndex(element => element[0] == resurrectedItems[0][1]);
                if (resurrectedLevel == -1) continue;
                srsArray[srsArray.length - 1][usedIds[resurrectedLevel][1]]--; // delete from srs stage
                srsArray[srsArray.length - 1][1]++; // add to apprentice
                usedIds[resurrectedLevel][1] = 1;
                resurrectedItems.splice(0, 1);
                if (resurrectedItems.length != 0) resurrectedDate = dateNoTime(new Date(resurrectedItems[0][0]));
                else break;
            }
        }
    }
    srsArray.splice(1, 1);
    reviewAccuracy.splice(1, 1);
    reviewAccTotal.splice(1, 1);
    midreviewAccuracy.splice(1, 1);
    meaningAccuracy.splice(1, 1);
    readingAccuracy.splice(1, 1);
    itemArray.splice(1, 1);
    srsArray.sort((a, b) => a[0].valueOf() - b[0].valueOf());
    reviewArray.sort((a, b) => a[0].valueOf() - b[0].valueOf());
    for (let i = 0; i < 4; i++) {
        let value = (reviewAccTotal[reviewAccTotal.length - 1][i] != 0 ?
            reviewAccuracy[reviewAccuracy.length - 1][i + 1] / reviewAccTotal[reviewAccTotal.length - 1][i] * 100 :
            reviewAccuracy[reviewAccuracy.length - 2][i + 1]);
        value = value == 0 ? reviewAccuracy[reviewAccuracy.length - 2][i + 1] : value;
        reviewAccuracy[reviewAccuracy.length - 1][i + 1] = value;
    }
    await new Promise(r => setTimeout(r, 50));

    // fill undefined dates with 0
    let firstDate = reviewArray[1][0];
    let lastDate = reviewArray[reviewArray.length - 1][0];
    let currentDate = new Date(firstDate.getTime());
    let prevIndex = 1;
    while (currentDate < lastDate) {
        let addIndex = reviewArray.findIndex(element => Math.abs(element[0] - currentDate) < 43200000); // time in milliseconds for 12 hours
        if (addIndex == -1) {
            reviewArray.splice(prevIndex + 1, 0, [new Date(currentDate.getTime()), 0, 0, 0, 0]);
            timeData.splice(prevIndex + 1, 0, [new Date(currentDate.getTime()), [0, [0, 0, 0], [0, 0, 0, 0, 0]], [0, [0, 0, 0], [0, 0, 0, 0, 0]], [0, [0, 0, 0], [0, 0, 0, 0, 0]], [0, [0, 0, 0], [0, 0, 0, 0, 0]]]);
            prevIndex++;
        } else prevIndex = addIndex;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // total reviews
    let runningTotal = [0, 0, 0, 0];
    totalArray = [["Date", "Total Reviews", "Total Radical", "Total Kanji", "Total Vocab"]];
    for (let i = 1; i < reviewArray.length; i++) {
        for (let j = 0; j < 4; j++) runningTotal[j] += reviewArray[i][j + 1];
        totalArray.push([reviewArray[i][0], ...runningTotal]);
    }

    // total time
    runningTotal = [];
    for (let j = 0; j < timeLimits.length; j++) runningTotal.push([0, [0, 0, 0], [0, 0, 0, 0, 0]]);
    for (let i = 1; i < timeData.length; i++) {
        for (let j = 0; j < runningTotal.length; j++) {
            runningTotal[j][0] += timeData[i][j + 1][0];
            for (let k = 0; k < 3; k++) runningTotal[j][1][k] += timeData[i][j + 1][1][k];
            for (let k = 0; k < 5; k++) runningTotal[j][2][k] += timeData[i][j + 1][2][k];
        }
        let newData = [];
        for (let j = 0; j < runningTotal.length; j++) {
            newData.push([runningTotal[j][0], [...runningTotal[j][1]], [...runningTotal[j][2]]])
        }
        timeTotalData.push([timeData[i][0], ...newData]);
    }
}

function totalArrayToAcc(data) {
    var newArray = [data[0]];
    var prevItem = [1, 100, 100, 100, 100];
    for (let i = 1; i < data.length; i++) {
        let newItem = [data[i][0]];
        for (let j = 1; j < data[i].length; j++) newItem.push(data[i][j][1] == 0 ? prevItem[j] : ((1 - data[i][j][0] / data[i][j][1]) * 100));
        newArray.push(newItem);
        prevItem = newItem.slice();
    }
    return newArray;
}

function subtractLists(a, b) {
    let c = [];
    for (let i = 0; i < a.length; i++) {
        let na = a[i], nb = b[i];
        c.push(Array.isArray(na) ? subtractLists(na, nb) : na - nb);
    }
    return c;
}

function dataDateShorten(dataPrev, date, nullify = false) {
    let data = [];
    for (let i = 1; i < dataPrev.length; i++) {
        data.push([...dataPrev[i]]);
    }
    if (data[0][0] > date) return dataPrev;
    let spliceIndex = data.findIndex(element => element[0] > date);
    if (spliceIndex == -1) return dataPrev;
    let prevData = data[spliceIndex - 1];
    let newData = data.slice(spliceIndex);
    if (nullify) newData = newData.map(e => [e[0], ...subtractLists(e.slice(1), prevData.slice(1))]);
    newData = [dataPrev[0], ...newData];
    return newData;
}

async function updateReviewCharts() {
    let startDate = new Date(newdateinp.value);
    const loadingLbl = document.getElementById("reviewinfodiv");
    loadingLbl.innerHTML = "Time frame starts at " + startDate.toUTCString().split(' ').slice(1, 4).join(' ') + ".";
    let nullifyBool = newdateche.checked;
    if (reviewArray.length == 0) return;
    var dateFormatter = new google.visualization.DateFormat({ pattern: "MMM dd yyyy" });
    // reviews per day
    updateReviewsPerDay();
    // total reviews
    let totalChartData = google.visualization.arrayToDataTable(dataDateShorten(totalArray, startDate, nullifyBool));
    dateFormatter.format(totalChartData, 0);
    var options = {
        chartArea: { width: '100%', height: '85%' },
        hAxis: {}, vAxis: { textPosition: 'in' },
        title: 'Total Reviews',
        curveType: 'none',
        legend: { position: "none" },
        width: 1000,
        height: 333,
        tooltip: { isHtml: true, trigger: 'both' },
        colors: ['black', '#55abf2', '#f032b1', '#bb31de'],
        backgroundColor: { fill: 'transparent' },
        focusTarget: 'category'
    };
    var chartDiv = document.getElementById('totalchart');
    var totalChart = new google.visualization.LineChart(chartDiv);
    totalChart.draw(totalChartData, options);
    google.visualization.events.addListener(totalChart, 'select', function () { // arrow mover
        chartSelectionSetter(totalChart);
    });
    // srs stacked
    srsStackChartData = google.visualization.arrayToDataTable(dataDateShorten(srsArray, startDate, nullifyBool));
    dateFormatter.format(srsStackChartData, 0);
    options = {
        chartArea: { width: '100%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'bottom' }, vAxis: { textPosition: 'in' },
        //title: "Item Types Stacked",
        connectSteps: true,
        colors: ['pink', 'purple', 'darkblue', 'lightblue', '#f0ca00'], // burned is gold
        isStacked: true,
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    chartDiv = document.getElementById('srschart');
    srsStackedChart = new google.visualization.SteppedAreaChart(chartDiv);
    srsStackedChart.draw(srsStackChartData, options);
    google.visualization.events.addListener(srsStackedChart, 'select', function () { chartSelectionSetter(srsStackedChart); });
    // srs
    options = {
        chartArea: { width: '100%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'bottom' }, vAxis: { textPosition: 'in' },
        //title: "Item Types",
        colors: ['pink', 'purple', 'darkblue', 'lightblue', '#f0ca00'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    chartDiv = document.getElementById('srschart2');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(srsStackChartData, options);
    google.visualization.events.addListener(chart, 'select', function () { chartSelectionSetter(chart); });
    // time chart
    if (timeChart === undefined) {
        var options = {
            chart: {
                type: 'line',
                height: '400px',
                /*events: {
                    click: chartClick,
                    beforeZoom: function (_, info) {
                        if (info.yaxis !== undefined) currentSelection = 1 - currentSelection;
                    },
                    mouseLeave: function (_, _) {
                        chartSelectionMover(0);
                    }
                }*/
            },
            title: { text: 'Time Spent on Reviews Per Day' },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            series: [],
            yaxis: {
                labels: {
                    formatter: function (value, _, _) {
                        return minsToDurationString(value, true, true);
                    }
                }
            },
            xaxis: { type: 'datetime' },
            dataLabels: { enabled: false },
            tooltip: {
                shared: true,
                x: {
                    format: 'MMM dd yyyy'
                },
                y: {
                    formatter: function (value, _, _) {
                        return minsToDurationString(value, false, false);
                    }
                }
            },
            legend: { show: false }
        }
        timeChart = new ApexCharts(document.getElementById('timechart'), options);
        timeChart.render();
        timeChart.updateOptions({ theme: { mode: lightMode ? 'light' : 'dark' }, chart: { background: lightMode ? '#ffffff' : '#1b1b1b' } });
    }
    if (timeTotalChart === undefined) {
        var options = {
            chart: {
                type: 'line',
                height: '400px',
                /*events: {
                    click: chartClick,
                    beforeZoom: function (_, info) {
                        if (info.yaxis !== undefined) currentSelection = 1 - currentSelection;
                    },
                    mouseLeave: function (_, _) {
                        chartSelectionMover(0);
                    }
                }*/
            },
            title: { text: 'Total Time Spent Reviewing' },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            series: [],
            yaxis: {
                labels: {
                    formatter: function (value, _, _) {
                        return minsToDurationString(value, true, true);
                    }
                }
            },
            xaxis: { type: 'datetime' },
            dataLabels: { enabled: false },
            tooltip: {
                shared: true,
                x: {
                    format: 'MMM dd yyyy'
                },
                y: {
                    formatter: function (value, _, _) {
                        return minsToDurationString(value, false, false);
                    }
                }
            },
            legend: { show: false }
        }
        timeTotalChart = new ApexCharts(document.getElementById('timetotalchart'), options);
        timeTotalChart.render();
        timeTotalChart.updateOptions({ theme: { mode: lightMode ? 'light' : 'dark' }, chart: { background: lightMode ? '#ffffff' : '#1b1b1b' } });
    }
    updateTimeChart();
}

function updateTimeChart() {
    let timeLimitIndex = document.getElementById('timelimit').selectedIndex,
        useSrsBool = document.getElementById('timestagetypeswitch').checked,
        totalBool = document.getElementById('timeonlytotal').checked,
        avgVal = document.getElementById('avgtime').value,
        nullifyBool = newdateche.checked,
        startDate = new Date(newdateinp.value);
    var currentTimeData = dataDateShorten(timeData, startDate, false);
    if (useSrsBool) {
        timeChart.updateOptions({
            series: totalBool ? [{
                name: currentTimeData[0][1], // total
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]]), avgVal)
            }] : [{
                name: currentTimeData[0][1], // total
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]]), avgVal)
            }, {
                name: currentTimeData[0][3][0], // app
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][0]]), avgVal)
            }, {
                name: currentTimeData[0][3][1], // gur
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][1]]), avgVal)
            }, {
                name: currentTimeData[0][3][2], // mas
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][2]]), avgVal)
            }, {
                name: currentTimeData[0][3][3], // enl
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][3]]), avgVal)
            }, {
                name: currentTimeData[0][3][4], // bur
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][4]]), avgVal)
            }],
            colors: ['#000000', '#f400a3', '#9e34b8', '#3557dd', '#0096e2', '#f0ca00']
        }, true, true);
        currentTimeData = dataDateShorten(timeTotalData, startDate, nullifyBool);
        timeTotalChart.updateOptions({
            series: totalBool ? [{
                name: currentTimeData[0][1], // total
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]])
            }] : [{
                name: currentTimeData[0][1], // total
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]])
            }, {
                name: currentTimeData[0][3][0], // app
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][0]])
            }, {
                name: currentTimeData[0][3][1], // gur
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][1]])
            }, {
                name: currentTimeData[0][3][2], // mas
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][2]])
            }, {
                name: currentTimeData[0][3][3], // enl
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][3]])
            }, {
                name: currentTimeData[0][3][4], // bur
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][2][4]])
            }],
            colors: ['#000000', '#f400a3', '#9e34b8', '#3557dd', '#0096e2', '#f0ca00']
        }, true, true);
    } else {
        timeChart.updateOptions({
            series: totalBool ? [{
                name: currentTimeData[0][1], // total
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]]), avgVal)
            }] : [{
                name: currentTimeData[0][1], // total
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]]), avgVal)
            }, {
                name: currentTimeData[0][2][0], // rad
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][0]]), avgVal)
            }, {
                name: currentTimeData[0][2][1], // kan
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][1]]), avgVal)
            }, {
                name: currentTimeData[0][2][2], // voc
                data: movingAverage(currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][2]]), avgVal)
            }],
            colors: ['#000000', '#55abf2', '#f032b1', '#bb31de']
        }, true, true);
        currentTimeData = dataDateShorten(timeTotalData, startDate, nullifyBool);
        timeTotalChart.updateOptions({
            series: totalBool ? [{
                name: currentTimeData[0][1], // total
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]])
            }] : [{
                name: currentTimeData[0][1], // total
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][0]])
            }, {
                name: currentTimeData[0][2][0], // rad
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][0]])
            }, {
                name: currentTimeData[0][2][1], // kan
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][1]])
            }, {
                name: currentTimeData[0][2][2], // voc
                data: currentTimeData.slice(1).map(x => [x[0].getTime(), x[timeLimitIndex + 1][1][2]])
            }],
            colors: ['#000000', '#55abf2', '#f032b1', '#bb31de']
        }, true, true);
    }
}

function roundToDecimals(num, n = 1, fill = false) {
    let result = Math.round((num + Number.EPSILON) * (10 ** n)) / (10 ** n);
    return fill && num != 100 ? result.toFixed(n) : result;
}

function updateTables(changeOffset = 0) {
    tableOffset += changeOffset;
    tableOffset = tableOffset < 0 || tableOffset >= 100000 ? 0 : tableOffset;
    document.getElementById("tableoffset").innerHTML = tableOffset;
    let dateAmount = 12;
    let durationDays = document.getElementById("tableday").value;
    let durationMonths = document.getElementById("tablemonth").value;
    var dates = [];
    var datesEnd = [];
    let tomorrow = dateNoTime(new Date());
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (let i = dateAmount + tableOffset; i >= tableOffset; i--) {
        dates.push(new Date(tomorrow.getFullYear(), tomorrow.getMonth() - durationMonths * i, tomorrow.getDate() - durationDays * i));
        datesEnd.push(new Date(tomorrow.getFullYear(), tomorrow.getMonth() - durationMonths * (i - 1), tomorrow.getDate() - durationDays * (i - 1) - 1));
    }
    let dateElements = document.getElementById("tableheaddate").children;
    let dateEndElements = document.getElementById("tableheadenddate").children;
    let intervalElements = document.getElementById("tableheadinterval").children;
    let reviewElements = document.getElementById("reviewtable").children;
    let reviewradElements = document.getElementById("reviewradtable").children;
    let reviewkanjiElements = document.getElementById("reviewkanjitable").children;
    let reviewvocabElements = document.getElementById("reviewvocabtable").children;
    let corElements = document.getElementById("cortable").children;
    let corradElements = document.getElementById("corradtable").children;
    let corkanjiElements = document.getElementById("corkanjitable").children;
    let corvocabElements = document.getElementById("corvocabtable").children;
    let accElements = document.getElementById("acctable").children;
    let accradElements = document.getElementById("accradtable").children;
    let acckanjiElements = document.getElementById("acckanjitable").children;
    let accvocabElements = document.getElementById("accvocabtable").children;
    let readaccElements = document.getElementById("readacctable").children;
    let readaccradElements = document.getElementById("readaccradtable").children;
    let readacckanjiElements = document.getElementById("readacckanjitable").children;
    let readaccvocabElements = document.getElementById("readaccvocabtable").children;
    let meanaccElements = document.getElementById("meanacctable").children;
    let meanaccradElements = document.getElementById("meanaccradtable").children;
    let meanacckanjiElements = document.getElementById("meanacckanjitable").children;
    let meanaccvocabElements = document.getElementById("meanaccvocabtable").children;
    let itemElements = document.getElementById("itemtable").children;
    let itemradElements = document.getElementById("itemradtable").children;
    let itemkanjiElements = document.getElementById("itemkanjitable").children;
    let itemvocabElements = document.getElementById("itemvocabtable").children;
    var elementList = [dateElements, dateEndElements, reviewElements, reviewradElements, reviewkanjiElements, reviewvocabElements,
        accElements, accradElements, acckanjiElements, accvocabElements, itemElements, itemradElements, itemkanjiElements, itemvocabElements,
        readaccElements, readaccradElements, readacckanjiElements, readaccvocabElements, meanaccElements, meanaccradElements, meanacckanjiElements, meanaccvocabElements,
        corElements, corradElements, corkanjiElements, corvocabElements];
    if (dateElements.length == 1) {
        for (let j = 0; j < elementList.length; j++) for (let i = 0; i < dateAmount; i++) {
            let newtr = document.createElement(elementList[j][0].nodeName);
            elementList[j][0].parentElement.appendChild(newtr);
        }
    }
    for (let i = 1; i < dateElements.length; i++) dateElements[i].innerHTML = "<th>" + dateLongFormat(dates[i - 1]) + "</th>";
    for (let i = 1; i < dateEndElements.length; i++) dateEndElements[i].innerHTML = "<th>" + dateLongFormat(datesEnd[i - 1]) + "</th>";
    for (let i = 1; i < intervalElements.length; i++) intervalElements[i].innerHTML = "<th>" + (dateAmount - i + tableOffset + 1) + "</th>";
    // reviews
    var reviewsTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = reviewArray.findIndex(element => element[0] >= dates[i]);
        let endFound = reviewArray.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? reviewArray.length : startFound; // last column counts to now
        endFound = endFound == -1 ? reviewArray.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += reviewArray[j][k + 1];
        }
        reviewsTable.push(runningTotal);
    }
    for (let i = 1; i < reviewElements.length; i++) {
        reviewElements[i].innerHTML = reviewsTable[i - 1][0];
        reviewradElements[i].innerHTML = reviewsTable[i - 1][1];
        reviewkanjiElements[i].innerHTML = reviewsTable[i - 1][2];
        reviewvocabElements[i].innerHTML = reviewsTable[i - 1][3];
    }
    // accuracy (correctness; end-review percentage; percentage items correct)
    var corTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = reviewAccuracy.findIndex(element => element[0] >= dates[i]);
        let endFound = reviewAccuracy.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? reviewAccuracy.length : startFound; // last column counts to now
        endFound = endFound == -1 ? reviewAccuracy.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        let runningAmount = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += reviewAccuracy[j][k + 1] * reviewAccTotal[j - 1][k];
            for (let k = 0; k < 4; k++) runningAmount[k] += reviewAccTotal[j - 1][k];
        }
        for (let k = 0; k < 4; k++) runningTotal[k] = runningAmount[k] == 0 ? "-" : roundToDecimals(runningTotal[k] / runningAmount[k], 2, true);
        corTable.push([...runningTotal]);
    }
    for (let i = 1; i < corElements.length; i++) {
        corElements[i].innerHTML = corTable[i - 1][3];
        corradElements[i].innerHTML = corTable[i - 1][0];
        corkanjiElements[i].innerHTML = corTable[i - 1][1];
        corvocabElements[i].innerHTML = corTable[i - 1][2];
    }
    // new items
    var itemsTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = itemArray.findIndex(element => element[0] >= dates[i]);
        let endFound = itemArray.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? itemArray.length : startFound; // last column counts to now
        endFound = endFound == -1 ? itemArray.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += itemArray[j][k + 1];
        }
        itemsTable.push(runningTotal);
    }
    for (let i = 1; i < itemElements.length; i++) {
        itemElements[i].innerHTML = itemsTable[i - 1][0];
        itemradElements[i].innerHTML = itemsTable[i - 1][1];
        itemkanjiElements[i].innerHTML = itemsTable[i - 1][2];
        itemvocabElements[i].innerHTML = itemsTable[i - 1][3];
    }
    // accuracy
    var accTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = midreviewAccuracy.findIndex(element => element[0] >= dates[i]);
        let endFound = midreviewAccuracy.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? midreviewAccuracy.length : startFound; // last column counts to now
        endFound = endFound == -1 ? midreviewAccuracy.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        let runningAmount = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += midreviewAccuracy[j][k + 1][1];
            for (let k = 0; k < 4; k++) runningAmount[k] += midreviewAccuracy[j][k + 1][0];
        }
        for (let k = 0; k < 4; k++) runningTotal[k] = runningAmount[k] == 0 ? "-" : roundToDecimals((1 - runningAmount[k] / runningTotal[k]) * 100, 2, true);
        accTable.push([...runningTotal]);
    }
    for (let i = 1; i < accElements.length; i++) {
        accElements[i].innerHTML = accTable[i - 1][3];
        accradElements[i].innerHTML = accTable[i - 1][0];
        acckanjiElements[i].innerHTML = accTable[i - 1][1];
        accvocabElements[i].innerHTML = accTable[i - 1][2];
    }
    // reading accuracy
    var readaccTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = readingAccuracy.findIndex(element => element[0] >= dates[i]);
        let endFound = readingAccuracy.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? readingAccuracy.length : startFound; // last column counts to now
        endFound = endFound == -1 ? readingAccuracy.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        let runningAmount = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += readingAccuracy[j][k + 1][1];
            for (let k = 0; k < 4; k++) runningAmount[k] += readingAccuracy[j][k + 1][0];
        }
        for (let k = 0; k < 4; k++) runningTotal[k] = runningAmount[k] == 0 ? "-" : roundToDecimals((1 - runningAmount[k] / runningTotal[k]) * 100, 2, true);
        readaccTable.push([...runningTotal]);
    }
    for (let i = 1; i < readaccElements.length; i++) {
        readaccElements[i].innerHTML = readaccTable[i - 1][3];
        readaccradElements[i].innerHTML = readaccTable[i - 1][0];
        readacckanjiElements[i].innerHTML = readaccTable[i - 1][1];
        readaccvocabElements[i].innerHTML = readaccTable[i - 1][2];
    }
    // meaning accuracy
    var meanaccTable = [];
    for (let i = 0; i < dateAmount; i++) {
        let startFound = meaningAccuracy.findIndex(element => element[0] >= dates[i]);
        let endFound = meaningAccuracy.findIndex(element => element[0] >= dates[i + 1]);
        startFound = startFound == -1 ? meaningAccuracy.length : startFound; // last column counts to now
        endFound = endFound == -1 ? meaningAccuracy.length : endFound; // last column counts to now
        let runningTotal = [0, 0, 0, 0];
        let runningAmount = [0, 0, 0, 0];
        for (let j = startFound; j < endFound; j++) {
            for (let k = 0; k < 4; k++) runningTotal[k] += meaningAccuracy[j][k + 1][1];
            for (let k = 0; k < 4; k++) runningAmount[k] += meaningAccuracy[j][k + 1][0];
        }
        for (let k = 0; k < 4; k++) runningTotal[k] = runningAmount[k] == 0 ? "-" : roundToDecimals((1 - runningAmount[k] / runningTotal[k]) * 100, 2, true);
        meanaccTable.push([...runningTotal]);
    }
    for (let i = 1; i < meanaccElements.length; i++) {
        meanaccElements[i].innerHTML = meanaccTable[i - 1][3];
        meanaccradElements[i].innerHTML = meanaccTable[i - 1][0];
        meanacckanjiElements[i].innerHTML = meanaccTable[i - 1][1];
        meanaccvocabElements[i].innerHTML = meanaccTable[i - 1][2];
    }
}

async function overviewInfo() {
    let today = dateNoTime(new Date()),
        yesterday = dateNoTime(new Date());
    yesterday.setDate(yesterday.getDate() - 1);

    // level
    document.getElementById("levelOv").innerHTML = userData["level"];
    if (userData["level"] == 60) document.getElementById("levelOv").style.color = "#f0ca00";
    document.getElementById("levelStageOv").innerHTML = levelStages[Math.floor((userData["level"] - 1) / 10)];

    // time on level
    let timeOnLevel = combLevelChart[combLevelChart.length - 1][1],
        timeLevelUp = (projectionsData[userData['level'] < 60 ? userData['level'] + 1 : 62][6] - new Date()) / (1000 * 60 * 60 * 24);
    document.getElementById("levelTimeOv").innerHTML = daysToDurationString(timeOnLevel, true, false);
    document.getElementById("levelTimeOv").style.color = timeOnLevel <= levelChart[1][6] ? "#55af55" : "#af5555";
    document.getElementById("levelUpTimeOv").innerHTML = userData['level'] >= 60 ? "Predicted 全火 in " + daysToDurationString(timeLevelUp, true, true) : "Predicted Level Up " + (timeLevelUp > 0 ? "in " + daysToDurationString(timeLevelUp, true, true) : daysToDurationString(-timeLevelUp, true, true) + " ago");

    // accuracy
    let accToday = midreviewAccuracy.slice(1).find(e => e[0].getTime() == today.getTime()),
        accYesterday = midreviewAccuracy.slice(1).find(e => e[0].getTime() == yesterday.getTime());
    accToday = accToday === undefined ? null : (1 - accToday[4][0] / accToday[4][1]) * 100;
    accYesterday = accYesterday === undefined ? null : (1 - accYesterday[4][0] / accYesterday[4][1]) * 100;
    document.getElementById("accuracyOv").innerHTML = (accToday === null ? "-" : accToday.toFixed(1) + "%");
    document.getElementById("accuracyOv").style.color = accToday >= accYesterday ? "#55af55" : "#af5555";
    document.getElementById("accuracyHistOv").innerHTML = "Yesterday: " + (accYesterday === null ? "-" : accYesterday.toFixed(1) + "%");

    // time spent
    let timeToday = timeData.slice(1).find(e => e[0].getTime() == today.getTime()),
        timeYesterday = timeData.slice(1).find(e => e[0].getTime() == yesterday.getTime());
    timeToday = timeToday === undefined ? 0 : timeToday[3][0];
    timeYesterday = timeYesterday === undefined ? 0 : timeYesterday[3][0];
    document.getElementById("timeOv").innerHTML = minsToDurationString(timeToday, false, false);
    document.getElementById("timeOv").style.color = timeToday >= timeYesterday ? "#55af55" : "#af5555";
    document.getElementById("timeHistOv").innerHTML = "Yesterday: " + minsToDurationString(timeYesterday, false, false);

    // reviews
    let reviewToday = reviewArray.slice(1).find(e => e[0].getTime() == today.getTime()),
        reviewYesterday = reviewArray.slice(1).find(e => e[0].getTime() == yesterday.getTime());
    reviewToday = reviewToday === undefined ? 0 : reviewToday[1];
    reviewYesterday = reviewYesterday === undefined ? 0 : reviewYesterday[1];
    document.getElementById("reviewOv").innerHTML = reviewToday;
    document.getElementById("reviewOv").style.color = reviewToday >= reviewYesterday ? "#55af55" : "#af5555";
    document.getElementById("reviewHistOv").innerHTML = "Yesterday: " + reviewYesterday;
}

async function updateReviewAccuracy() {
    var dayAverage = smoothAccInp.value;
    let smoothBool = (dayAverage != 0);
    if (!smoothBool) dayAverage = 1;
    let shortBool = newdateche.checked;
    let startDate = new Date(newdateinp.value);
    var averageArray = [["Date", "Avg Radical Correct", "Avg Kanji Correct", "Avg Vocab Correct", "Avg All Correct"]];
    // array
    var currentArray = shortBool ? dataDateShorten(reviewAccuracy, startDate) : reviewAccuracy;
    var currentAccTotal = shortBool ? dataDateShorten(reviewAccTotal, startDate) : reviewAccTotal;
    var runningTotal = [0, 0, 0, 0];
    var runningAmount = [0, 0, 0, 0];
    var average = [0, 0, 0, 0];
    var prevAvg = [100, 100, 100, 100];
    for (let i = 1; i < currentArray.length; i++) {
        for (let j = 0; j < runningTotal.length; j++) { runningTotal[j] += currentArray[i][j + 1] * currentAccTotal[i - 1][j]; runningAmount[j] += currentAccTotal[i - 1][j]; }
        if (i > dayAverage) {
            for (let j = 0; j < 4; j++) runningTotal[j] -= currentArray[i - dayAverage][j + 1] * currentAccTotal[i - 1 - dayAverage][j];
            for (let j = 0; j < 4; j++) runningAmount[j] -= currentAccTotal[i - 1 - dayAverage][j];
        }
        for (let j = 0; j < 4; j++) average[j] = runningAmount[j] == 0 ? prevAvg[j] : runningTotal[j] / runningAmount[j];
        prevAvg = average.slice();
        averageArray.push([currentArray[i][0],
        '<div style="white-space: nowrap; margin: 8px"><div style="font-weight: bold; margin-bottom: 5px">' + dateLongFormat(currentArray[i][0]) + '</div>'
        + '<div><b>Total:</b> ' + roundToDecimals(average[3], 2) + ' (' + runningAmount[3] + ')</div>'
        + '<div style="color: dodgerblue"><b>Radical:</b> ' + roundToDecimals(average[0], 2) + ' (' + runningAmount[0] + ')</div>'
        + '<div style="color: hotpink"><b>Kanji:</b> ' + roundToDecimals(average[1], 2) + ' (' + runningAmount[1] + ')</div>'
        + '<div style="color: mediumpurple"><b>Vocab:</b> ' + roundToDecimals(average[2], 2) + ' (' + runningAmount[2] + ')</div>'
        + '</div>',
        ...average]);
    }
    var averageArrays = [[[["Date", "Avg Radical Acc", "Avg Kanji Acc", "Avg Vocab Acc", "Avg All Acc"]], midreviewAccuracy],
    [[["Date", "Avg Radical Reading Acc", "Avg Kanji Reading Acc", "Avg Vocab Reading Acc", "Avg All Reading Acc"]], meaningAccuracy],
    [[["Date", "Avg Radical Meaning Acc", "Avg Kanji Meaning Acc", "Avg Vocab Meaning Acc", "Avg All Meaning Acc"]], readingAccuracy]];
    for (let k = 0; k < 3; k++) {
        var currentArray = shortBool ? dataDateShorten(averageArrays[k][1], startDate) : averageArrays[k][1];
        var runningTotal = [0, 0, 0, 0];
        var runningAmount = [0, 0, 0, 0];
        var average = [0, 0, 0, 0];
        var prevAvg = [100, 100, 100, 100];
        for (let i = 1; i < currentArray.length; i++) {
            for (let j = 0; j < runningTotal.length; j++) { runningTotal[j] += currentArray[i][j + 1][0]; runningAmount[j] += currentArray[i][j + 1][1]; }
            if (i > dayAverage) {
                for (let j = 0; j < 4; j++) runningTotal[j] -= currentArray[i - dayAverage][j + 1][0];
                for (let j = 0; j < 4; j++) runningAmount[j] -= currentArray[i - dayAverage][j + 1][1];
            }
            for (let j = 0; j < 4; j++) average[j] = runningAmount[j] == 0 ? prevAvg[j] : (1 - runningTotal[j] / runningAmount[j]) * 100;
            prevAvg = average.slice();
            averageArrays[k][0].push([currentArray[i][0],
            '<div style="white-space: nowrap; margin: 8px"><div style="font-weight: bold; margin-bottom: 5px">' + dateLongFormat(currentArray[i][0]) + '</div>'
            + '<div><b>Total:</b> ' + roundToDecimals(average[3], 2) + ' (' + runningAmount[3] + ')</div>'
            + (k == 2 ? '' : '<div style="color: dodgerblue"><b>Radical:</b> ' + roundToDecimals(average[0], 2) + ' (' + runningAmount[0] + ')</div>')
            + '<div style="color: hotpink"><b>Kanji:</b> ' + roundToDecimals(average[1], 2) + ' (' + runningAmount[1] + ')</div>'
            + '<div style="color: mediumpurple"><b>Vocab:</b> ' + roundToDecimals(average[2], 2) + ' (' + runningAmount[2] + ')</div>'
            + '</div>',
            ...average]);
        }
    }
    // tooltip and no radical for reading
    for (let k = 0; k < 3; k++) averageArrays[k][0][0].splice(1, 0, { role: 'tooltip', 'p': { 'html': true } });
    averageArray[0].splice(1, 0, { role: 'tooltip', 'p': { 'html': true } });
    var currentAccuracyArray = averageArrays[0][0], currentMeaningArray = averageArrays[1][0], currentReadingArray = averageArrays[2][0];
    for (let i = 0; i < currentReadingArray.length; i++) currentReadingArray[i].splice(2, 1);
    // review accuracy
    var accData = dataDateShorten(currentAccuracyArray, startDate);
    var accChartData = google.visualization.arrayToDataTable(accData);
    var dateFormatter = new google.visualization.DateFormat({ pattern: "MMM dd yyyy" });
    dateFormatter.format(accChartData, 0);
    var options = {
        chartArea: { width: '80%', height: '80%' },
        title: 'Review Accuracy' + (smoothBool ? ' (Averaged over ' + dayAverage + ' days)' : ''),
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: {
                max: 100
            }
        },
        colors: ['#55abf2', '#f032b1', '#bb31de', 'black'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var accChart = new google.visualization.LineChart(document.getElementById('accuracychart'));
    accChart.draw(accChartData, options);
    google.visualization.events.addListener(accChart, 'select', function () { chartSelectionSetter(accChart); });
    // meaning accuracy
    var meanChartData = google.visualization.arrayToDataTable(dataDateShorten(currentMeaningArray, startDate));
    dateFormatter.format(meanChartData, 0);
    var options = {
        chartArea: { width: '80%', height: '80%' },
        title: 'Review Meaning Accuracy' + (smoothBool ? ' (Averaged over ' + dayAverage + ' days)' : ''),
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: {
                max: 100
            }
        },
        colors: ['#55abf2', '#f032b1', '#bb31de', 'black'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var meanChart = new google.visualization.LineChart(document.getElementById('meanaccchart'));
    meanChart.draw(meanChartData, options);
    google.visualization.events.addListener(meanChart, 'select', function () { chartSelectionSetter(meanChart); });
    // reading accuracy
    var readChartData = google.visualization.arrayToDataTable(dataDateShorten(currentReadingArray, startDate));
    dateFormatter.format(readChartData, 0);
    var options = {
        chartArea: { width: '80%', height: '80%' },
        title: 'Review Reading Accuracy' + (smoothBool ? ' (Averaged over ' + dayAverage + ' days)' : ''),
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: {
                max: 100
            }
        },
        colors: ['#f032b1', '#bb31de', 'black'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var readChart = new google.visualization.LineChart(document.getElementById('readaccchart'));
    readChart.draw(readChartData, options);
    google.visualization.events.addListener(readChart, 'select', function () { chartSelectionSetter(readChart); });
    // review "correctness"
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(averageArray, startDate));
    dateFormatter.format(chartData, 0);
    var options = {
        chartArea: { width: '80%', height: '80%' },
        title: 'Review Percentage Correct Items' + (smoothBool ? ' (Averaged over ' + dayAverage + ' days)' : ''),
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: {
                max: 100
            }
        },
        colors: ['#55abf2', '#f032b1', '#bb31de', 'black'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var corChart = new google.visualization.LineChart(document.getElementById('percentagechart'));
    corChart.draw(chartData, options);
    google.visualization.events.addListener(corChart, 'select', function () { chartSelectionSetter(corChart); });
}

async function updateReviewsPerDay() {
    const dayAverage = smoothInp.value;
    let smoothBool = (dayAverage != 0);
    // array
    if (smoothBool) {
        let runningTotal = [0, 0, 0, 0];
        averageArray = [["Date", "Average Reviews", "Average Radicals", "Average Kanji", "Average Vocab"]];
        var average = [0, 0, 0, 0];
        for (let i = 1; i < reviewArray.length; i++) {
            for (let j = 0; j < 4; j++) runningTotal[j] += reviewArray[i][j + 1];
            if (i > dayAverage) {
                for (let j = 0; j < 4; j++) runningTotal[j] -= reviewArray[i - dayAverage][j + 1];
                for (let j = 0; j < 4; j++) average[j] = runningTotal[j] / dayAverage;
            } else for (let j = 0; j < 4; j++) average[j] = runningTotal[j] / i;
            for (let j = 0; j < 4; j++) average[j] = parseInt(average[j]);
            averageArray.push([reviewArray[i][0], ...average]);
        }
    }
    // timeframe
    let startDate = new Date(newdateinp.value);
    // reviews per day
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(smoothBool ? averageArray : reviewArray, startDate));
    var dateFormatter = new google.visualization.DateFormat({ pattern: "MMM dd yyyy" });
    dateFormatter.format(chartData, 0);
    var options = {
        chartArea: { width: '90%', height: '85%' },
        title: 'Reviews Per Day' + (smoothBool ? ' (Averaged over ' + dayAverage + ' days)' : ''),
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: { min: 0 }
        },
        colors: ['black', '#55abf2', '#f032b1', '#bb31de'],
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var chartDiv = document.getElementById('reviewchart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    google.visualization.events.addListener(chart, 'select', function () { chartSelectionSetter(chart); });
}

function median(values) {
    if (values.length === 0) return 0;

    values.sort(function (a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

function movingAverage(arr, mvgRange) {
    var avgArr = [];
    let mvgAvg = 0, n = Math.max(mvgRange, 1);
    for (let i = 0; i < arr.length; i++) {
        mvgAvg += arr[i][1];
        if (i >= n) {
            mvgAvg -= arr[i - n][1];
            avgArr.push([arr[i][0], Math.abs(mvgAvg / n)]);
        } else avgArr.push([arr[i][0], Math.abs(mvgAvg / (i + 1))]);
    }
    return avgArr;
}

async function levelInfo() {
    // format level data
    if (resets.length == 0) levelResetsBox.parentElement.style.display = "none";
    else levelResetsBox.parentElement.style.display = "block";
    levelChart = [["Level", "Level-Up Days", { role: 'style' }, { role: "tooltip", 'p': { 'html': true } }, "Pure Vocab Days", { role: "tooltip", 'p': { 'html': true } }, "Median", { role: "tooltip", 'p': { 'html': true } }]];
    pureLevelChart = [levelChart[0].slice()];
    combLevelChart = [["Level", "Level-Up Days", { role: 'style' }, { role: "tooltip", 'p': { 'html': true } }, "Median", { role: "tooltip", 'p': { 'html': true } }]];
    combPureLevelChart = [combLevelChart[0].slice()];
    levelDates = [];
    var extraTime = [];
    var combHoverTexts = [];
    levelLengths = [];
    var currentLevel = levelData[0];
    const currentLevelColor = "grey";
    var j = 0;
    var level;
    while (currentLevel != null) {
        level = currentLevel["data"]["level"];
        let dateBefore = currentLevel["data"]["started_at"] == null ? new Date(currentLevel["data"]["unlocked_at"]) : new Date(currentLevel["data"]["started_at"]);
        let pureVocabTime = dateBefore == null ? 0 : Math.abs((dateBefore - new Date(currentLevel["data"]["unlocked_at"])) / (3600000 * 24));
        pureVocabTime = pureVocabTime > 19000 ? 0 : pureVocabTime;
        extraTime.push(pureVocabTime);
        let after = currentLevel["data"]["passed_at"] == null ? currentLevel["data"]["abandoned_at"] : currentLevel["data"]["passed_at"], dateAfter;
        if (after != null) {
            dateAfter = new Date(after);
        } else {
            dateAfter = new Date(Date.now());
        }
        let length = (dateAfter.getTime() - dateBefore.getTime()) / (3600000 * 24);
        length = length > 19000 ? 0 : length;
        if (level != userData["level"]) {
            levelLengths.push(length);
            levelLengths[levelLengths.length - 1] += pureVocabTime;
            var primaryTime, secondaryTime;
            if (shortLevels.includes(level)) { primaryTime = 3.7; secondaryTime = 4.2; }
            else { primaryTime = 7; secondaryTime = 8; }
            combHoverTexts.push("<div style='margin: 5px; margin-top: 10px'>" + fixHtml("<b>Started:</b> ") + dateLongFormat(new Date(currentLevel["data"]["unlocked_at"])) + "</div>" + "<div style='margin: 5px'>" + fixHtml("<b>Finished:</b> ") + dateLongFormat(dateAfter) + "</div>");
            levelDates.push([level, new Date(currentLevel["data"]["unlocked_at"]), dateAfter]);
            let hoverText = "<div style='margin: 5px; margin-top: 10px'>" + fixHtml("<b>Started:</b> ") + dateLongFormat(dateBefore) + "</div>" + "<div style='margin: 5px'>" + fixHtml("<b>Finished:</b> ") + dateLongFormat(dateAfter) + "</div>";
            if (length < primaryTime) {
                levelChart.push([String(level), length, '#EEBC1D', hoverText, 0, ""]); //darkgold
            } else if (length < secondaryTime) {
                levelChart.push([String(level), length, 'plum', hoverText, 0, ""]);
            } else {
                levelChart.push([String(level), length, '#55a2e6', hoverText, 0, ""]); //sky blue
            }
        } else {
            levelChart.push([String(level), length, currentLevelColor, "<div style='margin: 5px; margin-top: 10px'>" + fixHtml("<b>Started:</b> ") + dateLongFormat(dateBefore) + "</div>", 0, ""]);
            levelDates.push([level, new Date(currentLevel["data"]["unlocked_at"]), dateAfter]);
            levelLengths.push(length);
            levelLengths[levelLengths.length - 1] += pureVocabTime;
        }
        j++;
        currentLevel = levelData[j];
    }

    // reset level handling
    levelLengths.splice(-1);
    var resetIndex = 1;
    for (let i = 0; i < resets.length; i++) {
        let endIndex = levelChart.slice(resetIndex).findIndex(element => (element[0].slice(-1) == "R" ? element[0].slice(0, -1) : element[0]) == String(resets[i][0] + resets[i][1])) + resetIndex;
        let startIndex = endIndex - levelChart.slice(0, endIndex + 1).reverse().findIndex(element => element[0] == String(resets[i][0]));
        for (let j = startIndex; j <= endIndex; j++) {
            if (levelChart[j][0].slice(-1) != "R") levelChart[j][0] += "R";
            levelChart[j][2] = "lightsalmon";
            levelLengths[j - 1] = -1;
            let sameLevelElement = levelDates.find(element => element[1].getTime() != levelDates[j - 1][1].getTime() && element[0] == levelDates[j - 1][0]);
            if (sameLevelElement != undefined) sameLevelElement.push(...[levelDates[j - 1].slice(), "R"]);
            levelDates[j - 1] = [-1, new Date()];
        }
        resetIndex = endIndex + 1;
    }
    levelDates.splice(-1);

    levelLengths = levelLengths.reverse();
    for (let i = levelLengths.length - 1; i >= 0; i--) if (levelLengths[i] == -1) levelLengths.splice(i, 1);
    levelDates = levelDates.reverse();
    for (let i = levelDates.length - 1; i >= 0; i--) if (levelDates[i][0] == -1) levelDates.splice(i, 1);
    levelDates = levelDates.reverse();

    // pure vocab time
    extraTime.splice(0, 1);
    for (let i = 0; i < extraTime.length; i++) levelChart[i + 1][4] = extraTime[i];
    // median
    let medianVal = median(levelLengths);
    for (let i = 1; i < levelChart.length; i++) { levelChart[i].push(medianVal); levelChart[i].push("<div style='margin: 5px; white-space: nowrap'>" + fixHtml("<b>Median: ") + daysToDurationString(medianVal, true) + "</div>"); }
    // level chart without pure vocab time
    for (let i = 1; i < levelChart.length; i++) {
        let item = levelChart[i].slice();
        item[1] += i != 1 ? levelChart[i - 1][4] : 0;
        item[3] = combHoverTexts[i - 1] == undefined ? "" : combHoverTexts[i - 1];
        item.splice(4, 2);
        combLevelChart.push(item);
    }
    // level chart without reset levels
    if (resets.length != 0) {
        for (let i = 1; i < levelChart.length; i++) if (levelChart[i][0].slice(-1) != "R") pureLevelChart.push(levelChart[i].slice());
        for (let i = 1; i < combLevelChart.length; i++) if (combLevelChart[i][0].slice(-1) != "R") combPureLevelChart.push(combLevelChart[i].slice());
    }

    // tooltips
    for (let i = 1; i < levelChart.length; i++) {
        let level = (levelChart[i][0].slice(-1) == "R" ? levelChart[i][0].slice(0, -1) + " (Reset)" : levelChart[i][0]) + (levelChart[i][2] == currentLevelColor ? " (Current)" : "");
        levelChart[i][3] = "<div style='white-space: nowrap; margin: 5px; color: " + levelChart[i][2] + "'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Time Spent:</i> " + daysToDurationString(levelChart[i][1], true) + "</div>" + levelChart[i][3];
        levelChart[i][5] = "<div style='white-space: nowrap; margin: 5px'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Pure Vocab Time:</i> " + daysToDurationString(levelChart[i][4], true) + "</div>";
        combLevelChart[i][3] = "<div style='white-space: nowrap; margin: 5px; color: " + combLevelChart[i][2] + "'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Time Spent:</i> " + daysToDurationString(combLevelChart[i][1], true) + "</div>" + combLevelChart[i][3];
    }
    for (let i = 1; i < pureLevelChart.length; i++) {
        let level = pureLevelChart[i][0] + (pureLevelChart[i][2] == currentLevelColor ? " (Current)" : "");
        pureLevelChart[i][3] = "<div style='white-space: nowrap; margin: 5px; color: " + pureLevelChart[i][2] + "'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Time Spent:</i> " + daysToDurationString(pureLevelChart[i][1], true) + "</div>" + pureLevelChart[i][3];
        pureLevelChart[i][5] = "<div style='white-space: nowrap; margin: 5px'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Pure Vocab Time:</i> " + daysToDurationString(pureLevelChart[i][4], true) + "</div>";
        combPureLevelChart[i][3] = "<div style='white-space: nowrap; margin: 5px; color: " + combPureLevelChart[i][2] + "'><b>Level " + level + "</b></div><div style='white-space: nowrap; margin: 5px'><i>Time Spent:</i> " + daysToDurationString(combPureLevelChart[i][1], true) + "</div>" + combPureLevelChart[i][3];
    }

    // level chart
    updateLevelChart();
    updateSimpleProjections();
}

function updateSimpleProjections() {
    const speedBool = projSpeedBox.checked;
    const level = userData["level"];
    var time = levelLengths.reduce((partialSum, a) => partialSum + a, 0);
    let averageVal = time / levelLengths.length;
    let medianVal = median(levelLengths);
    var average, medianPro;
    if (speedBool) {
        average = level > shortLevels[0] ? parseInt(averageVal * (60 - level) / 2) : parseInt(averageVal * ((60 - shortLevels.length / 2) - level)); // extrapolating average time until now
        medianPro = level > shortLevels[0] ? parseInt(medianVal * (60 - level) / 2) : parseInt(medianVal * ((60 - shortLevels.length / 2) - level)); // levels 46, 47, 49, 50-60 half as long
    } else {
        average = averageVal * (60 - level);
        medianPro = medianVal * (60 - level);
    }
    var lbl = document.getElementById("future");
    lbl.innerHTML = fixHtml("<b>Median Level-Up: ") + daysToDurationString(medianVal, true) + "\n"
        + " => level 60 in " + daysToDurationString(medianPro < 0 ? 0 : medianPro) + "\n"
        + fixHtml("<b>Mean Level-Up: ") + daysToDurationString(averageVal, averageVal < 365 ? true : false) + "\n"
        + " => level 60 in " + daysToDurationString(average < 0 ? 0 : average);
}

function daysToDurationString(x, includeHours = false, short = false) {
    let days = Math.floor(x);
    let rest = x - days;
    let months = Math.floor(days / 30);
    days = days - months * 30;
    let years = Math.floor(months / 12);
    months = months - years * 12;
    let returnString = "";
    returnString += short ? (years != 0 ? years + "y" : "") + (months != 0 ? months + "m" : "") + days + "d" : (years != 0 ? years + (years == 1 ? " year, " : " years, ") : "") + (months != 0 ? months + (months == 1 ? " month, " : " months, ") : "") + days + (days == 1 ? " day" : " days");
    if (includeHours) {
        let hours = Math.floor(rest * 24);
        returnString += short ? hours + "h" : ", " + hours + (hours == 1 ? " hour" : " hours");
    }
    return returnString;
}

function minsToDurationString(x, includeSeconds = false, short = false) {
    let mins = Math.floor(x);
    let rest = x - mins;
    let hours = Math.floor(mins / 60);
    mins = mins - hours * 60;
    let returnString = "";
    returnString += short ? (hours != 0 ? hours + "h" : "") + (mins == 0 ? "" : mins + "m") : (hours != 0 ? hours + (hours == 1 ? " hour, " : " hours, ") : "") + (mins == 0 ? "" : mins + (mins == 1 ? " min" : " mins"));
    if (includeSeconds) {
        let secs = Math.floor(rest * 60);
        returnString += secs == 0 ? "" : (short ? secs + "s" : (mins == 0 ? "" : ", ") + secs + (secs == 1 ? " sec" : " secs"));
    }
    if (returnString == "") return short ? "0m" : "0 mins";
    return returnString;
}

function updateLevelChart() {
    const resetBool = levelResetsBox.checked; const clampBool = levelClampBox.checked; const combBool = levelCombBox.checked;
    let currentLevelChart = resetBool && pureLevelChart.length > 1 ? (combBool ? combPureLevelChart : pureLevelChart) : (combBool ? combLevelChart : levelChart);
    if (!levelMedianBox.checked) currentLevelChart = currentLevelChart.map(arr => arr.slice(0, -2));
    const medianVal = levelChart[1][6];
    let maxLength = currentLevelChart.slice(1).reduce(function (p, v) { return (v[1] + (combBool ? 0 : v[4]) > p[1] + (combBool ? 0 : p[4]) ? v : p); });
    maxLength = maxLength[1] + (combBool ? 0 : maxLength[4]);
    let newChartData = new google.visualization.arrayToDataTable(currentLevelChart);
    const NumberFormat = new google.visualization.NumberFormat({ pattern: '##.#' });
    NumberFormat.format(newChartData, 1);
    NumberFormat.format(newChartData, 3);
    let chartSeries = combBool ? { 1: { type: 'line', color: 'black' } } : { 1: { color: 'lightgrey' }, 2: { type: 'line', color: 'black' } };
    var options = {
        bar: { groupWidth: "95%" },
        legend: { position: "none" },
        width: 1000,
        height: 333,
        vAxis: {
            viewWindow: {
                max: clampBool ? maxLength + 1 : (maxLength < medianVal * 2 ? medianVal * 2 : (maxLength < medianVal * 3 ? medianVal * 3 : medianVal * 4))
            }
        },
        seriesType: 'bars',
        isStacked: combBool ? 'false' : 'true',
        tooltip: { isHtml: true },
        backgroundColor: { fill: 'transparent' },
        series: chartSeries
    };
    var chartDiv = document.getElementById('leveltimechart');
    var chart = new google.visualization.ComboChart(chartDiv);
    chart.draw(newChartData, options);
}

function changeYojijukugoRandom() {
    currentPage = Math.floor(Math.random() * possibleYojijukugo.length) + 1;
    changeYojijukugo(0);
}

function changeYojijukugo(page) {
    currentPage += page;
    if (currentPage > possibleYojijukugo.length) {
        currentPage = possibleYojijukugo.length;
        return;
    } else if (currentPage < 1) {
        currentPage = 1;
        return;
    }
    document.getElementById("yojijukugoword").innerHTML = possibleYojijukugo[currentPage - 1][1] + document.getElementById("yojijukugoword").innerHTML.slice(4);
    document.getElementById("yojijukugofurigana").innerHTML = possibleYojijukugo[currentPage - 1][2];
    var meanings = document.getElementById("yojijukugomeaning");
    meanings.textContent = "";
    for (var i = 0; i < possibleYojijukugo[currentPage - 1][4].length; i++) {
        var item = document.createElement('li');
        item.appendChild(document.createTextNode(possibleYojijukugo[currentPage - 1][4][i]));
        meanings.appendChild(item);
    }
    document.getElementById("yojijukugopage").innerHTML = currentPage + "/" + possibleYojijukugo.length + " ";
}

async function wordInfo() {
    for (const div of wordAll) div.style.display = "block";
    if (reviewData.length == 0) { for (const div of wordAll) div.style.display = "none"; return; }
    var kd;
    var doneCounts = [0, 0, 0];
    kanjiWall = "";
    var specialKanjiWall = "";
    var kanjiColors = ['#d128bd', '#9735cc', '#353dcc', '#359fcc', '#f0ca00']; // burned is gold
    var wordBubble = [["Meaning", "Reading", { role: "style" }, { role: "tooltip", 'p': { 'html': true } }]];
    var radBubble = [["Accuracy", "Level", { role: "style" }, { role: "tooltip", 'p': { 'html': true } }]];
    var kanjiInterpolator = d3.interpolateRgb("#FFC3D4", "#A26174 ");
    var radicalInterpolator = d3.interpolateRgb("lightblue", "darkblue");
    var vocabInterpolator = d3.interpolateRgb("#D5BAFF", "#6733B4");
    var bestWords = [[-1, 0, 1, 0, 0, 0, 0], [-1, 0, 1, 0, 0, 0, 0], [-1, 0, 1, 0, 0, 0, 0], [-1, 0, 1, 0, 0, 0, 0], [-1, 0, 1, 0, 0, 0, 0]];
    var worstWords = [[2, 0, 1, 0, 0, 0, 0], [2, 0, 1, 0, 0, 0, 0], [2, 0, 1, 0, 0, 0, 0], [2, 0, 1, 0, 0, 0, 0], [2, 0, 1, 0, 0, 0, 0]];
    var bestWordsR = [[-1, 0, 1, 0, 0, 0], [-1, 0, 1, 0, 0, 0], [-1, 0, 1, 0, 0, 0], [-1, 0, 1, 0, 0, 0], [-1, 0, 1, 0, 0, 0]];
    var worstWordsR = [[2, 0, 1, 0, 0, 0], [2, 0, 1, 0, 0, 0], [2, 0, 1, 0, 0, 0], [2, 0, 1, 0, 0, 0], [2, 0, 1, 0, 0, 0]];
    var bestWordsK = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsK = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsV = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsV = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var type;
    var id;
    var cor;
    var inc;
    var used = [];
    for (let i = 0; i < wordData.length; i++) {
        let currentData = wordData[i];
        currentData = currentData["data"];
        id = currentData["subject_id"];
        if (used.findIndex(element => (element == id)) != -1) continue;
        else used.push(id);
        cor = currentData["meaning_correct"] + currentData["reading_correct"];
        inc = currentData["meaning_incorrect"] + currentData["reading_incorrect"];
        if (cor == 0 && inc == 0) continue;
        let kdHun = currentData["percentage_correct"];
        kd = kdHun / 100;
        let kdWeight = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"] + 0.001) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"] + 0.001)) / 2;
        let name = subjectData[id]["data"]["characters"];
        if (name == null) name = subjectData[id]["data"]["slug"];
        type = currentData["subject_type"];
        let interpolator = type == "vocabulary" ? vocabInterpolator : (type == "kanji" ? kanjiInterpolator : radicalInterpolator);
        if (type != "radical") {
            let meaningPer = parseInt(currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"]) * 300) / 3;
            let readingPer = parseInt(currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"]) * 300) / 3;
            let levelPer = subjectData[id]["data"]["level"] / userData["level"];
            let color = interpolator(levelPer < 1 ? levelPer : 1);
            let wordFound = wordBubble.findIndex(element => element[0] == meaningPer && element[1] == readingPer);
            if (wordFound == -1) {
                wordBubble.push([meaningPer, readingPer, color, "<div style='overflow-y: auto; overflow-x: hidden; white-space: nowrap; max-height: 100px; margin: 5px'>"]);
                wordFound = wordBubble.length - 1;
            }
            wordBubble[wordFound][3] += "<a href='http://wanikani.com/" + type + "/" + name + "' target='_blank' style='text-decoration: none; color: " + color + "'><div style='white-space: nowrap; margin-right: 5px'>" + name + " (Lvl " + subjectData[id]["data"]["level"] + ")" + "</div></a>";
        } else {
            let currentKd = kdHun;
            let amount = parseInt((cor + inc) / 3) * 3;
            let radFound = radBubble.findIndex(element => element[0] == currentKd && element[1] == amount);
            let color = interpolator(subjectData[id]["data"]["level"] / userData["level"]);
            if (radFound == -1) {
                radBubble.push([currentKd, amount, color, "<div style='overflow-y: auto; overflow-x: hidden; white-space: nowrap; max-height: 100px; margin: 5px'>"]);
                radFound = radBubble.length - 1;
            }
            radBubble[radFound][3] += "<a href='http://wanikani.com/radicals/" + subjectData[id]["data"]["slug"] + "' target='_blank' style='text-decoration: none; color: " + color + "'><div style='white-space: nowrap; margin-right: 5px'>" + name + " " + kdHun + "% (" + (cor + inc) + ", Lvl " + subjectData[id]["data"]["level"] + ")" + "</div>";
        }
        let foundBest = bestWords.findIndex(element => (element[0] < kdWeight));
        let foundWorst = worstWords.findIndex(element => (element[0] > kdWeight));
        let foundBestR = bestWordsR.findIndex(element => (element[0] < kdWeight));
        let foundWorstR = worstWordsR.findIndex(element => (element[0] > kdWeight));
        let foundBestK = bestWordsK.findIndex(element => (element[0] < kdWeight));
        let foundWorstK = worstWordsK.findIndex(element => (element[0] > kdWeight));
        let foundBestV = bestWordsV.findIndex(element => (element[0] < kdWeight));
        let foundWorstV = worstWordsV.findIndex(element => (element[0] > kdWeight));
        if (foundBest != -1) {
            bestWords[foundBest] = [kdWeight, kd, name, cor, inc, subjectData[id]["data"]["slug"], type];
        }
        if (type == "radical" && foundBestR != -1) {
            bestWordsR[foundBestR] = [kdWeight, kd, name, cor, inc, subjectData[id]["data"]["slug"]];
        } else if (type == "kanji" && foundBestK != -1) {
            bestWordsK[foundBestK] = [kdWeight, kd, name, cor, inc];
        } else if (type == "vocabulary" && foundBestV != -1) {
            bestWordsV[foundBestV] = [kdWeight, kd, name, cor, inc];
        }
        if (foundWorst != -1) {
            worstWords[foundWorst] = [kdWeight, kd, name, cor, inc, subjectData[id]["data"]["slug"], type];
        }
        if (type == "radical" && foundWorstR != -1) {
            worstWordsR[foundWorstR] = [kdWeight, kd, name, cor, inc, subjectData[id]["data"]["slug"]];
        } else if (type == "kanji" && foundWorstK != -1) {
            worstWordsK[foundWorstK] = [kdWeight, kd, name, cor, inc];
        } else if (type == "vocabulary" && foundWorstV != -1) {
            worstWordsV[foundWorstV] = [kdWeight, kd, name, cor, inc];
        }
        switch (type) { // count words already learned
            case "vocabulary":
                doneCounts[2]++;
                break;
            case "kanji":
                doneCounts[1]++;
                kanjiWall += name;
                specialKanjiWall += fixHtml("<span style='color: " + kanjiColors[levelReorder(assignmentData.find(element => element["data"]["subject_id"] == id)["data"]["srs_stage"]) - 1] + "'>" + name + "</span>");
                break;
            case "radical":
                doneCounts[0]++;
                break;
        }
    }

    for (let i = 1; i < wordBubble.length; i++) wordBubble[i][3] += "</div>";
    for (let i = 1; i < radBubble.length; i++) radBubble[i][3] += "</div>";

    // kanji wall
    document.getElementById('kanjiwall').innerHTML = specialKanjiWall;

    // yojijukugo
    possibleYojijukugo = [];
    for (let i = 0; i < yojijukugoData.length; i++) {
        let word = yojijukugoData[i][1];
        let isPossible = true;
        for (let j = 0; j < 4; j++) if (!kanjiWall.includes(word[j])) isPossible = false;
        if (isPossible) possibleYojijukugo.push(yojijukugoData[i]);
    }
    if (possibleYojijukugo.length == 0) document.getElementsByClassName("yojijukugoall")[0].style.display = "none";
    else {
        changeYojijukugoRandom();
        document.getElementsByClassName("yojijukugoall")[0].style.display = "block";
    }

    // word progress
    var totalCounts = [0, 0, 0];
    for (const subject of subjectData) {
        switch (subject["object"]) {
            case "vocabulary":
                totalCounts[2]++;
                break;
            case "kanji":
                totalCounts[1]++;
                break;
            case "radical":
                totalCounts[0]++;
                break;
        }
    }
    wordProgressData = [["Type", "Count", { role: "tooltip" }],
    ["Radical Learned", doneCounts[0], doneCounts[0] / totalCounts[0] * 100], ["Kanji Learned", doneCounts[1], doneCounts[1] / totalCounts[1] * 100], ["Vocab Learned", doneCounts[2], doneCounts[2] / totalCounts[2] * 100],
    ["Radical Unknown", totalCounts[0] - doneCounts[0], (1 - doneCounts[0] / totalCounts[0]) * 100], ["Kanji Unknown", totalCounts[1] - doneCounts[1], (1 - doneCounts[1] / totalCounts[1]) * 100], ["Vocab Unknown", totalCounts[2] - doneCounts[2], (1 - doneCounts[2] / totalCounts[2]) * 100]];
    for (let i = 1; i < wordProgressData.length; i++) wordProgressData[i][2] = "Percentage " + wordProgressData[i][0] + ": " + Math.round(wordProgressData[i][2] * 10) / 10 + " % (" + wordProgressData[i][1] + ")";
    var chartData = google.visualization.arrayToDataTable(wordProgressData);
    var options = {
        chartArea: { width: '95%', height: '95%' },
        legend: { position: 'none' },
        pieHole: 0.4,
        colors: ['#55abf2', '#f032b1', '#bb31de', '#d1e1ed', '#edd8e6', '#ded3e0'],
        pieSliceText: 'value',
        width: 300,
        height: 300,
        tooltip: { isHtml: true },
        backgroundColor: { fill: 'transparent' }
    };
    var chart = new google.visualization.PieChart(document.getElementById('wordprogress'));
    chart.draw(chartData, options);
    document.getElementById('wordprogressinfo').innerHTML = fixHtml("<b>Total Learned: ") + Math.round((doneCounts[0] + doneCounts[1] + doneCounts[2]) / (totalCounts[0] + totalCounts[1] + totalCounts[2]) * 1000) / 10 + " % (" + (doneCounts[0] + doneCounts[1] + doneCounts[2]) + ")";

    // word bubble chart
    var wbkchartData = google.visualization.arrayToDataTable(wordBubble);
    options = {
        chartArea: { width: '85%', height: '80%' },
        title: 'Word Overview (Red: Kanji; Purple: Vocabulary; Lightness: WK Level)',
        hAxis: { textPosition: 'in', title: 'Meaning (%)' },
        vAxis: { title: 'Reading (%)', format: '0' },
        legend: { position: 'none' },
        bubble: { textStyle: { fontSize: 11 } },
        tooltip: { trigger: 'both', isHtml: true, ignoreBounds: true },
        width: 900,
        height: 700,
        backgroundColor: { fill: 'transparent' }
    };
    var chartDiv = document.getElementById('wordbubblechart');
    var wbkchart = new google.visualization.ScatterChart(chartDiv);
    wbkchart.draw(wbkchartData, options);

    // radical bubble chart
    chartData = google.visualization.arrayToDataTable(radBubble);
    options = {
        chartArea: { width: '85%', height: '80%' },
        title: 'Radical Overview (Lightness: WK Level)',
        hAxis: { textPosition: 'in', title: 'Accuracy (%)' },
        vAxis: { title: 'Amount Reviewed', format: '0' },
        legend: { position: 'none' },
        bubble: { textStyle: { fontSize: 11 } },
        tooltip: { trigger: 'both', isHtml: true, ignoreBounds: true },
        width: 900,
        height: 700,
        backgroundColor: { fill: 'transparent' }
    };
    chartDiv = document.getElementById('radbubblechart');
    chart = new google.visualization.ScatterChart(chartDiv);
    chart.draw(chartData, options);

    hallCreation(bestWords, "topwords", "Wall of Fame: All", "black", 'mix');
    hallCreation(worstWords, "worstwords", "Wall of Shame: All", "black", 'mix');
    hallCreation(bestWordsR, "topwordsradical", "Wall of Fame: Radicals", '#55abf2', 'radical');
    hallCreation(worstWordsR, "worstwordsradical", "Wall of Shame: Radicals", '#55abf2', 'radical');
    hallCreation(bestWordsK, "topwordskanji", "Wall of Fame: Kanji", '#f032b1', 'kanji');
    hallCreation(worstWordsK, "worstwordskanji", "Wall of Shame: Kanji", '#f032b1', 'kanji');
    hallCreation(bestWordsV, "topwordsvocab", "Wall of Fame: Vocabulary", '#bb31de', 'vocabulary');
    hallCreation(worstWordsV, "worstwordsvocab", "Wall of Shame: Vocabulary", '#bb31de', 'vocabulary');
}

async function hallCreation(words, divid, titleChart, colorChart, type) {
    let chartDiv = document.getElementById(divid);
    var data = [["Radical", "Percentage", { role: 'annotation' }]];
    for (let i = 0; i < words.length; i++) data.push([words[i][2], words[i][1] * 100, words[i][3] + "/" + words[i][4]]);
    var chartData = google.visualization.arrayToDataTable(data);
    var options = {
        chartArea: { width: '100%', height: '80%' },
        title: titleChart,
        colors: [colorChart],
        legend: { position: "none" },
        hAxis: { textPosition: 'in' },
        vAxis: {
            textPosition: 'in',
            viewWindow: {
                max: 100,
                min: 0
            }
        },
        width: 1000,
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true }
    };
    chartDiv = document.getElementById(divid);
    var chart = new google.visualization.ColumnChart(chartDiv);
    chart.draw(chartData, options);

    google.visualization.events.addListener(chart, 'select', function () {
        if (type == 'radical' || (type == 'mix' && words[chart.getSelection()[0].row][6] == 'radical')) window.open("https://www.wanikani.com/radicals/" + words[chart.getSelection()[0].row][5]);
        else if (type == 'mix') window.open("https://www.wanikani.com/" + words[chart.getSelection()[0].row][6] + "/" + data[chart.getSelection()[0].row + 1][0]);
        else window.open("https://www.wanikani.com/" + type + "/" + data[chart.getSelection()[0].row + 1][0]);
        chart.setSelection(null);
    });
}

fetchData();
