var apiToken;
var requestHeaders;
var months = 18;

google.charts.load('current', { 'packages': ['corechart'] });
google.charts.load('current', { 'packages': ['bar'] });

function fixHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html
    return (div.innerHTML);
}

async function userinfo() {
    let promise = fetch(new Request('https://api.wanikani.com/v2/user', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    s = await promise;
    var userInfo = "";
    userInfo += fixHtml("<b>Username: ") + s["data"]["username"] + "\n";
    userInfo += fixHtml("<b>Level: ") + s["data"]["level"] + "\n";
    userInfo += fixHtml("<b>Subscription active: ") + s["data"]["subscription"]["active"] + "\n";
    var lbl = document.getElementsByClassName("userinfo")[0];
    lbl.innerHTML = userInfo;
}

async function reviewinfo() {
    var until = new Date(new Date().setMonth(new Date().getMonth() - months));
    until = until.toISOString();
    console.log(until);
    let promise = fetch(new Request('https://api.wanikani.com/v2/reviews'+'?updated_after='+until, {method: 'GET', headers: requestHeaders}))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promise;
    let firstId = data["data"][0]["id"];
    let promiseNew = fetch(new Request('https://api.wanikani.com/v2/reviews' + '?page_after_id=' + firstId, { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promiseNew;

    // create array
    var totPages = data["total_count"];
    var perPages = data["pages"]["per_page"]
    var loops = Math.ceil(totPages / perPages);
    console.log(loops);
    var reviewData = data["data"];
    var orderedData = [["Date", "Reviews"]];
    var srsStages = [["Date", "Apprentice", "Guru", "Master", "Enlightened", "Burned"], [0,0,0,0,0,0]]
    var currentData;
    var date;
    var usedIds = [];
    var newDate;
    var j;
    var loadingLbl = document.getElementById("reviewloading");
    var found;
    for (let i = 0; i < loops; i++) {
        j = 0;
        currentData = reviewData[0];
        while (currentData != null) {
            currentData = currentData["data"];
            subId = currentData["subject_id"];
            date = new Date(currentData["created_at"].substring(0, 10));
            found = orderedData.findIndex(element => (element[0].valueOf() == date.valueOf()));
            foundSrs = srsStages.findIndex(element => (element[0].valueOf() == date.valueOf()));
            typeStart = currentData["starting_srs_stage"];
            if (typeStart <= 4) {
                typeStart = 1;
            } else if (typeStart <= 6) {
                typeStart = 2;
            } else if (typeStart == 7) {
                typeStart = 3;
            } else if (typeStart == 8) {
                typeStart = 4
            } else {
                typeStart = 5
            }
            typeEnd = currentData["ending_srs_stage"];
            if (typeEnd <= 4) {
                typeEnd = 1;
            } else if (typeEnd <= 6) {
                typeEnd = 2;
            } else if (typeEnd == 7) {
                typeEnd = 3;
            } else if (typeEnd == 8) {
                typeEnd = 4
            } else {
                typeEnd = 5
            }
            if (found != -1) {
                orderedData[found][1]++;
            } else {
                newDate = [date, 1];
                orderedData.push(newDate);
            }
            if (foundSrs == -1) {
                newDate = [...srsStages[srsStages.length - 1]];
                newDate[0] = date;
                srsStages.push(newDate);
                foundSrs = srsStages.length - 1
            }
            srsStages[foundSrs][typeStart]--;
            if (usedIds.findIndex(element => element == subId) == -1) {
                usedIds.push(subId);
                srsStages[foundSrs][typeStart]++;
            }
            srsStages[foundSrs][typeEnd]++;
            j++;
            currentData = reviewData[j];
        }
        let nextURL = data["pages"]["next_url"];
        loadingLbl.innerHTML = "Loading Data Arrays: " + ((i+1) * perPages) + " Reviews (this can take a short while)";
        if (nextURL == null) { break; }
        var apiEndpoint =
            new Request(nextURL, {
                method: 'GET',
                headers: requestHeaders
            });
        while (1) {
            let promise = fetch(apiEndpoint)
                .then(response => response.json())
                .then(responseBody => responseBody);
            data = await promise;
            console.log(data,data["code"])
            if (data["code"] == 429) {
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }
            break;
        }
        reviewData = data["data"];
    }
    loadingLbl.innerHTML = "Loading Success!";
    srsStages.splice(1, 1);
    console.log(orderedData);
    console.log(srsStages);

    // create chart
    var chartData = google.visualization.arrayToDataTable(orderedData);
    var options = {
        title: 'Reviews Per Day',
        curveType: 'none'
    };
    var chartDiv = document.getElementById('reviewchart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);

    // second data array (total reviews)
    var runningTotal = 0;
    var totalReviews = [["Date", "Total Reviews"]];
    for (let i = 1; i < orderedData.length; i++) {
        runningTotal += orderedData[i][1];
        totalReviews.push([orderedData[i][0], runningTotal])
    }
    console.log(totalReviews);

    // second chart
    chartData = google.visualization.arrayToDataTable(totalReviews);
    options = {
        title: 'Total Reviews',
        curveType: 'none'
    };
    chartDiv = document.getElementById('totalchart');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);

    // third chart
    chartData = google.visualization.arrayToDataTable(srsStages);
    var options = {
        title: "Item Types Stacked",
        legend: { position: 'bottom' },
        connectSteps: true,
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black'],
        isStacked: true
    };
    chartDiv = document.getElementById('srschart');
    chart = new google.visualization.SteppedAreaChart(chartDiv);
    chart.draw(chartData, options);

    // fourth chart
    var options = {
        title: "Item Types",
        colors: ['pink', 'purple', 'darkblue', 'lightblue', 'black']
    };
    chartDiv = document.getElementById('srschart2');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    loadingLbl.innerHTML = "Time frame restricted to " + months + " months.";
}

async function levelinfo() {
    let promise = fetch(new Request('https://api.wanikani.com/v2/level_progressions', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promise;
    var levelData = data["data"];
    console.log(levelData)

    // create array
    // get resets
    let promiseReset = fetch(new Request('https://api.wanikani.com/v2/resets', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var resetData = await promiseReset;
    resetData = resetData["data"];
    var resets = [];
    for (let i = 0; i < resetData.length; i++) {
        target = resetData[i]["data"]["target_level"];
        resets.push([target, resetData[i]["data"]["original_level"] - target + 1]);
    }
    resets.sort((a, b) => {return a[0] - b[0];});
    console.log(resets);
    // rest
    var chartData = [["Level", "Length"]];
    var currentLevel = levelData[0];
    var j = 1;
    var level = 1;
    currentLevel = levelData[1];
    while (currentLevel != null) {
        resetIndex = resets.findIndex(element => element[0] == j+1)
        if (resetIndex != -1) {
            j += resets[resetIndex][1];
        }
        dateBefore = new Date(currentLevel["data"]["started_at"]);
        after = currentLevel["data"]["passed_at"];
        if (after != null) {
            dateAfter = new Date(after);
        } else {
            dateAfter = new Date(Date.now());
        }
        chartData.push([level, (dateAfter.getTime() - dateBefore.getTime()) / (3600000 * 24)]);
        j++;
        level++;
        currentLevel = levelData[j];
    }
    console.log(chartData);

    // create chart
    newChartData = google.visualization.arrayToDataTable(chartData);
    var options = {
        title: 'Level Progression',
        bar: { groupWidth: "95%" },
        legend: { position: "none" }
    };
    var chartDiv = document.getElementById('leveltimechart');
    var chart = new google.charts.Bar(chartDiv);
    chart.draw(newChartData, options);

    // projection
    chartData.splice(0, 1);
    var time = chartData.reduce((partialSum, a) => partialSum + a[1], 0);
    console.log(time/level);
    var average = parseInt(time / level * (60 - level)); // extrapolating average time until now
    var lbl = document.getElementById("future");
    lbl.innerHTML = fixHtml("<b>Average Projection (how many days until level 60): ") + average;
}

async function wordinfo() {
    let promise = fetch(new Request('https://api.wanikani.com/v2/review_statistics', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promise;
    var wordData = data["data"];
    var totPages = data["total_count"];
    var perPages = data["pages"]["per_page"]
    var loops = Math.ceil(totPages / perPages);

    // create array
    var j;
    var kd;
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
    var c = 0;
    var foundDate;
    var type;
    var date;
    var id;
    var cor;
    var inc;
    var used = [];
    for (let i = 0; i < loops; i++) {
        j = 0;
        currentData = wordData[0];
        while (currentData != null) {
            c++;
            updatedAt = currentData["data_updated_at"];
            currentData = currentData["data"];
            id = currentData["subject_id"];
            if (used.findIndex(element => (element == id)) != -1) {
                j++;
                currentData = wordData[j];
                if (c >= totPages) { break; }
                continue;
            } else {
                used.push(id);
            }
            kdHun = currentData["percentage_correct"];
            kd = kdHun / 100;
            kdWeight = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"] + 0.01) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"] + 0.01)) / 2
            foundBest = bestWords.findIndex(element => (element[0] < kdWeight));
            foundWorst = worstWords.findIndex(element => (element[0] > kdWeight));
            foundBestR = bestWordsR.findIndex(element => (element[0] < kdWeight));
            foundWorstR = worstWordsR.findIndex(element => (element[0] > kdWeight));
            foundBestK = bestWordsK.findIndex(element => (element[0] < kdWeight));
            foundWorstK = worstWordsK.findIndex(element => (element[0] > kdWeight));
            foundBestV = bestWordsV.findIndex(element => (element[0] < kdWeight));
            foundWorstV = worstWordsV.findIndex(element => (element[0] > kdWeight));
            type = currentData["subject_type"]
            cor = currentData["meaning_correct"] + currentData["reading_correct"];
            inc = currentData["meaning_incorrect"] + currentData["reading_incorrect"];
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
                bestWords[foundBest] = [kdWeight, kd, id, cor, inc];
            }
            if (type == "radical" && foundBestR != -1) {
                bestWordsR[foundBestR] = [kdWeight, kd, id, cor, inc];
            } else if (type == "kanji" && foundBestK != -1) {
                bestWordsK[foundBestK] = [kdWeight, kd, id, cor, inc];
            } else if (type == "vocabulary" && foundBestV != -1) {
                bestWordsV[foundBestV] = [kdWeight, kd, id, cor, inc];
            }
            if (foundWorst != -1) {
                worstWords[foundWorst] = [kdWeight, kd, id, cor, inc];
            }
            if (type == "radical" && foundWorstR != -1) {
                worstWordsR[foundWorstR] = [kdWeight, kd, id, cor, inc];
            } else if (type == "kanji" && foundWorstK != -1) {
                worstWordsK[foundWorstK] = [kdWeight, kd, id, cor, inc];
            } else if (type == "vocabulary" && foundWorstV != -1) {
                worstWordsV[foundWorstV] = [kdWeight, kd, id, cor, inc];
            }
            j++;
            currentData = wordData[j];
            if (c >= totPages) { break; }
        }
        let nextURL = data["pages"]["next_url"];
        if (nextURL == null) { break; }
        var apiEndpoint =
            new Request(nextURL, {
                method: 'GET',
                headers: requestHeaders
            });
        let promise = fetch(apiEndpoint)
            .then(response => response.json())
            .then(responseBody => responseBody);
        data = await promise;
        reviewData = data["data"];
    }
    for (let i = 1; i < percentages.length; i++) {
        percentages[i][1] /= totals[i][1];
    }
    percentages.sort((a, b) => {
        return a[0].valueOf() - b[0].valueOf();
    });

    // create chart
    var chartData = google.visualization.arrayToDataTable(percentages);
    var options = {
        title: 'Accuracy',
        curveType: 'none',
    };
    var chartDiv = document.getElementById('percentagechart');
    var chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
    hallCreation(bestWords, "topwords");
    hallCreation(worstWords, "worstwords");
    hallCreation(bestWordsR, "topwordsradical");
    hallCreation(worstWordsR, "worstwordsradical");
    hallCreation(bestWordsK, "topwordskanji");
    hallCreation(worstWordsK, "worstwordskanji");
    hallCreation(bestWordsV, "topwordsvocab");
    hallCreation(worstWordsV, "worstwordsvocab");
}

async function hallCreation(words, lblid) {
    var wordsLbl = "";
    var wordList = [];
    var name;
    for (let i = 0; i < words.length; i++) {
        wordList.push(words[i][2])
    }
    let promise = fetch(new Request('https://api.wanikani.com/v2/subjects' + '?ids=' + wordList.join(), { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    wordList = await promise;
    wordList = wordList["data"];
    console.log(wordList);
    for (let i = 0; i < wordList.length; i++) {
        word = wordList[i];
        name = word["data"]["characters"];
        if (name == null) {
            name = word["data"]["slug"];
        }
        wordsLbl += name + " | correct: " + words[i][3] + " | incorrect: " + words[i][4] + " | percentage: " + parseInt(words[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById(lblid);
    lbl.innerHTML = wordsLbl;
}

async function getAPIToken() {
    apiToken = document.getElementById("tokeninput").value;
    requestHeaders =
        new Headers({
            'Wanikani-Revision': '20170710',
            Authorization: 'Bearer ' + apiToken,
        });
    requestHeaders.set("Access-Control-Allow-Origin", "*");
    let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/1', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    let test = await promise;

    const errorDiv = document.getElementById("errordiv");

    if (test["object"] == "radical") {
        document.cookie = "token="+apiToken;
        errorDiv.innerHTML = "Success!"
        userinfo();
        reviewinfo();
        levelinfo();
        wordinfo();
    } else {
        errorDiv.innerHTML = "Error (Code " + test["code"] + "): " + test["error"];
    }
}

let decodedCookie = document.cookie.substring(document.cookie.indexOf("token=")+6);
if (decodedCookie != "") {
    document.getElementById("tokeninput").value = decodedCookie;
    getAPIToken();
}