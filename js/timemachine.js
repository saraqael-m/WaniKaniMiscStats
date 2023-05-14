if (!isDarkMode()) document.getElementById('loadingdiv').innerHTML = '<b>Tip:</b> Activate dark mode!';

// variables
var userData = [], resetData = [], reviewData = [], assignmentData = [], subjectData = [], wordData = [], timemachineData = [], srsArray = [], hiddenItems = [], resurrectedItems = [], resets = [], srsChartData = [], usedIds = [];
var currentSelection = -1;
var dateRange = 1;
var srsChart;
var startTime, totalTime;

// constants
const colors = ['#f400a3', '#9e34b8', '#3557dd', '#0096e2', '#f0ca00'];

// elements
const maindivs = document.getElementsByClassName("allinfo");
const timemachinediv = document.getElementById('timemachinediv');
const srsChartDiv = document.getElementById('srschart');
const timeSlider = document.getElementById('timeslider');

// time slider
timeSlider.oninput = function () {
    let time = timeSlider.value / timeSlider.max * totalTime + startTime
    currentSelection = srsArray.findIndex(e => e[0].getTime() >= time);
    if (currentSelection == -1) currentSelection = srsArray.length - 1;
    chartSelectionMover(0);
}

// arrow moving chart
document.onkeydown = function (evt) {
    evt = evt || window.event;
    if (evt.key == "ArrowLeft" || evt.key == "a") chartSelectionMover(-1);
    if (evt.key == "ArrowRight" || evt.key == "d") chartSelectionMover(1);
};

async function chartSelectionMover(direction) {
    if (currentSelection == -1) {
        srsChartDiv.classList.remove('marked');
        srsChart.clearAnnotations();
        return;
    }
    srsChartDiv.classList.add('marked');
    currentSelection += direction;
    let xValue = srsArray[currentSelection];
    if (xValue !== undefined) {
        // new red annotation line
        let time = xValue[0].getTime()
        srsChart.clearAnnotations();
        srsChart.addXaxisAnnotation({ 
            x: time,
            borderColor: 'red',
            strokeDashArray: 0,
            opacity: 1
        });
        // rewrite tooltip (new data)
        let tooltip = srsChartDiv.getElementsByClassName('apexcharts-tooltip')[0];
        tooltip.firstChild.innerHTML = dateLongFormat(xValue[0]);
        let values = xValue.slice(1);
        let children = tooltip.children;
        for (let i = 0; i < values.length; i++) {
            children[i + 1].getElementsByClassName('apexcharts-tooltip-text-y-value')[0].innerHTML = values[i];
        }
        // move tooltip
        tooltip.classList.add('apexcharts-active');
        let annotationPos = srsChartDiv.getElementsByClassName('apexcharts-xaxis-annotations')[0].firstChild['x2'].animVal.value,
            chartWidth = srsChartDiv.getElementsByClassName('apexcharts-svg')[0].width.baseVal.value - 20,
            annotationWidth = tooltip.clientWidth;
        if (annotationPos < 0 || annotationPos > chartWidth) {
            currentSelection -= direction;
            if (direction != 0) chartSelectionMover(0);
            return;
        }
        tooltip.style.left = (annotationPos < chartWidth / 2 ? annotationPos + 60 : annotationPos + 32 - annotationWidth) + 'px';
        // move slider
        timeSlider.value = (time - startTime) / totalTime * timeSlider.max;
        // show kanji srs
        populateKanjiDiv(timemachineData.findIndex(e => e[0].getTime() >= srsArray[currentSelection][0].getTime())); 
    } else currentSelection -= direction; // undo moving
}

//// data caching ////
function saveTimemachineData() {
    wkof.file_cache.save('timemachineData', timemachineData.slice(0, -2));
}

async function loadTimemachineData() {
    return await wkof.file_cache.load('timemachineData');
}

async function reloadTimemachineData() {
    await wkof.file_cache.delete('timemachineData');
    window.location.reload();
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
    reviewData.sort((a, b) => new Date(a.data.created_at) - new Date(b.data.created_at));
    createResetArray();
    repairSubjectArray();

    console.time('calculateTimemachineData')
    await calculateTimemachineData();
    console.timeEnd('calculateTimemachineData')
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
    var subjectConfig = {
        wk_items: {
            options: { subjects: true, assignments: true, review_statistics: true },
            filters: { item_type: 'kan' }
        }
    };

    await wkof.Apiv2.get_endpoint('user').then(data => { progress['value']++; wkof.Progress.update(progress); userData = data; });
    wkof.user.override_max_level = 60; // just for user history purposes
    
    await Promise.all([wkof.ItemData.get_items(subjectConfig).then(data => { progress['value']++; wkof.Progress.update(progress); itemDataHandler(data); }),
        wkof.Apiv2.get_endpoint('resets').then(data => { progress['value']++; wkof.Progress.update(progress); resetData = Object.values(data); }),
        //wkof.Apiv2.get_endpoint('level_progressions').then(data => { progress['value']++; wkof.Progress.update(progress); levelData = Object.values(data); }),
        //wkof.Apiv2.get_endpoint('spaced_repetition_systems').then(data => { progress['value']++; wkof.Progress.update(progress); srsData = data; }),
        wkof.Apiv2.get_endpoint('reviews').then(data => { progress['value']++; wkof.Progress.update(progress); reviewData = Object.values(data); })]);

    wkof.user.override_max_level = undefined; // set back as to not let other people get the data
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
    let data = timemachineData[row][1];
    let charSpans = timemachinediv.children;
    for (let i = 0; i < charSpans.length; i++) {
        let srsClass = "srs" + data[i][1];
        if (!charSpans[i].classList.contains(srsClass)) {
            charSpans[i].className = srsClass;
        }
    }
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
    if (reviewData.length == 0) return;

    // create kanji div
    timemachineData = [[dateNoTime(new Date(reviewData[0]['data']['created_at'])), []]];
    timemachineData[0][0].setDate(timemachineData[0][0].getDate() - 1);
    let fullStr = '';
    var timemachineSubjectData = Object.values(subjectData);
    for (let i = timemachineSubjectData.length - 1; i >= 0; i--) if (timemachineSubjectData[i].object != 'kanji') timemachineSubjectData.splice(i, 1);
    timemachineSubjectData.sort((a, b) => a.data.level == b.data.level ? a.id - b.id : a.data.level - b.data.level);
    for (let i = 0; i < timemachineSubjectData.length; i++) if (timemachineSubjectData[i].object == 'kanji') {
        fullStr += '<span class="srs0">' + timemachineSubjectData[i].data.characters + '</span>';
        timemachineData[0][1].push([timemachineSubjectData[i].id, 0]);
    }
    timemachinediv.innerHTML = fullStr;
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
        timemachineData.push(...((await loadTimemachineData()).slice(1)));
        if (typeof timemachineData[1][1] == "string") {
            console.log("Timemachine data is deprecated; clearing file cache...");
            reloadTimemachineData();
        }
    } catch (e) {
        console.log(e);
        console.log("Timemachine data not cached...");
    }
    // check for timezone change -> reload if changed
    if (timemachineData.length > 1 && timemachineData[0][0].getHours() != timemachineData[1][0].getHours()) {
        console.log("Timemachine data has different time zone than user; clearing file cache...");
        reloadTimemachineData();
    }
    // create array
    var found, resetArray = [];
    srsArray = [[timemachineData[0][0], 0, 0, 0, 0, 0]], usedIds = [];
    for (let i = 0; i < reviewData.length; i++) {
        let currentReview = reviewData[i]["data"];
        let subId = currentReview["subject_id"];
        if (subjectData[subId] === undefined || subjectData[subId]["object"] != "kanji") continue;
        let date = dateNoTime(new Date(currentReview["created_at"]));
        // srs review data
        let typeStart = levelReorder(currentReview["starting_srs_stage"]);
        let typeEnd = levelReorder(currentReview["ending_srs_stage"]);
        let foundSrs = srsArray.length - 1; //srsArray.findIndex(element => (element[0].valueOf() == date.valueOf()));
        foundSrs = srsArray[foundSrs][0].valueOf() != date.valueOf() ? -1 : foundSrs;
        if (foundSrs == -1) {
            let newDate = [...srsArray[srsArray.length - 1]];
            newDate[0] = date;
            srsArray.push(newDate);
            foundSrs = srsArray.length - 1;
        }
        srsArray[foundSrs][typeStart]--;
        // timemachine data
        found = timemachineData.length - 1;
        if (timemachineData[found][0].valueOf() !== date.valueOf()) {
            let clonedData = [];
            for (let j = 0; j < timemachineData[found][1].length; j++) clonedData.push(timemachineData[found][1][j].slice());
            timemachineData.push([date, clonedData]);
            found += 1;
        }
        timemachineData[found][1].find(element => element[0] == subId)[1] = currentReview["ending_srs_stage"];
        // new item
        let foundId = usedIds.findIndex(element => element[0] == subId);
        if (foundId == -1) {
            usedIds.push([subId, typeEnd]);
            srsArray[foundSrs][typeEnd]++;
        } else {
            usedIds[foundId][1] = typeEnd;
        }
        srsArray[foundSrs][typeEnd]++;
        // hidden items
        let exactDate = new Date(currentReview["created_at"]);
        while (hiddenItems.length != 0 && dateNoTime(new Date(hiddenItems[0][0])) <= date) {
            let hiddenLevel = usedIds.findIndex(element => element[0] == hiddenItems[0][1]);
            if (hiddenLevel == -1) { hiddenItems.splice(0, 1); continue; }
            srsArray[foundSrs][usedIds[hiddenLevel][1]]--; // delete from srs stage
            let id = hiddenItems[0][1];
            timemachineData[found][1].find(element => element[0] == id)[1] = 0;
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
                    timemachineData[found][1].find(element => element[0] == id)[1] = 1;
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
                    timemachineData[found][1].find(element => element[0] == id)[1] = 0;
                }
            }
            for (var j = deleteIds.length - 1; j >= 0; j--) {
                usedIds.splice(deleteIds[j], 1);
            }
            resetArray.push(resetIndex);
        }
        // resurrect items after reset
        if (resurrectedItems.length != 0) {
            let resurrectedDate = dateNoTime(new Date(resurrectedItems[0][0]));
            while (resurrectedDate <= date) {
                let resurrectedLevel = usedIds.findIndex(element => element[0] == resurrectedItems[0][1]);
                if (resurrectedLevel == -1) {
                    resurrectedItems.splice(0, 1);
                    if (resurrectedItems.length != 0) resurrectedDate = dateNoTime(new Date(resurrectedItems[0][0]))
                    else break;
                    continue;
                }
                srsArray[srsArray.length - 1][usedIds[resurrectedLevel][1]]--; // delete from srs stage
                srsArray[srsArray.length - 1][1]++; // add to apprentice
                usedIds[resurrectedLevel][1] = 1;
                let id = resurrectedItems[0][1];
                timemachineData[found][1].find(element => element[0] == id)[1] = 1;
                resurrectedItems.splice(0, 1);
                if (resurrectedItems.length != 0) resurrectedDate = dateNoTime(new Date(resurrectedItems[0][0]));
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
    srsArray.sort((a, b) => a[0].valueOf() - b[0].valueOf());
    // fill undefined dates with 0
    let firstDate = srsArray[0][0];
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
    startTime = timemachineData[0][0].getTime();
    totalTime = timemachineData[timemachineData.length - 1][0].getTime() - startTime;
    // generate chart
    generateTimemachineChart();
    // cache data
    saveTimemachineData();
}

function datesInRange(d1, d2, r) {
    return Math.abs(d1 - d2) < 86400000 * (r + 0.5); // 86400000 milliseconds in one day
}

function generateTimemachineChart() {
    var options = {
        chart: {
            type: 'area',
            stacked: true,
            height: '400px',
            events: {
                click: chartClick,
                beforeZoom: function (_, info) {
                    if (info.yaxis !== undefined) currentSelection = 1 - currentSelection;
                },
                mouseLeave: function (_, _) {
                    chartSelectionMover(0);
                }
            }
        },
        title: {
            text: 'Kanji Items Learned by SRS Stage'
        },
        stroke: {
            curve: 'smooth',
            width: 0
        },
        series: [{
                name: 'Apprentice Kanji',
                data: srsArray.map(x => [x[0].getTime(), x[1]])
            }, {
                name: 'Guru Kanji',
                data: srsArray.map(x => [x[0].getTime(), x[2]])
            }, {
                name: 'Master Kanji',
                data: srsArray.map(x => [x[0].getTime(), x[3]])
            }, {
                name: 'Enlightened Kanji',
                data: srsArray.map(x => [x[0].getTime(), x[4]])
            }, {
                name: 'Burned Kanji',
                data: srsArray.map(x => [x[0].getTime(), x[5]])
            }],
        xaxis: {
            type: 'datetime'
        }, 
        colors: colors,
        fill: {
            type: ['solid', 'gradient', 'gradient', 'gradient', 'gradient'],
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.4,
                opacityFrom: 1,
                opacityTo: 1
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                format: 'MMM dd yyyy'
            }
        },
        legend: {
            show: false
        }
    }
    srsChart = new ApexCharts(srsChartDiv, options);
    srsChart.render();
    srsChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    // populate kanji div to default
    currentSelection = 0;
    chartSelectionMover(0);
}

function chartClick(_, _, config) {
    if (currentSelection < -1) { currentSelection = 1 - currentSelection; return; }
    let row = config.dataPointIndex;
    if (row == -1) { return; }
    if (currentSelection == row) row = -1;
    srsChart.clearAnnotations();
    currentSelection = row;
    chartSelectionMover(0);
}

fetchData();