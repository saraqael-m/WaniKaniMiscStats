// elements
const maindivs = document.getElementsByClassName('row')[0].children;
const litimg = document.getElementById('literatureimg');
const littab = document.getElementById('literaturetable');
const sourceselect = document.getElementById('source');

// variables
var itemData, userData, kanjiLevelData, jlptCoverage, joyoCoverage, schoolCoverage, litSeriesData, litTotalSeriesData;
var jlptChart, joyoChart, schoolChart, litChart, litTotalChart;
var tableBody, tablePos = 0, accumulated = 0, tableInterval = 100, tableData = [], tableWidth, litMax = 0;

// constants
const literatureRef = {
    coteV1: ["coteV1.webp", coteVol1Data, ["#84caf0", "#911c43"]],
    genjiMonogatari: ["genjiMonogatari.jpg", genjiMonogatariData, ["#e8c199", "#63411e"]],
    wikipedia: ["wikipedia.png", wikipediaData, ["#ebebeb", "#525252"]],
    novels: ["novels.jpg", novelData, ["#e0da5c", "#6e6910"]],
    shows: ["shows.png", showData, ["#8ce5f5", "#566163"]],
    twitter: ["twitter.png", twitterData, ["#69c0f5", "#1a6b9c"]],
    aozora: ["aozora.png", aozoraData, ["#8585ff", "#09097d"]],
    news: ["news.jpg", newsData, ["#ff8a90", "#75080e"]],
}
const literatureIntervals = [0, 50, 200, 500, 1000, 2000];

//// get items ////
async function fetchData() {
    userData = undefined, itemData = undefined;
    for (const maindiv of maindivs) maindiv.style.display = "none";
    blackOverlay.style.visibility = "visible";
    whiteOverlay.style.visibility = "visible";

    let modules = 'Settings, Progress, ItemData, Apiv2';
    wkof.include(modules);
    await wkof.ready(modules).then(dataPasser);
    createKanjiLevelData();

    await generateCharts();
    wkofDiv.style.display = 'none';

    if (localStorage["scrollposition"]) document.documentElement.scrollTop = document.body.scrollTop = localStorage["scrollposition"];
    blackOverlay.style.visibility = "hidden";
    whiteOverlay.style.visibility = "hidden";
    for (const maindiv of maindivs) maindiv.style.display = "block";
}

function createKanjiLevelData() {
    kanjiLevelData = {};
    for (let i = 1; i <= 60; i++) kanjiLevelData[i] = "";
    for (const item of Object.values(itemData)) {
        let level = item.data.level,
            char = item.data.characters;
        for (let i = level; i <= 60; i++) {
            let prevStr = kanjiLevelData[i];
            kanjiLevelData[i] = prevStr + char;
        }
    }
}

async function dataPasser() {
    wkofDiv.style.display = '';
    var subjectConfig = {
        wk_items: {
            options: { subjects: true, assignments: true, review_statistics: true },
            filters: { item_type: 'kan' }
        }
    };

    await Promise.all([wkof.ItemData.get_items(subjectConfig).then(data => { itemData = {}; for (const val of Object.values(data)) itemData[val.id] = val; }),
        wkof.Apiv2.get_endpoint('user').then(data => userData = data)]);
}

async function generateCharts() {
    await Promise.all([kanjiListCharts(), updateLiterature()]);
}

function commonChars(s1, s2) {
    var s3 = '';
    for (let i in s1) if (s2.includes(s1[i])) s3 += s1[i];
    return s3;
}

function commonCharCount(s1, s2) {
    var count = 0;
    for (let i in s1) s2.includes(s1[i]) ? count++ : false;
    return count;
}

async function kanjiListCharts() {
    userLevelAnnotation = { x: userData.level,
            borderColor: '#ce42f5',
            strokeDashArray: 0,
            label: {
                borderColor: '#ce42f5',
                style: {
                    color: '#000000',
                    background: '#ce42f5'
                },
                text: 'You are here - Level ' + userData.level
            }
        }

    // JLPT //
    jlptCoverage = [[]];
    for (const jlptKanji of [jlptData.N1, jlptData.N2, jlptData.N3, jlptData.N4, jlptData.N5]) {
        let tempData = [];
        for (let i = 1; i <= 60; i++) tempData.push([i, commonCharCount(kanjiLevelData[i], jlptKanji)]);
        jlptCoverage.push(tempData);
    }
    for (let i = 0; i < 60; i++) jlptCoverage[0].push([i + 1, jlptCoverage[1][i][1] + jlptCoverage[2][i][1] + jlptCoverage[3][i][1] + jlptCoverage[4][i][1] + jlptCoverage[5][i][1]]);
    var options = {
        chart: { type: 'area', height: '400px' },
        title: { text: 'JLPT Kanji Level Completion' },
        stroke: { curve: 'smooth', width: 2 },
        series: [],
        annotations: {
            position: 'front',
            xaxis: [userLevelAnnotation]
        },
        colors: ["#3477eb", "#5beb34", "#d8e041", "#ebc252", "#f76248", "#000000"],
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                formatter: function (value, data, w) {
                    if (w == undefined) { let seriesLength = Object.values(jlptData).map(e => e.length).reduce((a, b) => a + b), currentLength = jlptCoverage[0][data.dataPointIndex][1]; return "Level " + value + (data.w.config.chart.type == "area" ? " - " + currentLength + "/" + seriesLength + " (" + (currentLength / seriesLength * 100).toFixed(2) + "%)" : ""); }
                }
            },
            y: {
                formatter: function (value, opts, _) {
                    let seriesLength = opts.seriesIndex != 5 ? jlptData["N" + (5 - opts.seriesIndex)].length : Object.values(jlptData).map(e => e.length).reduce((a, b) => a + b);
                    return value + "/" + seriesLength + " (" + (value / seriesLength * 100).toFixed(2) + "%)";
                }
            }
        },
        legend: { show: true }
    }
    jlptChart = new ApexCharts(document.getElementById('jlptchart'), options);
    jlptChart.render();
    jlptChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    // Joyo //
    joyoCoverage = [];
    for (let i = 1; i <= 60; i++) joyoCoverage.push([i, commonCharCount(kanjiLevelData[i], joyoData)]);
    options = {
        chart: { type: 'area', height: '400px' },
        title: { text: 'Joyo Kanji Level Completion' },
        stroke: { curve: 'smooth', width: 2 },
        series: [{ name: 'Joyo', data: joyoCoverage }],
        annotations: {
            position: 'front',
            xaxis: [userLevelAnnotation]
        },
        colors: ["#000000"],
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                formatter: function (value, _, _) {
                    return "Level " + value
                }
            },
            y: {
                formatter: function (value, _, _) {
                    return value + " (" + (value / joyoData.length * 100).toFixed(2) + "%)";
                }
            }
        },
        legend: { show: true }
    }
    joyoChart = new ApexCharts(document.getElementById('joyochart'), options);
    joyoChart.render();
    joyoChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    // School //
    schoolCoverage = [[]];
    for (const schoolKanji of [schoolData.grade1, schoolData.grade2, schoolData.grade3, schoolData.grade4, schoolData.grade5, schoolData.grade6]) {
        let tempData = [];
        for (let i = 1; i <= 60; i++) tempData.push([i, commonCharCount(kanjiLevelData[i], schoolKanji)]);
        schoolCoverage.push(tempData);
    }
    for (let i = 0; i < 60; i++) schoolCoverage[0].push([i + 1, schoolCoverage[1][i][1] + schoolCoverage[2][i][1] + schoolCoverage[3][i][1] + schoolCoverage[4][i][1] + schoolCoverage[5][i][1] + schoolCoverage[6][i][1]]);
    options = {
        chart: { type: 'area', height: '400px' },
        title: { text: '教育/School Kanji Level Completion' },
        stroke: { curve: 'smooth', width: 2 },
        series: [],
        annotations: {
            position: 'front',
            xaxis: [userLevelAnnotation]
        },
        colors: ["#34e5eb", "#34cceb", "#34b4eb", "#3498eb", "#347deb", "#345eeb", "#000000"],
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                formatter: function (value, data, w) {
                    if (w == undefined) { let seriesLength = Object.values(schoolData).map(e => e.length).reduce((a, b) => a + b), currentLength = schoolCoverage[0][data.dataPointIndex][1]; return "Level " + value + (data.w.config.chart.type == "area" ? " - " + currentLength + "/" + seriesLength + " (" + (currentLength / seriesLength * 100).toFixed(2) + "%)" : ""); }
                }
            },
            y: {
                formatter: function (value, opts, _) {
                    let seriesLength = opts.seriesIndex != 6 ? schoolData["grade" + (opts.seriesIndex + 1)].length : Object.values(schoolData).map(e => e.length).reduce((a, b) => a + b);
                    return value + "/" + seriesLength + " (" + (value / seriesLength * 100).toFixed(2) + "%)";
                }
            }
        },
        legend: { show: true }
    }
    schoolChart = new ApexCharts(document.getElementById('schoolchart'), options);
    schoolChart.render();
    schoolChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    // Literature //
    options = {
        chart: { type: 'area', height: '400px' },
        title: { text: 'Literature Kanji Level Completion' },
        stroke: { curve: 'smooth', width: 2 },
        series: [],
        annotations: {
            position: 'front',
            xaxis: [userLevelAnnotation,
                {
                    x: 60,
                    borderColor: '#d6b031',
                    strokeDashArray: 5,
                    label: {
                        borderColor: '#d6b031',
                        style: {
                            color: '#000000',
                            background: '#d6b031'
                        },
                        text: 'Finish - Level 60'
                    }
                }]
        },
        colors: ["#34e5eb", "#34cceb", "#34b4eb", "#3498eb", "#347deb", "#345eeb", "#000000"],
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                formatter: function (value, data, w) {
                    if (w == undefined) { let seriesLength = data.series.length == 1 ? data.series[0].slice(-1)[0] : data.series.reduce((p, c) => [p.slice(-1)[0] + c.slice(-1)[0]])[0], currentLength = data.series.length == 1 ? data.series[0][data.dataPointIndex] : data.series.reduce((p, c, i) => [(i == 1 ? p[data.dataPointIndex] : p[0]) + c[data.dataPointIndex]])[0]; return (value != 61 ? "Level " + value : "Completion") + (data.w.config.chart.type == "area" ? " - " + currentLength + "/" + seriesLength + " (" + (currentLength / seriesLength * 100).toFixed(2) + "%)" : ""); }
                }
            },
            y: {
                formatter: function (value, data, _) {
                    let seriesLength = data.series[data.seriesIndex].slice(-1)[0];
                    return value + "/" + seriesLength + " Kanji (" + (value / seriesLength * 100).toFixed(2) + "%)";
                }
            }
        },
        legend: { show: true },
    }
    litChart = new ApexCharts(document.getElementById('litchart'), options);
    litChart.render();
    litChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    options = {
        chart: { type: 'area', height: '400px' },
        title: { text: 'Literature Total Kanji Percentage by Level' },
        stroke: { curve: 'smooth', width: 2 },
        series: [],
        annotations: {
            position: 'front',
            xaxis: [userLevelAnnotation,
                {
                    x: 60,
                    borderColor: '#d6b031',
                    strokeDashArray: 5,
                    label: {
                        borderColor: '#d6b031',
                        style: {
                            color: '#000000',
                            background: '#d6b031'
                        },
                        text: 'Finish - Level 60'
                    }
                }]
        },
        colors: ["#34e5eb", "#34cceb", "#34b4eb", "#3498eb", "#347deb", "#345eeb", "#000000"],
        fill: { type: 'solid' },
        dataLabels: { enabled: false },
        tooltip: {
            shared: true,
            inverseOrder: true,
            x: {
                formatter: function (value, data, w) {
                    if (w == undefined) {
                        let seriesLength = data.series.length == 1 ? data.series[0].slice(-1)[0] : data.series.reduce((p, c) => [p.slice(-1)[0] + c.slice(-1)[0]])[0],
                            currentLength = data.series.length == 1 ? data.series[0][data.dataPointIndex] : data.series.reduce((p, c, i) => [(i == 1 ? p[data.dataPointIndex] : p[0]) + c[data.dataPointIndex]])[0];
                        return (value != 61 ? "Level " + value : "Completion") + (data.w.config.chart.type == "area" ? " - " + (currentLength / seriesLength * 100).toFixed(2) + "%" : "");
                        //return (value != 61 ? "Level " + value : "Completion") + (data.w.config.chart.type == "area" ? " - " + currentLength + "/" + seriesLength + " (" + (currentLength / seriesLength * 100).toFixed(2) + "%)" : "");
                    }
                }
            },
            y: {
                formatter: function (value, data, _) {
                    let seriesLength = data.series[data.seriesIndex].slice(-1)[0];
                    return (value / seriesLength * 100).toFixed(2) + "%";
                    //return value + "/" + seriesLength + " Kanji (" + (value / seriesLength * 100).toFixed(2) + "%)";
                }
            }
        },
        legend: { show: true },
    }
    litTotalChart = new ApexCharts(document.getElementById('littotalchart'), options);
    litTotalChart.render();
    litTotalChart.updateOptions({ theme: { mode: isDarkMode() ? 'dark' : 'light' }, chart: { background: colorSchemes[currentScheme].cardColor } });

    // update charts
    updateJlptChart();
    updateSchoolChart();
    updateLiteratureChart();
}

function updateJlptChart() {
    let combinedBool = document.getElementById('jlptcomb').checked;
    if (combinedBool) document.getElementById('jlptchart').classList.add('noblack');
    else document.getElementById('jlptchart').classList.remove('noblack');
    jlptChart.updateOptions({
        chart: combinedBool ? { type: 'area', stacked: true } : { type: 'line', stacked: false },
        series: [{
            name: "N5",
            data: jlptCoverage[5]
        }, {
            name: "N4",
            data: jlptCoverage[4]
        }, {
            name: "N3",
            data: jlptCoverage[3]
        }, {
            name: "N2",
            data: jlptCoverage[2]
        }, {
            name: "N1",
            data: jlptCoverage[1]
        }, ...(!combinedBool ? [{
            name: "All",
            data: jlptCoverage[0]
        }] : [])],
        annotations: {
            yaxis: combinedBool ? ([{ y: 0, y2: jlptData.N5.length, borderColor: "#3477eb", fillColor: "#3477eb", opacity: 0.15, strokeDashArray: 0 },
            { y: jlptData.N5.length, y2: jlptData.N5.length + jlptData.N4.length, borderColor: "#5beb34", fillColor: "#5beb34", opacity: 0.15, strokeDashArray: 0 },
            { y: jlptData.N5.length + jlptData.N4.length, y2: jlptData.N5.length + jlptData.N4.length + jlptData.N3.length, borderColor: "#d8e041", fillColor: "#d8e041", opacity: 0.15, strokeDashArray: 0 },
            { y: jlptData.N5.length + jlptData.N4.length + jlptData.N3.length, y2: jlptData.N5.length + jlptData.N4.length + jlptData.N3.length + jlptData.N2.length, borderColor: "#ebc252", fillColor: "#ebc252", opacity: 0.15, strokeDashArray: 0 },
            { y: jlptData.N5.length + jlptData.N4.length + jlptData.N3.length + jlptData.N2.length, y2: jlptData.N5.length + jlptData.N4.length + jlptData.N3.length + jlptData.N2.length + jlptData.N1.length, borderColor: "#f76248", fillColor: "#f76248", opacity: 0.15, strokeDashArray: 0 }]) : []
        },
    });
}

function updateSchoolChart() {
    let combinedBool = document.getElementById('schoolcomb').checked;
    if (combinedBool) document.getElementById('schoolchart').classList.add('noblack');
    else document.getElementById('schoolchart').classList.remove('noblack');
    schoolChart.updateOptions({
        chart: combinedBool ? { type: 'area', stacked: true } : { type: 'line', stacked: false },
        series: [{
            name: "Grade 1",
            data: schoolCoverage[1]
        }, {
            name: "Grade 2",
            data: schoolCoverage[2]
        }, {
            name: "Grade 3",
            data: schoolCoverage[3]
        }, {
            name: "Grade 4",
            data: schoolCoverage[4]
        }, {
            name: "Grade 5",
            data: schoolCoverage[5]
        }, {
            name: "Grade 6",
            data: schoolCoverage[6]
        }, ...(!combinedBool ? [{
            name: "All",
            data: schoolCoverage[0]
        }] : [])],
        annotations: {
            yaxis: combinedBool ? ([{ y: 0, y2: schoolData.grade1.length, borderColor: "#34e5eb", fillColor: "#34e5eb", opacity: 0.15, strokeDashArray: 0 },
                { y: schoolData.grade1.length, y2: schoolData.grade1.length + schoolData.grade2.length, borderColor: "#34cceb", fillColor: "#34cceb", opacity: 0.15, strokeDashArray: 0 },
                { y: schoolData.grade1.length + schoolData.grade2.length, y2: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length, borderColor: "#34b4eb", fillColor: "#34b4eb", opacity: 0.15, strokeDashArray: 0 },
                { y: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length, y2: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length + schoolData.grade4.length, borderColor: "#3498eb", fillColor: "#3498eb", opacity: 0.15, strokeDashArray: 0 },
                { y: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length + schoolData.grade4.length, y2: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length + schoolData.grade4.length + schoolData.grade5.length, borderColor: "#347deb", fillColor: "#347deb", opacity: 0.15, strokeDashArray: 0 },
                { y: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length + schoolData.grade4.length + schoolData.grade5.length, y2: schoolData.grade1.length + schoolData.grade2.length + schoolData.grade3.length + schoolData.grade4.length + schoolData.grade5.length + schoolData.grade6.length, borderColor: "#345eeb", fillColor: "#345eeb", opacity: 0.15, strokeDashArray: 0 }]) : []
        },
    });
}

function updateLiteratureChart() {
    let data = literatureRef[sourceselect.value];
    let minOcc = Math.min(Math.round(document.getElementById('coverageminocc').value / 100 * data[1].reduce((p, c, i) => (i == 1 ? p[1] : p) + c[1])), data[1][10][1]);
    let litRawData = shortenFrequencyArray(data[1], minOcc),
        colorInter = d3.interpolateRgb(data[2][0], data[2][1]);
    litSeriesData = [], litTotalSeriesData = [];
    for (let i = 0; i < literatureIntervals.length; i++) {
        let startIndex = literatureIntervals[i],
            endIndex = i != literatureIntervals.length - 1 ? literatureIntervals[i + 1] : litRawData.length;
        if (startIndex >= litRawData.length) break;
        let litKanji = litRawData.slice(startIndex, endIndex).reduce((p, c) => [p[0] + c[0], undefined])[0];
        // regular literature chart
        let tempData = [];
        for (let j = 1; j <= 60; j++) tempData.push([j, commonCharCount(kanjiLevelData[j], litKanji)]);
        tempData.push([61, litKanji.length]);
        litSeriesData.push({
            name: endIndex >= litRawData.length ? ">#" + startIndex : "#" + (startIndex + 1) + "-#" + endIndex,
            data: tempData
        });
        // total percentage literature chart
        tempData = [];
        for (let j = 1; j <= 60; j++) {
            let currentKanji = commonChars(kanjiLevelData[j], litKanji);
            tempData.push([j, litRawData.slice(startIndex, endIndex).map(e => currentKanji.includes(e[0]) ? [undefined, e[1]] : [undefined, 0]).reduce((p, c) => [undefined, p[1] + c[1]])[1]]);
        }
        tempData.push([61, litRawData.slice(startIndex, endIndex).reduce((p, c) => [undefined, p[1] + c[1]])[1]]);
        litTotalSeriesData.push({
            name: endIndex >= litRawData.length ? ">#" + startIndex : "#" + (startIndex + 1) + "-#" + endIndex,
            data: tempData
        });
    }

    let colors = [];
    for (let i = 0; i < litSeriesData.length; i++) colors.push(colorInter(i / (litSeriesData.length - 1)));

    litChart.updateOptions({
        chart: { type: 'area', stacked: true },
        //yaxis: { max: Math.ceil((litSeriesData.map(e => e.data.slice(-2)[0][1]).reduce((p, c) => p + c) + 50) / 100) * 100 },
        series: litSeriesData,
        colors: colors,
        annotations: {
            yaxis: litSeriesData.map((_, i) => ({
                y: litSeriesData.map(e => e.data.slice(-1)[0][1]).slice(0, i).reduce((a, b) => a + b, 0),
                y2: litSeriesData.map(e => e.data.slice(-1)[0][1]).slice(0, i + 1).reduce((a, b) => a + b),
                borderColor: colors[i],
                fillColor: colors[i],
                opacity: 0.15,
                strokeDashArray: 0,
            }))
        },
        title: { text: '"' + sourceselect[sourceselect.selectedIndex].text + '" Individual Kanji Level Completion by Frequency' }
    });

    litMax = litTotalSeriesData.map(e => e.data.slice(-1)[0][1]).reduce((p, c) => p + c);
    litTotalChart.updateOptions({
        chart: { type: 'area', stacked: true },
        series: litTotalSeriesData,
        colors: colors,
        yaxis: {
            max: litMax,
            labels: {
                formatter: function (value) {
                    const percentage = value / (litMax == 0 ? 1 : litMax) * 100
                    return parseInt(percentage) <= 100 ? percentage.toFixed(2) + "%" : "";
                }
            }
        },
        annotations: {
            yaxis: litTotalSeriesData.map((_, i) => ({
                y: litTotalSeriesData.map(e => e.data.slice(-1)[0][1]).slice(0, i).reduce((a, b) => a + b, 0),
                y2: litTotalSeriesData.map(e => e.data.slice(-1)[0][1]).slice(0, i + 1).reduce((a, b) => a + b),
                borderColor: colors[i],
                fillColor: colors[i],
                opacity: 0.15,
                strokeDashArray: 0,
            }))
        },
        title: { text: '"' + sourceselect[sourceselect.selectedIndex].text + '" Total Amount Kanji Percentage by Frequency' }
    });
}

function updateLiterature() {
    // get data
    let image;
    [image, tableData] = literatureRef[sourceselect.value];

    // update chart
    updateLiteratureChart();

    // create table
    document.getElementById('loadtablebtn').style.display = 'block';
    tableWidth = littab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].childElementCount;
    tableBody = littab.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    tablePos = 0, accumulated = 0;
    loadTableData();

    // preview image
    image = image === undefined ? 'noimage.png' : image;
    litimg.src = "images/sourcePreviewImg/" + image;
}

async function loadTableData() {
    if (tablePos >= tableData.length) { return; }
    tableEndPos = Math.min(tablePos + tableInterval, tableData.length);
    let totalKanji = tableData.reduce((p, c) => [undefined, p[1] + c[1]])[1];
    for (let i = tablePos; i < tableEndPos; i++) {
        // create elements
        let tr = document.createElement('tr');
        for (let j = 0; j < tableWidth; j++) {
            let td = document.createElement('td');
            if (j == 1) td.style.fontSize = "150%";
            tr.appendChild(td);
        }
        // append to table
        tableBody.appendChild(tr);
    }
    let els = littab.getElementsByTagName('tbody')[0].children,
        meaningPromises = []; 
    for (let i = tablePos; i < tableEndPos; i++) {
        // fill in data
        let currentRow = els[i].children,
            char = tableData[i][0],
            amount = tableData[i][1],
            meaning = "-";
        try { meaning = fetch('https://kanjiapi.dev/v1/kanji/' + char).then(response => response.json()).then(e => e.meanings[0]); }
        catch (e) { console.log(e); meaning = "-"; }
        accumulated += amount;
        currentRow[0].innerHTML = i + 1;
        currentRow[1].innerHTML = char; 
        meaningPromises.push(new Promise(async () => currentRow[2].innerHTML = await meaning));
        currentRow[3].innerHTML = (amount / totalKanji * 100).toFixed(2) + "% (" + amount + ")";
        currentRow[4].innerHTML = (accumulated / totalKanji * 100).toFixed(2) + "% (" + accumulated + ")";
        currentRow[5].innerHTML = Object.values(kanjiLevelData).findIndex(e => e.includes(char)) + 1 || "-";
        currentRow[6].innerHTML = srsStageString(((Object.values(itemData).find(e => e.data.characters == char) || { assignments: { srs_stage: -1 } }).assignments || { srs_stage: 0 }).srs_stage);
    }
    tablePos = tableEndPos;
    if (tablePos >= tableData.length) { document.getElementById('loadtablebtn').style.display = 'none'; }
    await Promise.all(meaningPromises);
}

function shortenFrequencyArray(data, n) {
    return data.slice(0, data.findIndex(e => e[1] <= n));
}

function srsStageString(n) {
    let colors = ['#e38dc6', '#e677c1', '#e843b1', '#f400a3', '#ab62bd', '#9e34b8', '#3557dd', '#ADD8E6', '#f0ca00'];
    let preStr = n <= 0 ? "<a>" : "<a style='color: " + colors[n - 1] + "'>";
    switch (n) {
        case -1: return preStr + "-" + "</a>"
        case 0: return preStr + "Not Learned" + "</a>"
        case 1: return preStr + "Apprentice 1" + "</a>"
        case 2: return preStr + "Apprentice 2" + "</a>"
        case 3: return preStr + "Apprentice 3" + "</a>"
        case 4: return preStr + "Apprentice 4" + "</a>"
        case 5: return preStr + "Guru 1" + "</a>"
        case 6: return preStr + "Guru 2" + "</a>"
        case 7: return preStr + "Master" + "</a>"
        case 8: return preStr + "Enlightened" + "</a>"
        case 9: return preStr + "Burned" + "</a>"
    }
}

fetchData();