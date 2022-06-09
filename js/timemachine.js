// packages
google.charts.load('current', { 'packages': ['corechart'] });

// variables
var userData = [], resetData = [], reviewData = [], assignmentData = [], subjectData = [], wordData = [], timemachineData = [], srsArray = [], hiddenItems = [], resurrectedItems = [], resets = [], srsChartData = [], usedIds = [];
var currentSelection = [];
var fullStr = '';
var dateRange = 1;

// constants
const colors = ['initial', 'pink', '#bb57d4', '#6c4bc9', 'lightblue', '#f0ca00']

// elements
const maindivs = document.getElementsByClassName("allinfo");
const timemachinediv = document.getElementById('timemachinediv');

// arrow moving chart
document.onkeydown = function (evt) {
    evt = evt || window.event;
    if (evt.key == "ArrowLeft" || evt.key == "a") chartSelectionMover(-1);
    if (evt.key == "ArrowRight" || evt.key == "d") chartSelectionMover(1);
};

async function chartSelectionMover(direction) {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (currentSelection.length == 0) return;
    currentSelection[1].row += direction;
    try { currentSelection[0].setSelection([currentSelection[1]]); }
    catch (e) { currentSelection[1].row -= direction; currentSelection[0].setSelection([currentSelection[1]]); }
    populateKanjiDiv(currentSelection[1].row);
}

//// data caching ////
function saveTimemachineData(cacheUsedIds, cacheTimemachineEntry) {
    wkof.file_cache.save('srsArray', srsArray.slice(0, -2));
    wkof.file_cache.save('timemachineData', [...timemachineData.slice(0, -3), cacheTimemachineEntry]);
    wkof.file_cache.save('usedIds', cacheUsedIds);
}

async function loadTimemachineData() {
    [srsArray, timemachineData, usedIds] = await Promise.all([wkof.file_cache.load('srsArray'), wkof.file_cache.load('timemachineData'), wkof.file_cache.load('usedIds')]);
}

//// get items ////
async function fetchData() {
    userData = [], resetData = [], reviewData = [], assignmentData = [], subjectData = [], wordData = [], hiddenItems = [], resurrectedItems = [], resets = [];
    for (const maindiv of maindivs) maindiv.style.display = "none";
    blackOverlay.style.visibility = "visible";
    whiteOverlay.style.visibility = "visible";

    let modules = 'Settings, Progress, ItemData, Apiv2';
    wkof.include(modules);
    await wkof.ready(modules).then(dataPasser);

    for (let i = 0; i < assignmentData.length; i++) if (assignmentData[i]["data"]["resurrected_at"] != null) resurrectedItems.push([assignmentData[i]["data"]["resurrected_at"], assignmentData[i]["data"]["subject_id"]]);
    for (let i = 0; i < subjectData.length; i++) if (subjectData[i]["object"] != "placeholder" && subjectData[i]["data"]["hidden_at"] != null) hiddenItems.push([subjectData[i]["data"]["hidden_at"], subjectData[i]["id"], subjectData[i]]);
    resurrectedItems.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    hiddenItems.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    reviewData.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    createResetArray();
    repairSubjectArray();

    await calculateTimemachineData();
    wkofDiv.style.display = 'none';

    if (localStorage["scrollposition"]) document.documentElement.scrollTop = document.body.scrollTop = localStorage["scrollposition"];
    blackOverlay.style.visibility = "hidden";
    whiteOverlay.style.visibility = "hidden";
    for (const maindiv of maindivs) maindiv.style.display = "block";
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

async function dataPasser() {
    wkofDiv.style.display = '';
    var progress = {
        name: 'total',
        label: 'Progress',
        value: 0,
        max: 4
    };
    wkof.Progress.update(progress);
    await Promise.all([wkof.ItemData.get_items('assignments, subjects, review_statistics').then(data => { progress['value']++; wkof.Progress.update(progress); itemDataHandler(data); }),
        wkof.Apiv2.get_endpoint('user').then(data => { progress['value']++; wkof.Progress.update(progress); userData = data; }),
        wkof.Apiv2.get_endpoint('resets').then(data => { progress['value']++; wkof.Progress.update(progress); resetData = Object.values(data); }),
        //wkof.Apiv2.get_endpoint('level_progressions').then(data => { progress['value']++; wkof.Progress.update(progress); levelData = Object.values(data); }),
        //wkof.Apiv2.get_endpoint('spaced_repetition_systems').then(data => { progress['value']++; wkof.Progress.update(progress); srsData = data; }),
        wkof.Apiv2.get_endpoint('reviews').then(data => { progress['value']++; wkof.Progress.update(progress); reviewData = Object.values(data); })]);
}

function itemDataHandler(items) {
    for (let i = 0; i < items.length; i++) {
        currentItem = items[i];
        if (currentItem['assignments'] != undefined) { assignmentData.push({ 'data': currentItem['assignments'] }); delete currentItem['assignments']; }
        if (currentItem['review_statistics'] != undefined) { wordData.push({ 'data': currentItem['review_statistics'] }); delete currentItem['review_statistics']; }
        subjectData.push(currentItem);
    }
}

function populateKanjiDiv(row) {
    const date = srsChartData.getValue(row, 0);
    timemachinediv.innerHTML = timemachineData.find(element => element[0].getTime() >= date.getTime())[1];
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

async function calculateTimemachineData() {
    // wkof progress bar
    var progress = {
        name: 'timemachine',
        label: 'Timemachine Data',
        value: 0,
        max: reviewData.length
    };
    wkof.Progress.update(progress);
    // cached data
    try {
        await loadTimemachineData();
    } catch (e) {
        srsArray = [];
    }
    var startIndex = 0, startDate;
    var resetArray = [];
    if (srsArray.length == 0) { startIndex = -1; timemachineData = [[0, []]], srsArray = [[0, 0, 0, 0, 0, 0]], usedIds = []; }
    else {
        startDate = timemachineData[timemachineData.length - 1][0];
        startIndex = reviewData.findIndex(element => new Date(element.data['created_at'].substring(0, 10)) > startDate && !datesInRange(new Date(element.data['created_at'].substring(0, 10)), startDate, 0));
        startIndex = startIndex == -1 ? reviewData.length : startIndex;
        hiddenItems = hiddenItems.slice(hiddenItems.findIndex(element => new Date(element[0]) > startDate)).slice(1);
        resurrectedItems = resurrectedItems.slice(resurrectedItems.findIndex(element => new Date(element[0]) > startDate)).slice(1);
        for (let i = 0; i < resets.length; i++) if (resets[i][2] < startDate) resetArray.push(i);
    }
    // create array
    var cacheUsedIds = [], endDate;
    if (startDate !== undefined) {
        endDate = new Date(reviewData[reviewData.length - 1].data['created_at'].substring(0, 10));
        endDate.setDate(endDate.getDate() - 2);
        console.log(endDate, startDate);
    } else { endDate = startDate; }
    var found;
    for (let i = startIndex == -1 ? 0 : startIndex; i < reviewData.length; i++) {
        let currentReview = reviewData[i]["data"];
        let subId = currentReview["subject_id"];
        if (subjectData[subId]["object"] != "kanji") continue;
        let date = new Date(currentReview["created_at"].substring(0, 10));
        // srs review data
        let typeStart = levelReorder(currentReview["starting_srs_stage"]);
        let typeEnd = levelReorder(currentReview["ending_srs_stage"]);
        let foundSrs = srsArray.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (foundSrs == -1) {
            let newDate = [...srsArray[srsArray.length - 1]];
            newDate[0] = date;
            srsArray.push(newDate);
            foundSrs = srsArray.length - 1;
            if (datesInRange(date, endDate, 0)) {
                console.log(date)
                for (let j = 0; j < usedIds.length; j++) cacheUsedIds.push(usedIds[j].slice());
            }
        }
        srsArray[foundSrs][typeStart]--;
        // timemachine data
        found = timemachineData.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (found == -1) {
            found = timemachineData.length - 1;
            let clonedData = [];
            for (let j = 0; j < timemachineData[found][1].length; j++) clonedData.push(timemachineData[found][1][j].slice());
            timemachineData.push([date, clonedData]);
            found += 1;
        }
        // new item
        let foundId = usedIds.findIndex(element => element[0] == subId);
        if (foundId == -1) {
            usedIds.push([subId, typeEnd]);
            srsArray[foundSrs][typeEnd]++;
            if (subjectData[subId].object == 'kanji') {
                let foundTimemachine = timemachineData[found][1].findIndex(element => element[0] == subId);
                if (foundTimemachine == -1) timemachineData[found][1].push([subId, typeEnd]);
                else timemachineData[found][1][foundTimemachine][1] = typeEnd;
            }
        } else {
            usedIds[foundId][1] = typeEnd;
            if (subjectData[subId].object == 'kanji') {
                timemachineData[found][1].find(element => element[0] == subId)[1] = typeEnd;
            }
        }
        srsArray[foundSrs][typeEnd]++;
        // hidden items
        let exactDate = new Date(currentReview["created_at"]);
        while (hiddenItems.length != 0 && new Date(hiddenItems[0][0].substring(0, 10)) <= date) {
            let hiddenLevel = usedIds.findIndex(element => element[0] == hiddenItems[0][1]);
            if (hiddenLevel == -1) { hiddenItems.splice(0, 1); continue; }
            srsArray[foundSrs][usedIds[hiddenLevel][1]]--; // delete from srs stage
            let id = hiddenItems[0][1];
            if (subjectData[id].object == 'kanji') timemachineData[found][1].find(element => element[0] == id)[1] = 0;
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
                    if (resurrectedLevel == -1) { resurrectedItems.splice(0, 1); continue; }
                    srsArray[foundSrs][usedIds[resurrectedLevel][1]]--; // delete from srs stage
                    srsArray[foundSrs][1]++; // add to apprentice
                    usedIds[resurrectedLevel][1] = 1;
                    let id = resurrectedItems[0][1];
                    if (subjectData[id].object == 'kanji') timemachineData[found][1].find(element => element[0] == id)[1] = 1;
                    resurrectedItems.splice(0, 1);
                    if (resurrectedItems.length == 0) break;
                }
            }
            let deleteIds = [];
            for (let k = 0; k < usedIds.length; k++) {
                if (subjectData[usedIds[k][0]]["data"]["level"] >= resets[resetIndex][0]) {
                    deleteIds.push(k);
                    srsArray[foundSrs][usedIds[k][1]]--;
                    let id = usedIds[k][0];
                    if (subjectData[id].object == 'kanji') timemachineData[found][1].find(element => element[0] == id)[1] = 0;
                }
            }
            for (var j = deleteIds.length - 1; j >= 0; j--) {
                usedIds.splice(deleteIds[j], 1);
            }
            resetArray.push(resetIndex);
        }
        // resurrect items after reset
        if (resurrectedItems.length != 0) {
            let resurrectedDate = new Date(resurrectedItems[0][0].substring(0, 10));
            while (resurrectedDate <= date) {
                let resurrectedLevel = usedIds.findIndex(element => element[0] == resurrectedItems[0][1]);
                if (resurrectedLevel == -1) {
                    resurrectedItems.splice(0, 1);
                    if (resurrectedItems.length != 0) resurrectedDate = new Date(resurrectedItems[0][0].substring(0, 10))
                    else break;
                    continue;
                }
                srsArray[srsArray.length - 1][usedIds[resurrectedLevel][1]]--; // delete from srs stage
                srsArray[srsArray.length - 1][1]++; // add to apprentice
                usedIds[resurrectedLevel][1] = 1;
                let id = resurrectedItems[0][1];
                if (subjectData[id].object == 'kanji') timemachineData[found][1].find(element => element[0] == id)[1] = 1;
                resurrectedItems.splice(0, 1);
                if (resurrectedItems.length != 0) resurrectedDate = new Date(resurrectedItems[0][0].substring(0, 10));
                else break;
            }
        }
        // update progress bar
        if (i % 5000 == 0) {
            progress.value = i;
            wkof.Progress.update(progress);
            await new Promise(resolve => setTimeout(resolve, 3));
        }
    }
    progress.value = reviewData.length;
    wkof.Progress.update(progress);
    if (startIndex == -1) {
        timemachineData.splice(0, 1);
        srsArray.splice(0, 1);
    }
    srsArray.sort((a, b) => a[0].valueOf() - b[0].valueOf());
    if (startIndex == -1) srsArray.unshift(['Date', 'Apprentice', 'Guru', 'Master', 'Enlightened', 'Burned']);
    // fill undefined dates with 0
    let firstDate = srsArray[1][0];
    let lastDate = srsArray[srsArray.length - 1][0];
    let currentDate = new Date(firstDate.getTime());
    let prevIndex = 1;
    while (currentDate < lastDate) {
        let addIndex = srsArray.findIndex(element => datesInRange(element[0], currentDate, dateRange)); // time in milliseconds for 12 hours
        if (addIndex == -1) {
            srsArray.splice(prevIndex + 1, 0, [new Date(currentDate.getTime()), ...srsArray[prevIndex].slice(1)]);
            prevIndex++;
        } else prevIndex = addIndex;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    // generate chart
    var cacheTimemachineEntry = [timemachineData[timemachineData.length - 3][0], []];
    for (let j = 0; j < timemachineData[timemachineData.length - 3][1].length; j++) cacheTimemachineEntry[1].push(timemachineData[timemachineData.length - 3][1][j].slice());
    console.log(cacheTimemachineEntry)
    await timemachineToString();
    generateTimemachineChart();
    // cache data
    saveTimemachineData(cacheUsedIds, cacheTimemachineEntry);
}

function datesInRange(d1, d2, r) {
    return Math.abs(d1 - d2) < 86400000 * (r + 0.5); // 86400000 milliseconds in one day
}

async function timemachineToString() {
    // wkof progress bar
    var progress = {
        name: 'timemachineformat',
        label: 'Timemachine Format',
        value: 0,
        max: timemachineData.length
    };
    wkof.Progress.update(progress);
    // main
    fullStr = '';
    var timemachineSubjectData = Object.values(subjectData);
    for (let i = timemachineSubjectData.length - 1; i >= 0; i--) if (timemachineSubjectData[i].object != 'kanji') timemachineSubjectData.splice(i, 1);
    timemachineSubjectData.sort((a, b) => a.data.level == b.data.level ? a.id - b.id : a.data.level - b.data.level);
    for (let i = 0; i < timemachineSubjectData.length; i++) if (timemachineSubjectData[i].object == 'kanji') fullStr += '<a style="color: inherit">' + timemachineSubjectData[i].data.characters + '</a>';
    for (let i = 0; i < timemachineData.length; i++) {
        if (typeof timemachineData[i][1] !== "string") {
            console.log()
            let newData = fullStr;
            for (let j = 0; j < timemachineData[i][1].length; j++) {
                let char = subjectData[timemachineData[i][1][j][0]].data.characters;
                let stage = timemachineData[i][1][j][1];
                newData = newData.replace('<a style="color: inherit">' + char + '</a>', '<a style="color: ' + colors[stage] + '">' + char + '</a>');
            }
            timemachineData[i][1] = newData;
        }
        // update progress bar
        if (i % 30 == 0) {
            progress.value = i;
            wkof.Progress.update(progress);
            await new Promise(resolve => setTimeout(resolve, 3));
        }
    }
    progress.value = timemachineData.length;
    wkof.Progress.update(progress);
}

function generateTimemachineChart() {
    // calculate needed data
    dateRange = parseInt(Math.abs(new Date(reviewData[0].data["created_at"]) - new Date(reviewData[reviewData.length - 1].data["created_at"])) / (86400000 * 200)); // around up to 200 days will be repesented one by one
    var currentSrsArray = [srsArray[0]];
    for (let i = 1; i < srsArray.length; i += dateRange) currentSrsArray.push(srsArray[i]);
    // srs stacked
    var dateFormatter = new google.visualization.DateFormat({ pattern: "MMM dd yyyy" });
    srsChartData = google.visualization.arrayToDataTable(currentSrsArray);
    dateFormatter.format(srsChartData, 0);
    options = {
        chartArea: { width: '90%', height: '80%' },
        legend: { position: 'none' },
        hAxis: { textPosition: 'bottom' }, vAxis: { textPosition: 'bottom' },
        connectSteps: true,
        colors: colors.slice(1), // burned is gold
        isStacked: true,
        width: '90%',
        height: 333,
        backgroundColor: { fill: 'transparent' },
        tooltip: { isHtml: true, trigger: 'both' },
        focusTarget: 'category'
    };
    var srsChart = new google.visualization.SteppedAreaChart(document.getElementById('srschart'));
    srsChart.draw(srsChartData, options);
    google.visualization.events.addListener(srsChart, 'select', function () { // date setter
        const selected = srsChart.getSelection()[0];
        if (selected === undefined) return;
        populateKanjiDiv(selected.row);
        chartSelectionSetter(srsChart);
    });
    // populate kanji div to default
    currentSelection = [srsChart, { column: null, row: 0 }];
    chartSelectionMover(0);
}

fetchData();