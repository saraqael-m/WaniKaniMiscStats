// load packages
google.charts.load('current', { 'packages': ['corechart', 'bar'] });

// API vars
var apiToken;
var requestHeaders;

// elements
const maindiv = document.getElementById("allinfo");
const newdatediv = document.getElementById("newdatediv");
const newdateinp = document.getElementById("newdateinp");
const newdatebtn = document.getElementById("newdatebtn");
const newdateche = document.getElementById("nullify");
const smoothBox = document.getElementById("smoothreview");
const errorDiv = document.getElementById("errordiv");
const tokenInp = document.getElementById("tokeninput");
const blackOverlay = document.getElementById("blackoverlay");
const whiteOverlay = document.getElementById("whiteoverlay");
const reviewProgress = document.getElementById("reviewprogress");
const reviewAll = document.getElementById("reviewall");
const reviewBox = document.getElementById("noreview");
const reviewPg = document.getElementById("reviewpg");

// global vars
var userData = [];
var reviewData = [];
var reviewArray = [];
var totalArray = [];
var averageArray = [];
var srsArray = [];
var levelData = [];
var wordData = [];
var resetData = [];
var resets = [];
var subjectData = [];
var months = 12;

// event listener
newdateche.addEventListener('change', () => {
    updateReviewCharts();
})
smoothBox.addEventListener('change', () => {
    updateReviewsPerDay();
})

newdateinp.value = months;

async function getApiToken() {
    apiToken = tokenInp.value;
    requestHeaders = new Headers({ 'Wanikani-Revision': '20170710', Authorization: 'Bearer ' + apiToken });
    if (await fetchTestApi() == true) {
        document.cookie = "token=" + apiToken;
        fetchData();
    }
}

function decodeFromCookie(name) {
    let rawCookie = document.cookie;
    let index = rawCookie.indexOf(name + "=");
    if (index == -1) return -1;
    let decodedCookie = rawCookie.substring(index + name.length + 1);
    let colonIndex = decodedCookie.indexOf(";");
    if (colonIndex != -1) decodedCookie = decodedCookie.substring(0, colonIndex);
    return decodedCookie;
}

async function fetchTestApi() {
    var fetchSuccess = false;
    let promise = fetch(new Request("https://api.wanikani.com/v2/subjects/1", { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    let data = await promise;
    if (data["object"] == "radical") {
        fetchSuccess = true;
        errorDiv.innerHTML = "Success!"
        tokenInp.style.backgroundColor = 'lightgreen';
    } else if (data["code"] !== undefined) {
        errorDiv.innerHTML = "Error (Code " + data["code"] + "): " + data["error"];
        tokenInp.style.backgroundColor = 'lightsalmon';
    } else {
        errorDiv.innerHTML = "Unknown Error Occured (maybe an API update or a transmission error)";
        tokenInp.style.backgroundColor = 'lightsalmon';
    }
    return fetchSuccess;
}

async function fetchLoop(apiEndpointUrl) {
    while (1) {
        let promise = fetch(new Request(apiEndpointUrl, { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let data = await promise;
        let errorCode = data["code"];
        if (errorCode !== undefined) {
            if (errorCode != 429) {
                errorDiv.innerHTML = "Error (Code " + data["code"] + "): " + data["error"];
            }
            await new Promise(r => setTimeout(r, 10000));
            continue;
        }
        errorDiv.innerHTML = "";
        return data;
    }
}

async function fetchMultiplePages(apiEndpointUrl, progressBarId) {
    const pg = document.getElementById(progressBarId);
    pg.style.width = "0%";
    var data = await fetchLoop(apiEndpointUrl);
    const totPages = data["total_count"];
    const perPages = data["pages"]["per_page"];
    const loops = Math.ceil(totPages / perPages);
    var currentLoop = 0;
    var newData;
    var nextURL = data["pages"]["next_url"];
    while (nextURL != null) {
        newData = await fetchLoop(nextURL);
        data["data"].push(...newData["data"]);
        nextURL = newData["pages"]["next_url"];
        currentLoop++;
        pg.style.width = 100 * currentLoop / loops + "%";
    }
    pg.style.width = "100%";
    return await data;
}

async function fetchData() {
    let noreviewBool = noreview.checked;
    if (decodeFromCookie("reviewcheck") == -1) document.cookie += "reviewcheck=" + (+noreviewBool);
    if (noreviewBool) reviewProgress.style.display = "none";
    else reviewProgress.style.display = "block";
    reviewPg.style.backgroundColor = "palegoldenrod";
    blackOverlay.style.visibility = "visible";
    whiteOverlay.style.visibility = "visible";
    userData = await fetchLoop("https://api.wanikani.com/v2/user");
    [levelData,
        wordData,
        reviewData,
        resetData,
        subjectData] = await Promise.all([fetchMultiplePages("https://api.wanikani.com/v2/level_progressions", "levelpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/review_statistics", "wordpg"),
        noreviewBool ? -1 : fetchMultiplePages("https://api.wanikani.com/v2/reviews", "reviewpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/resets", "resetpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/subjects", "subjectpg")]);
    repairSubjectArray();
    createResetArray();
    if (reviewData !== -1) await reviewInfo();
    await new Promise(r => setTimeout(r, 50));
    blackOverlay.style.visibility = "hidden";
    whiteOverlay.style.visibility = "hidden";
    if (noreviewBool) reviewAll.style.display = "none";
    else reviewAll.style.display = "block";
    maindiv.style.visibility = "visible";
    loadGraphs();
}

function createResetArray() {
    for (let i = 0; i < resetData["data"].length; i++) {
        target = resetData["data"][i]["data"]["target_level"];
        resets.push([target, resetData["data"][i]["data"]["original_level"] - target, new Date(resetData["data"][i]["data"]["confirmed_at"])]);
    }
    resets.sort((a, b) => { return a[0] - b[0]; });
}

function repairSubjectArray() {
    subjectData["data"].push({ id: 0, object: "placeholder" });
    subjectData["data"].sort((a, b) => { return a["id"] - b["id"] });
    for (let i = 0; i < subjectData["data"].length; i++) if (subjectData["data"][i]["id"] != i) subjectData["data"].splice(i, 0, { id: i, object: "placeholder" });
}

async function loadGraphs() {
    userInfo();
    if (reviewData !== -1) updateReviewCharts();
    levelInfo();
    wordInfo();
}

function fixHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html
    return (div.innerHTML);
}

async function userInfo() {
    let userInfo = "";
    userInfo += fixHtml("<b>Username: ") + userData["data"]["username"] + "\n";
    userInfo += fixHtml("<b>Level: ") + userData["data"]["level"] + "\n";
    userInfo += fixHtml("<b>Subscription active: ") + userData["data"]["subscription"]["active"] + "\n";
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

async function reviewInfo() {
    newdatediv.style.visibility = "hidden";
    newdateinp.style.visibility = "hidden";
    newdatebtn.style.visibility = "hidden";

    // create array
    reviewPg.style.width = "0%";
    reviewPg.style.backgroundColor = "lightblue";
    var resetArray = [];
    reviewArray = [["Date", "Reviews"]];
    srsArray = [["Date", "Apprentice", "Guru", "Master", "Enlightened", "Burned"], [0,0,0,0,0,0]]
    var usedIds = [];
    let loadingLbl = document.getElementById("reviewloading");
    var found;
    const dataLength = reviewData["data"].length;
    for (let i = 0; i < dataLength; i++) {
        let currentReview = reviewData["data"][i]["data"];
        let subId = currentReview["subject_id"];
        // bare review data
        date = new Date(currentReview["created_at"].substring(0, 10));
        found = reviewArray.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (found != -1) {
            reviewArray[found][1]++;
        } else {
            newDate = [date, 1];
            reviewArray.push(newDate);
        }
        // srs review data
        typeStart = levelReorder(currentReview["starting_srs_stage"]);
        typeEnd = levelReorder(currentReview["ending_srs_stage"]);
        foundSrs = srsArray[srsArray.length - 1];
        if (foundSrs[0].valueOf() != date.valueOf()) {
            newDate = [...foundSrs];
            newDate[0] = date;
            srsArray.push(newDate);
        }
        foundSrs = srsArray.length - 1;
        srsArray[foundSrs][typeStart]--;
        foundId = usedIds.findIndex(element => element[0] == subId);
        if (foundId == -1) {
            usedIds.push([subId, typeEnd]);
            srsArray[foundSrs][typeEnd]++;
        } else usedIds[foundId][1] = typeEnd;
        srsArray[foundSrs][typeEnd]++;
        // srs reset
        exactDate = new Date(currentReview["created_at"]);
        let resetIndex = -1;
        for (let j = 0; j < resets.length; j++) {
            if (exactDate >= resets[j][2] && !resetArray.includes(j)) {
                resetIndex = j;
                break;
            }
        }
        if (resetIndex != -1) {
            let deleteIds = [];
            for (let k = 0; k < usedIds.length; k++) {
                console.log(k, usedIds[k], resets[resetIndex][0])
                if (subjectData["data"][usedIds[k][0]]["data"]["level"] >= resets[resetIndex][0]) {
                    deleteIds.push(k);
                    srsArray[foundSrs][usedIds[k][1]]--;
                }
            }
            console.log([...deleteIds]);
            for (var j = deleteIds.length - 1; j >= 0; j--) usedIds.splice(deleteIds[j], 1);
            resetArray.push(resetIndex);
        }
        if (i % 10000 == 0) {
            reviewPg.style.width = 100 * i / dataLength + "%";
            await new Promise(r => setTimeout(r, 50));
        }
    }
    srsArray.splice(1, 1);
    reviewPg.style.width = "100%";
    await new Promise(r => setTimeout(r, 50));
    if (reviewArray.length == 1) return;

    // fill undefined dates with 0
    let firstDate = reviewArray[1][0];
    let lastDate = reviewArray[reviewArray.length - 1][0];
    let currentDate = new Date(firstDate.getTime());
    let prevIndex = 1;
    while (currentDate < lastDate) {
        let addIndex = reviewArray.findIndex(element => Math.abs(element[0] - currentDate) < 43200000); // time in milliseconds for 12 hours
        if (addIndex == -1) {
            reviewArray.splice(prevIndex + 1, 0, [new Date(currentDate.getTime()), 0]);
            prevIndex++;
        } else prevIndex = addIndex;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // total reviews
    let runningTotal = 0;
    totalArray = [["Date", "Total Reviews"]];
    for (let i = 1; i < reviewArray.length; i++) {
        runningTotal += reviewArray[i][1];
        totalArray.push([reviewArray[i][0], runningTotal])
    }

    // averaged reviews
    runningTotal = 0;
    let averageLength = 5;
    averageArray = [["Date", "Average Reviews"]];
    for (let i = 1; i < reviewArray.length; i++) {
        runningTotal += reviewArray[i][1];
        if (i > averageLength) {
            runningTotal -= reviewArray[i-averageLength][1];
        }
        averageArray.push([reviewArray[i][0], parseInt(runningTotal / averageLength)]);
    }

    loadingLbl.innerHTML = "Time frame restricted to " + months + " months.";
    newdatediv.style.visibility = "visible";
    newdateinp.style.visibility = "visible";
    newdatebtn.style.visibility = "visible";
}

function dataDateShorten(dataPrev, date, nullify = false) {
    let data = [];
    for (let i = 1; i < dataPrev.length; i++) {
        data.push([...dataPrev[i]]);
    }
    if (data[0][0] > date) { return dataPrev; }
    let spliceIndex = data.findIndex(element => element[0] > date);
    if (spliceIndex == -1) { return dataPrev; }
    let prevData = data[spliceIndex - 1];
    let newData = data.slice(spliceIndex);
    if (nullify) { newData = newData.map(function (e) { for (let i = 1; i < prevData.length; i++) { e[i] -= prevData[i]; } return e; }); }
    newData = [dataPrev[0]].concat(newData);
    return newData;
}

async function updateReviewCharts() {
    months = Math.ceil(newdateinp.value);
    let until = new Date(new Date().setMonth(new Date().getMonth() - months));
    let nullifyBool = newdateche.checked;
    // reviews per day
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(reviewArray, until));
    var options = {
        title: 'Reviews Per Day',
        curveType: 'none',
        legend: { position: "none" },
        width: 1000,
        height: 333
    };
    var chartDiv = document.getElementById('reviewchart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    if (smoothBox.checked) updateReviewsPerDay();
    // total reviews
    chartData = google.visualization.arrayToDataTable(dataDateShorten(totalArray, until, nullifyBool));
    options = {
        title: 'Total Reviews',
        curveType: 'none',
        legend: { position: "none" },
        width: 1000,
        height: 333
    };
    chartDiv = document.getElementById('totalchart');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    // srs stacked
    chartData = google.visualization.arrayToDataTable(dataDateShorten(srsArray, until, nullifyBool));
    var options = {
        title: "Item Types Stacked",
        legend: { position: 'bottom' },
        connectSteps: true,
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black'],
        vAxis: {
            viewWindow: { min: 0 }
        },
        isStacked: true,
        width: 1000,
        height: 333
    };
    chartDiv = document.getElementById('srschart');
    chart = new google.visualization.SteppedAreaChart(chartDiv);
    chart.draw(chartData, options);
    // srs
    var options = {
        title: "Item Types",
        legend: { position: 'bottom' },
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black'],
        width: 1000,
        vAxis: {
            viewWindow: { min: 0 }
        },
        height: 333
    };
    chartDiv = document.getElementById('srschart2');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
}

async function updateReviewsPerDay() {
    months = Math.ceil(newdateinp.value);
    let until = new Date(new Date().setMonth(new Date().getMonth() - months));
    let smoothBool = smoothBox.checked;
    // reviews per day
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(smoothBool ? averageArray : reviewArray, until));
    var options = {
        title: smoothBool ? 'Reviews Per Day (Averaged)' : 'Reviews Per Day',
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: "none" },
        vAxis: {
            viewWindow: {min: 0}
        },
        width: 1000,
        height: 333
    };
    var chartDiv = document.getElementById('reviewchart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
}

function median(values) {
    if (values.length === 0) return 0;

    values.sort(function (a, b) {
        return a[1] - b[1];
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half][1];

    return (values[half - 1][1] + values[half][1]) / 2.0;
}

async function levelInfo() {
    // format level data
    var levelChart = [["Level", "Days", { role: 'style' }]];
    var currentLevel = levelData["data"][0];
    var j = 0;
    var level = 1;
    var resetLevels = [0, -1];
    while (currentLevel != null) {
        resetIndex = resets.findIndex(element => element[0] == level);
        if (resetIndex != -1 && resetLevels[1] < 0) {
            resetLevels = [resets[resetIndex][1]+1, resets[resetIndex][1]+1];
        }
        dateBefore = new Date(currentLevel["data"]["started_at"]);
        if (dateBefore == null) {
            j++; level++;
            currentLevel = levelData["data"][j];
            continue;
        }
        after = currentLevel["data"]["passed_at"] == null ? currentLevel["data"]["abandoned_at"] : currentLevel["data"]["passed_at"];
        if (after != null) {
            dateAfter = new Date(after);
        } else {
            dateAfter = new Date(Date.now());
        }
        let length = (dateAfter.getTime() - dateBefore.getTime()) / (3600000 * 24);
        console.log(length);
        length = length > 19000 ? 0 : length;
        if (resetLevels[0] != 0) {
            let lvlName = level + "R";
            while (levelChart.findIndex(element => element[0] == lvlName) != -1) {
                lvlName += "R";
            }
            levelChart.push([lvlName, length, 'lightsalmon']);
        } else {
            if (length >= 6.8 && length < 8) {
                levelChart.push([String(level), length, 'plum']);
            } else {
                levelChart.push([String(level), length, 'lightblue']);
            }
        }
        resetLevels[1]--;
        if (resetLevels[1] == 0) {
            level -= resetLevels[0];
            resetLevels[0] = 0;
        }
        j++; level++;
        currentLevel = levelData["data"][j];
    }
    if (levelChart.length == 1) return; // has not started
    let medianVal = median(levelChart.slice(1));
    levelChart[0].push("Median");
    for (let i = 1; i < levelChart.length; i++) levelChart[i].push(medianVal);

    // create chart
    newChartData = new google.visualization.arrayToDataTable(levelChart);
    var NumberFormat = new google.visualization.NumberFormat({ pattern: '##.#' });
    NumberFormat.format(newChartData, 1);
    var options = {
        title: 'Level Progression',
        bar: { groupWidth: "95%" },
        legend: { position: "none" },
        width: 1000,
        height: 333,
        vAxis: {
            viewWindow: {
                max: medianVal * 3
            }
        },
        seriesType: 'bars',
        series: {
            1: {
                type: 'line',
                color: 'black'
            }
        }
    };
    var chartDiv = document.getElementById('leveltimechart');
    var chart = new google.visualization.ComboChart(chartDiv);
    chart.draw(newChartData, options);

    // projection
    levelChart.splice(0, 1);
    var time = levelChart.reduce((partialSum, a) => partialSum + a[1], 0);
    let averageVal = time / levelChart.length;
    var average = parseInt(averageVal * (60 - level)); // extrapolating average time until now
    var medianPro = parseInt(medianVal * (60 - level));
    average = average >= 0 ? average : 0;
    var lbl = document.getElementById("future");
    lbl.innerHTML = fixHtml("<b>Time since start: ") + parseInt(time) + " days\n"
        + fixHtml("<b>Median Projection (time until level 60): ") + medianPro + " days\n"
        + fixHtml("<b>Average Projection (time until level 60): ") + average + " days\n"
        + fixHtml("<b>Median Level-Up: ") + Math.round(medianVal * 10) / 10 + " days\n"
        + fixHtml("<b>Average Level-Up: ") + Math.round(averageVal * 10) / 10 + " days";
}

async function wordInfo() {
    // create array
    var kd;
    var wordBubble = [["Meaning", "Reading", { role: "style" }, { role: "tooltip" }]];
    var kanjiInterpolator = d3.interpolateRgb("#FFC3D4", "#A26174 ");
    var radicalInterpolator = d3.interpolateRgb("lightblue", "darkblue");
    var vocabInterpolator = d3.interpolateRgb("#D5BAFF", "#6733B4");
    var percentages = [["Date", "Accuracy"]];
    var totals = [["Date", "Accuracy"]];
    var bestWords = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWords = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsR = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsR = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsK = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsK = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsV = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsV = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var foundDate;
    var type;
    var date;
    var id;
    var cor;
    var inc;
    var used = [];
    for (let i = 0; i < wordData["data"].length; i++) {
        currentData = wordData["data"][i];
        updatedAt = currentData["data_updated_at"];
        currentData = currentData["data"];
        id = currentData["subject_id"];
        if (used.findIndex(element => (element == id)) != -1) continue;
        else used.push(id);
        cor = currentData["meaning_correct"] + currentData["reading_correct"];
        inc = currentData["meaning_incorrect"] + currentData["reading_incorrect"];
        if (cor == 0 && inc == 0) continue;
        kdHun = currentData["percentage_correct"];
        kd = kdHun / 100;
        kdWeight = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"] + 0.001) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"] + 0.001)) / 2
        let name = subjectData["data"][id]["data"]["characters"];
        if (name == null) name = subjectData["data"][id]["data"]["slug"];
        type = currentData["subject_type"];
        interpolator = type == "vocabulary" ? vocabInterpolator : (type == "kanji" ? kanjiInterpolator : radicalInterpolator)
        wordBubble.push([currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"]) * 100, currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"]) * 100, interpolator(subjectData["data"][id]["data"]["level"]/userData["data"]["level"]), name]);
        foundBest = bestWords.findIndex(element => (element[0] < kdWeight));
        foundWorst = worstWords.findIndex(element => (element[0] > kdWeight));
        foundBestR = bestWordsR.findIndex(element => (element[0] < kdWeight));
        foundWorstR = worstWordsR.findIndex(element => (element[0] > kdWeight));
        foundBestK = bestWordsK.findIndex(element => (element[0] < kdWeight));
        foundWorstK = worstWordsK.findIndex(element => (element[0] > kdWeight));
        foundBestV = bestWordsV.findIndex(element => (element[0] < kdWeight));
        foundWorstV = worstWordsV.findIndex(element => (element[0] > kdWeight));
        date = new Date(updatedAt.substring(0, 10));
        foundDate = percentages.findIndex(element => (element[0].valueOf() == date.valueOf()));
        if (foundDate == -1) {
            percentages.push([date, kdHun]);
            totals.push([date, 1]);
        } else {
            percentages[foundDate][1] += kdHun;
            totals[foundDate][1]++;
        }
        if (foundBest != -1) {
            bestWords[foundBest] = [kdWeight, kd, name, cor, inc];
        }
        if (type == "radical" && foundBestR != -1) {
            bestWordsR[foundBestR] = [kdWeight, kd, name, cor, inc];
        } else if (type == "kanji" && foundBestK != -1) {
            bestWordsK[foundBestK] = [kdWeight, kd, name, cor, inc];
        } else if (type == "vocabulary" && foundBestV != -1) {
            bestWordsV[foundBestV] = [kdWeight, kd, name, cor, inc];
        }
        if (foundWorst != -1) {
            worstWords[foundWorst] = [kdWeight, kd, name, cor, inc];
        }
        if (type == "radical" && foundWorstR != -1) {
            worstWordsR[foundWorstR] = [kdWeight, kd, name, cor, inc];
        } else if (type == "kanji" && foundWorstK != -1) {
            worstWordsK[foundWorstK] = [kdWeight, kd, name, cor, inc];
        } else if (type == "vocabulary" && foundWorstV != -1) {
            worstWordsV[foundWorstV] = [kdWeight, kd, name, cor, inc];
        }
    }
    for (let i = 1; i < percentages.length; i++) {
        percentages[i][1] /= totals[i][1];
    }
    percentages.sort((a, b) => {
        return a[0].valueOf() - b[0].valueOf();
    });

    // bubble chart
    var chartData = google.visualization.arrayToDataTable(wordBubble);
    var options = {
        title: 'Word Overview (Blue: Radical, Red: Kanji, Purple: Vocabulary)',
        hAxis: { title: 'Meaning (%)' },
        vAxis: { title: 'Reading (%)' },
        legend: { position: 'none' },
        bubble: { textStyle: { fontSize: 11 } },
        width: 900,
        height: 500
    };
    var chartDiv = document.getElementById('wordbubblechart');
    var chart = new google.visualization.ScatterChart(chartDiv);
    chart.draw(chartData, options);
    
    // percentage chart
    chartData = google.visualization.arrayToDataTable(percentages);
    var options = {
        title: 'Accuracy',
        curveType: 'none',
        legend: { position: 'none' },
        width: 750,
        height: 333
    };
    chartDiv = document.getElementById('percentagechart');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);

    hallCreation(bestWords, "topwords", "Wall of Fame: All", "black");
    hallCreation(worstWords, "worstwords", "Wall of Shame: All", "black");
    hallCreation(bestWordsR, "topwordsradical", "Wall of Fame: Radicals", "lightblue");
    hallCreation(worstWordsR, "worstwordsradical", "Wall of Shame: Radicals", "lightblue");
    hallCreation(bestWordsK, "topwordskanji", "Wall of Fame: Kanji", "pink");
    hallCreation(worstWordsK, "worstwordskanji", "Wall of Shame: Kanji", "pink");
    hallCreation(bestWordsV, "topwordsvocab", "Wall of Fame: Vocabulary", "purple");
    hallCreation(worstWordsV, "worstwordsvocab", "Wall of Shame: Vocabulary", "purple");
}

async function hallCreation(words, divid, titleChart, colorChart) {
    let chartDiv = document.getElementById(divid);
    data = [["Radical", "Percentage", { role: 'annotation' }]];
    for (let i = 0; i < words.length; i++) data.push([words[i][2], words[i][1]*100, words[i][3]+"/"+words[i][4]]);
    chartData = google.visualization.arrayToDataTable(data);
    options = {
        title: titleChart,
        colors: [colorChart],
        legend: { position: "none" },
        vAxis: {
            viewWindow: {
                max: 100,
                min: 0
            }
        },
        width: 1000,
        height: 333
    };
    chartDiv = document.getElementById(divid);
    chart = new google.visualization.ColumnChart(chartDiv);
    chart.draw(chartData, options);
}

let decodedReviewCheck = decodeFromCookie("reviewcheck");
if (decodedReviewCheck != -1) reviewBox.checked = !!+decodedReviewCheck;
let decodedCookie = decodeFromCookie("token");
if (decodedCookie !== -1) {
    document.getElementById("tokeninput").value = decodedCookie;
    getApiToken();
}