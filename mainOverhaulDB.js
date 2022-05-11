// load packages
google.charts.load('current', { 'packages': ['corechart', 'bar'] });

// API vars
var apiToken;
var requestHeaders;
var db;

// elements
const maindivs = document.getElementsByClassName("allinfo");
const newdatediv = document.getElementById("newdatediv");
const newdateinp = document.getElementById("newdateinp");
const newdatebtn = document.getElementById("newdatebtn");
const newdateche = document.getElementById("nullify");
const smoothInp = document.getElementById("smoothreview");
const smoothAccInp = document.getElementById("smoothacc");
const errorDiv = document.getElementById("errordiv");
const tokenInp = document.getElementById("tokeninput");
const blackOverlay = document.getElementById("blackoverlay");
const whiteOverlay = document.getElementById("whiteoverlay");
const reviewProgress = document.getElementById("reviewprogress");
const reviewAll = document.getElementById("reviewall");
const wordAll = document.getElementById("wordall");
const projectionsAll = document.getElementById("projectionsall");
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
var reviewAccuracy = [];
var months = 12;

// event listener
newdateche.addEventListener('change', () => {
    updateReviewCharts();
})

// idb
async function idbCount(db, name) {
    return await new Promise((resolve, reject) => {
        const txn = db.transaction(name, 'readonly');
        const store = txn.objectStore(name);
        let query = store.count(); // data
        // success
        query.onsuccess = function (event) {
            resolve(event.target.result);
        };
        // error
        query.onerror = function (event) {
            reject(event.target.errorCode);
        }
    });
}

async function idbInsert(db, name, apit, data) {
    return await new Promise((resolve, reject) => {
        const txn = db.transaction(name, 'readwrite');
        // get object store
        const store = txn.objectStore(name);
        let query = store.put(data, apit);
        // success
        query.onsuccess = function (event) {
            resolve(true);
        };
        // error
        query.onerror = function (event) {
            reject(event.target.errorCode);
        }
    });
}

async function idbFetch(db, name, ind, apit) {
    return await new Promise((resolve, reject) => {
        const txn = db.transaction(name, 'readonly');
        const store = txn.objectStore(name);
        const index = store.index(ind);
        let query = index.get(apit);
        //var returnValue;
        // success
        query.onsuccess = (event) => {
            if (event.target.result) {
                //returnValue = event.target.result;
                resolve(event.target.result);
            } else resolve(undefined);
        };
        //error
        query.onerror = (event) => {
            reject(event.target.errorCode);
        }
    });
}

async function idbRemove(db, name, apit) {
    return await new Promise((resolve, reject) => {
        const txn = db.transaction(name, 'readwrite');
        const store = txn.objectStore(name);
        let query = store.delete(apit);
        // success
        query.onsuccess = function (event) {
            resolve(true);
        };
        // error
        query.onerror = function (event) {
            reject(event.target.errorCode);
        }
    });
}

async function idbClear(db, name) {
    return await new Promise((resolve, reject) => {
        const txn = db.transaction(name, 'readwrite');
        const store = txn.objectStore(name);
        let query = store.clear();
        // success
        query.onsuccess = function (event) {
            resolve(true);
        };
        // error
        query.onerror = function (event) {
            reject(event.target.errorCode);
        }
    });
}

// main code
newdateinp.value = months;

async function getApiToken() {
    apiToken = tokenInp.value;
    setCookie("api", apiToken, 365);
    requestHeaders = new Headers({ 'Wanikani-Revision': '20170710', Authorization: 'Bearer ' + apiToken });
    if (await fetchTestApi() == true) fetchData();
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

async function fetchTestApi() {
    var fetchSuccess = false;
    let promise = fetch(new Request("https://api.wanikani.com/v2/subjects/1", { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    let data = await promise;
    if (data["object"] == "radical") {
        fetchSuccess = true;
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
            } else {
                console.log("Don't mind this error. No data is lost. The data will continue to downloaded once the throttling by the API ends.");
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

async function renewCache() {
    return await new Promise((resolve, reject) => {
        const request = indexedDB.open('userdata', 1);

        request.onerror = (event) => { // fails to open
            console.error(`IndexedDatabase error: ${event.target.errorCode}`);
            reject(`IndexedDatabase error: ${event.target.errorCode}`);
        };

        request.onsuccess = async (event) => { // main code
            db = await event.target.result;
            await idbClear(db, "reviews");
            await window.indexedDB.deleteDatabase("userdata");
            db.close();
            window.location.reload();
            resolve(true);
        };
    })
}

async function reviewCacheHandler(apiEndpointUrl, progressBarId) {
    return await new Promise((resolve, reject) => {
        const request = indexedDB.open('userdata', 1);

        request.onerror = (event) => { // fails to open
            console.error(`IndexedDatabase error: ${event.target.errorCode}`);
            reject(`IndexedDatabase error: ${event.target.errorCode}`);
        };

        request.onsuccess = async (event) => { // main code
            db = await event.target.result;

            // delete if over 4 chached
            let objCount = await idbCount(db, "reviews");
            if (objCount > 4) await idbClear(db, "reviews");
            // handle review data
            var reviews = await idbFetch(db, "reviews", "apitoken", apiToken);
            
            if (reviews == undefined) {
                reviews = await fetchMultiplePages(apiEndpointUrl, progressBarId);
                reviews["apitoken"] = apiToken;
                await idbInsert(db, "reviews", apiToken, reviews);
                console.log(reviews);
                resolve(reviews);
            }

            const reviewpg = document.getElementById(progressBarId);
            reviewpg.innerHTML = "Caching...";
            try { var lastDate = new Date(reviews["data"][reviews["data"].length - 1]["data_updated_at"]);
            } catch (e) { lastDate = new Date(1000);}
            lastDate = new Date(lastDate.getTime() - 1000).toISOString();
            var idReached = false;
            try { var lastId = reviews["data"][reviews["data"].length - 1]["id"];
            } catch (e) { idReached = true; }
            let newReviews = await fetchMultiplePages(apiEndpointUrl + "?updated_after=" + lastDate, progressBarId);
            for (let i = 0; i < newReviews["data"].length; i++) {
                if (idReached) reviews["data"].push(newReviews["data"][i]);
                if (!idReached && newReviews["data"][i]["id"] == lastId) idReached = true;
            }

            reviews["apitoken"] = apiToken;
            await idbInsert(db, "reviews", apiToken, reviews);
            reviewpg.innerHTML = "";
            resolve(reviews);
        };

        request.onupgradeneeded = (event) => { // first time opening -> create structure
            let db = event.target.result;
            // store review 
            let store = db.createObjectStore('reviews');
            // index for apitoken
            let index = store.createIndex('apitoken', 'apitoken', { unique: true });
        };
    });
}

async function fetchData() {
    userData = [];reviewData = [];reviewArray = [];totalArray = [];averageArray = [];srsArray = [];levelData = [];wordData = [];resetData = [];resets = [];subjectData = [];months = 12;
    reviewPg.style.backgroundColor = "palegoldenrod";
    for (const maindiv of maindivs) maindiv.style.display = "none";
    blackOverlay.style.visibility = "visible";
    whiteOverlay.style.visibility = "visible";
    userData = await fetchLoop("https://api.wanikani.com/v2/user");
    [levelData,
        wordData,
        reviewData,
        resetData,
        subjectData] = await Promise.all([fetchMultiplePages("https://api.wanikani.com/v2/level_progressions", "levelpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/review_statistics", "wordpg"),
        reviewCacheHandler("https://api.wanikani.com/v2/reviews", "reviewpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/resets", "resetpg"),
        fetchMultiplePages("https://api.wanikani.com/v2/subjects", "subjectpg")]);
    repairSubjectArray();
    createResetArray();
    if (reviewData !== -1) await reviewInfo();
    await new Promise(r => setTimeout(r, 50));
    db.close();
    blackOverlay.style.visibility = "hidden";
    whiteOverlay.style.visibility = "hidden";
    for (const maindiv of maindivs) maindiv.style.display = "block";
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
    levelInfo();
    wordInfo();
    updateReviewCharts();
    updateReviewAccuracy();
}

function fixHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html
    return (div.innerHTML);
}

async function userInfo() {
    let userInfo = "";
    userInfo += fixHtml("<b>Username: ") + userData["data"]["username"] + "\n";
    userInfo += fixHtml("<b>Current Level: ") + userData["data"]["level"] + "\n";
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
    // create array
    reviewAll.style.display = "block";
    const dataLength = reviewData["data"].length;
    if (dataLength == 0) { reviewAll.style.display = "none"; return; }
    reviewPg.style.width = "0%";
    reviewPg.style.backgroundColor = "lightblue";
    var resetArray = [];
    reviewArray = [["Date", "Reviews"]];
    srsArray = [["Date", "Apprentice", "Guru", "Master", "Enlightened", "Burned"], [0, 0, 0, 0, 0, 0]];
    var usedIds = [];
    var found;
    reviewAccuracy = [["Date", "Radical", "Kanji", "Vocab", "All"], [1, 1, 1, 1, 1]];
    var reviewAccTotal = [1, 1, 1, 1];
    var correct;
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
        correct = currentReview["starting_srs_stage"] < currentReview["ending_srs_stage"] ? 1 : 0;
        typeStart = levelReorder(currentReview["starting_srs_stage"]);
        typeEnd = levelReorder(currentReview["ending_srs_stage"]);
        foundSrs = srsArray[srsArray.length - 1];
        if (foundSrs[0].valueOf() != date.valueOf()) {
            newDate = [...foundSrs];
            newDate[0] = date;
            srsArray.push(newDate);
            for (let i = 0; i < reviewAccTotal.length; i++) {
                let value = (reviewAccTotal[i] != 0 ?
                    reviewAccuracy[reviewAccuracy.length - 1][i + 1] / reviewAccTotal[i] * 100 :
                    reviewAccuracy[reviewAccuracy.length - 2][i + 1]);
                value = value == 0 ? reviewAccuracy[reviewAccuracy.length - 2][i + 1] : value;
                reviewAccuracy[reviewAccuracy.length - 1][i + 1] = value;
            }
            reviewAccuracy.push([date, 0, 0, 0, 0]);
            reviewAccTotal = [0, 0, 0, 0];
        }
        foundSrs = srsArray.length - 1;
        srsArray[foundSrs][typeStart]--;
        foundId = usedIds.findIndex(element => element[0] == subId);
        if (foundId == -1) {
            usedIds.push([subId, typeEnd]);
            srsArray[foundSrs][typeEnd]++;
        } else usedIds[foundId][1] = typeEnd;
        srsArray[foundSrs][typeEnd]++;
        // review acc
        let accLength = reviewAccuracy.length - 1;
        reviewAccuracy[accLength][4] += correct;
        reviewAccTotal[3]++;
        switch (subjectData["data"][subId]["object"]) {
            case "vocabulary":
                reviewAccuracy[accLength][3] += correct;
                reviewAccTotal[2]++;
                break;
            case "kanji":
                reviewAccuracy[accLength][2] += correct;
                reviewAccTotal[1]++;
                break;
            case "radical":
                reviewAccuracy[accLength][1] += correct;
                reviewAccTotal[0]++;
                break;
        }
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
                if (subjectData["data"][usedIds[k][0]]["data"]["level"] >= resets[resetIndex][0]) {
                    deleteIds.push(k);
                    srsArray[foundSrs][usedIds[k][1]]--;
                }
            }
            for (var j = deleteIds.length - 1; j >= 0; j--) usedIds.splice(deleteIds[j], 1);
            resetArray.push(resetIndex);
        }
        if (i % 10000 == 0) {
            reviewPg.style.width = 100 * i / dataLength + "%";
            await new Promise(r => setTimeout(r, 50));
        }
    }
    srsArray.splice(1, 1);
    reviewAccuracy.splice(1, 1);
    for (let i = 0; i < reviewAccTotal.length; i++) {
        let value = (reviewAccTotal[i] != 0 ?
            reviewAccuracy[reviewAccuracy.length - 1][i + 1] / reviewAccTotal[i] * 100 :
            reviewAccuracy[reviewAccuracy.length - 2][i + 1]);
        value = value == 0 ? reviewAccuracy[reviewAccuracy.length - 2][i + 1] : value;
        reviewAccuracy[reviewAccuracy.length - 1][i + 1] = value;
    }
    reviewPg.style.width = "100%";
    await new Promise(r => setTimeout(r, 50));

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
    const loadingLbl = document.getElementById("reviewloading");
    loadingLbl.innerHTML = "Time frame restricted to " + months + " months.";
    let until = new Date(new Date().setMonth(new Date().getMonth() - months));
    let nullifyBool = newdateche.checked;
    if (reviewArray.length == 0) return;
    // reviews per day
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(reviewArray, until));
    var options = {
        chartArea: { width: '90%', height: '85%' },
        hAxis: { textPosition: 'in' },
        title: 'Reviews Per Day',
        curveType: 'none',
        legend: { position: "none" },
        width: 1000,
        height: 333
    };
    var chartDiv = document.getElementById('reviewchart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    updateReviewsPerDay();
    // total reviews
    chartData = google.visualization.arrayToDataTable(dataDateShorten(totalArray, until, nullifyBool));
    options = {
        chartArea: { width: '100%', height: '85%' },
        hAxis: { textPosition: 'in' }, vAxis: { textPosition: 'in' },
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
        chartArea: { width: '100%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'bottom' }, vAxis: { textPosition: 'in' },
        //title: "Item Types Stacked",
        connectSteps: true,
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black'],
        isStacked: true,
        width: 1000,
        height: 333
    };
    chartDiv = document.getElementById('srschart');
    chart = new google.visualization.SteppedAreaChart(chartDiv);
    chart.draw(chartData, options);
    // srs
    var options = {
        chartArea: { width: '100%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'bottom' }, vAxis: { textPosition: 'in' },
        //title: "Item Types",
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black'],
        width: 1000,
        height: 333
    };
    chartDiv = document.getElementById('srschart2');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
}

async function updateReviewAccuracy() {
    const dayAverage = smoothAccInp.value;
    let smoothBool = (dayAverage != 0);
    // array
    if (smoothBool) {
        var runningTotal = [0, 0, 0, 0];
        var averageArray = [["Date", "Average Radical", "Average Kanji", "Average Vocab", "Average All"]];
        var average = [0, 0, 0, 0];
        for (let i = 1; i < reviewAccuracy.length; i++) {
            for (let j = 0; j < runningTotal.length; j++) runningTotal[j] += reviewAccuracy[i][j + 1];
            if (i > dayAverage) {
                for (let j = 0; j < runningTotal.length; j++) runningTotal[j] -= reviewAccuracy[i - dayAverage][j + 1];
                for (let j = 0; j < average.length; j++) average[j] = runningTotal[j] / dayAverage;
            } else for (let j = 0; j < average.length; j++) average[j] = runningTotal[j] / i;
            averageArray.push([reviewAccuracy[i][0], ...average]);
        }
    }
    // timeframe
    months = Math.ceil(newdateinp.value);
    let until = new Date(new Date().setMonth(new Date().getMonth() - months));
    // review accuracy
    chartData = google.visualization.arrayToDataTable(dataDateShorten(smoothBool ? averageArray : reviewAccuracy, until));
    var options = {
        chartArea: { width: '80%', height: '80%' },
        title: smoothBool ? 'Review Accuracy (Averaged over ' + dayAverage + ' days)' : 'Review Accuracy',
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
        vAxis: {
            viewWindow: {
                max: 100
            }
        },
        colors: ['#55abf2', '#f032b1', '#bb31de', 'black'],
        width: 1000,
        height: 333
    };
    chart = new google.visualization.LineChart(document.getElementById('percentagechart'));
    chart.draw(chartData, options);
}

async function updateReviewsPerDay() {
    const dayAverage = smoothInp.value;
    let smoothBool = (dayAverage != 0);
    // array
    if (smoothBool) {
        runningTotal = 0;
        averageArray = [["Date", "Average Reviews"]];
        var average;
        for (let i = 1; i < reviewArray.length; i++) {
            runningTotal += reviewArray[i][1];
            if (i > dayAverage) {
                runningTotal -= reviewArray[i - dayAverage][1];
                average = runningTotal / dayAverage;
            } else average = runningTotal / i;
            averageArray.push([reviewArray[i][0], parseInt(average)]);
        }
    }
    // timeframe
    months = Math.ceil(newdateinp.value);
    let until = new Date(new Date().setMonth(new Date().getMonth() - months));
    // reviews per day
    var chartData = google.visualization.arrayToDataTable(dataDateShorten(smoothBool ? averageArray : reviewArray, until));
    var options = {
        chartArea: { width: '90%', height: '85%' },
        hAxis: { textPosition: 'in' },
        title: smoothBool ? 'Reviews Per Day (Averaged over ' + dayAverage + ' days)' : 'Reviews Per Day',
        curveType: smoothBool ? 'function' : 'none',
        legend: { position: 'none' },
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
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

async function levelInfo() {
    // format level data
    projectionsAll.style.display = "block";
    var levelChart = [["Level", "Days", { role: 'style' }]];
    var levelLengths = [];
    var shortLevels = [43, 44, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 1, 2];
    var currentLevel = levelData["data"][0];
    var j = 0;
    var level = 1;
    var resetLevels = [0, -1];
    while (currentLevel != null) {
        resetIndex = resets.findIndex(element => element[0] == level);
        if (resetIndex != -1 && resetLevels[1] < 0) {
            resetLevels = [resets[resetIndex][1] + 1, resets[resetIndex][1] + 1];
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
        length = length > 19000 ? 0 : length;
        if (resetLevels[0] != 0) {
            let lvlName = level + "R";
            while (levelChart.findIndex(element => element[0] == lvlName) != -1) {
                lvlName += "R";
            }
            levelChart.push([lvlName, length, 'lightsalmon']);
        } else {
            if (level != userData["data"]["level"]) {
                levelLengths.push(length);
                if (shortLevels.includes(level)) { var primaryTime = 3.5; var secondaryTime = 4; }
                else { var primaryTime = 7; var secondaryTime = 8; }
                if (length < primaryTime) {
                    levelChart.push([String(level), length, '#EEBC1D']); //darkgold
                } else if (length < secondaryTime) {
                    levelChart.push([String(level), length, 'plum']);
                } else {
                    levelChart.push([String(level), length, 'lightblue']);
                }
            } else levelChart.push([String(level), length, 'lightgrey']);
        }
        resetLevels[1]--;
        if (resetLevels[1] == 0) {
            level -= resetLevels[0];
            resetLevels[0] = 0;
        }
        j++; level++;
        currentLevel = levelData["data"][j];
    }
    if (reviewData["data"].length == 0) projectionsAll.style.display = "none"; // user has not started
    let medianVal = median(levelLengths);
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
    var time = levelLengths.reduce((partialSum, a) => partialSum + a, 0);
    let averageVal = time / levelLengths.length;
    var average = level > 45 ? parseInt(averageVal * (60 - level) / 2) : parseInt(averageVal * (53 - level)); // extrapolating average time until now
    var medianPro = level > 45 ? parseInt(medianVal * (60 - level) / 2) : parseInt(medianVal * (53 - level)); // levels 46, 47, 49, 50-60 half as long
    average = average >= 0 ? average : 0;
    var lbl = document.getElementById("future");
    lbl.innerHTML = fixHtml("<b>Time Since Start: ") + parseInt(time) + " days\n"
        + fixHtml("<b>Median Level-Up: ") + Math.round(medianVal * 10) / 10 + " days\n"
        + " => level 60 in " + (medianPro < 0 ? 0 : medianPro) + " days\n"
        + fixHtml("<b>Average Level-Up: ") + Math.round(averageVal * 10) / 10 + " days\n"
        + " => level 60 in " + (average < 0 ? 0 : average) + " days";
}

async function wordInfo() {
    // create array
    wordAll.style.display = "block";
    if (reviewData["data"].length == 0) { wordAll.style.display = "none"; return; }
    var kd;
    var doneCounts = [0, 0, 0];
    var kanjiWall = "";
    var wordBubble = [["Meaning", "Reading", { role: "style" }, { role: "tooltip" }]];
    var radBubble = [["Accuracy", "Level", { role: "style" }, { role: "tooltip" }]]
    var kanjiInterpolator = d3.interpolateRgb("#FFC3D4", "#A26174 ");
    var radicalInterpolator = d3.interpolateRgb("lightblue", "darkblue");
    var vocabInterpolator = d3.interpolateRgb("#D5BAFF", "#6733B4");
    var bestWords = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWords = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsR = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsR = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsK = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsK = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsV = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsV = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var type;
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
        if (type != "radical") wordBubble.push([currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"]) * 100, currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"]) * 100, interpolator(subjectData["data"][id]["data"]["level"]/userData["data"]["level"]), name]);
        else radBubble.push([kdHun, cor+inc, interpolator(subjectData["data"][id]["data"]["level"] / userData["data"]["level"]), name])
        foundBest = bestWords.findIndex(element => (element[0] < kdWeight));
        foundWorst = worstWords.findIndex(element => (element[0] > kdWeight));
        foundBestR = bestWordsR.findIndex(element => (element[0] < kdWeight));
        foundWorstR = worstWordsR.findIndex(element => (element[0] > kdWeight));
        foundBestK = bestWordsK.findIndex(element => (element[0] < kdWeight));
        foundWorstK = worstWordsK.findIndex(element => (element[0] > kdWeight));
        foundBestV = bestWordsV.findIndex(element => (element[0] < kdWeight));
        foundWorstV = worstWordsV.findIndex(element => (element[0] > kdWeight));
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
        switch (type) { // count words already learned
            case "vocabulary":
                doneCounts[2]++;
                break;
            case "kanji":
                doneCounts[1]++;
                kanjiWall += name;
                break;
            case "radical":
                doneCounts[0]++;
                break;
        }
    }

    // kanji wall
    document.getElementById('kanjiwall').innerHTML = kanjiWall;

    // word progress
    var totalCounts = [0, 0, 0];
    for (const subject of subjectData["data"]) {
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
    const wordProgressData = [["Type", "Count", { role: "tooltip" }],
        ["Radical Learned", doneCounts[0], doneCounts[0] / totalCounts[0] * 100], ["Kanji Learned", doneCounts[1], doneCounts[1] / totalCounts[1] * 100], ["Vocab Learned", doneCounts[2], doneCounts[1] / totalCounts[1] * 100],
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
        height: 300
    };
    var chart = new google.visualization.PieChart(document.getElementById('wordprogress'));
    chart.draw(chartData, options);
    document.getElementById('wordprogressinfo').innerHTML = fixHtml("<b>Total Percentage Learned: ") + Math.round((doneCounts[0] + doneCounts[1] + doneCounts[2]) / (totalCounts[0] + totalCounts[1] + totalCounts[2]) * 1000) / 10 + " %"

    // word bubble chart
    var chartData = google.visualization.arrayToDataTable(wordBubble);
    var options = {
        chartArea: { width: '85%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'in' }, vAxis: { textPosition: 'in' },
        title: 'Word Overview (Red: Kanji; Purple: Vocabulary; Lightness: WK Level)',
        hAxis: { title: 'Meaning (%)' },
        vAxis: { title: 'Reading (%)' },
        legend: { position: 'none' },
        bubble: { textStyle: { fontSize: 11 } },
        width: 900,
        height: 700
    };
    var chartDiv = document.getElementById('wordbubblechart');
    var chart = new google.visualization.ScatterChart(chartDiv);
    chart.draw(chartData, options);

    // radical bubble chart
    var chartData = google.visualization.arrayToDataTable(radBubble);
    var options = {
        chartArea: { width: '85%', height: '80%' },
        hAxis: { textPosition: 'in' }, vAxis: { textPosition: 'in' },
        title: 'Radical Overview (Lightness: WK Level)',
        hAxis: { title: 'Accuracy (%)' },
        vAxis: { title: 'Amount Reviewed', format: '0'},
        legend: { position: 'none' },
        bubble: { textStyle: { fontSize: 11 } },
        width: 900,
        height: 700
    };
    var chartDiv = document.getElementById('radbubblechart');
    var chart = new google.visualization.ScatterChart(chartDiv);
    chart.draw(chartData, options);

    hallCreation(bestWords, "topwords", "Wall of Fame: All", "black");
    hallCreation(worstWords, "worstwords", "Wall of Shame: All", "black");
    hallCreation(bestWordsR, "topwordsradical", "Wall of Fame: Radicals", '#55abf2');
    hallCreation(worstWordsR, "worstwordsradical", "Wall of Shame: Radicals", '#55abf2');
    hallCreation(bestWordsK, "topwordskanji", "Wall of Fame: Kanji", '#f032b1');
    hallCreation(worstWordsK, "worstwordskanji", "Wall of Shame: Kanji", '#f032b1');
    hallCreation(bestWordsV, "topwordsvocab", "Wall of Fame: Vocabulary", '#bb31de');
    hallCreation(worstWordsV, "worstwordsvocab", "Wall of Shame: Vocabulary", '#bb31de');
}

async function hallCreation(words, divid, titleChart, colorChart) {
    let chartDiv = document.getElementById(divid);
    data = [["Radical", "Percentage", { role: 'annotation' }]];
    for (let i = 0; i < words.length; i++) data.push([words[i][2], words[i][1]*100, words[i][3]+"/"+words[i][4]]);
    chartData = google.visualization.arrayToDataTable(data);
    options = {
        chartArea: { width: '100%', height: '80%' },
        legend: { position: 'in' },
        hAxis: { textPosition: 'in' }, vAxis: { textPosition: 'in' },
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

let decodedCookie = getCookie("api");
if (decodedCookie !== null) {
    tokenInp.value = decodedCookie;
    getApiToken();
}