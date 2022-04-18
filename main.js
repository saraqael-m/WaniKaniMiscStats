var apiToken;
var requestHeaders;

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
    let promise = fetch(new Request('https://api.wanikani.com/v2/reviews', {method: 'GET', headers: requestHeaders}))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promise;

    // create array
    console.log(data);
    var totPages = data["total_count"];
    var perPages = data["pages"]["per_page"]
    var loops = Math.ceil(totPages / perPages);
    var reviewData = data["data"];
    var orderedData = [["Date", "Reviews"]];
    var currentData;
    var date;
    var newDate;
    var j;
    var found;
    for (let i = 0; i < loops; i++) {
        j = 0;
        currentData = reviewData[0];
        while (currentData != null) {
            currentData = currentData["data"];
            date = new Date(currentData["created_at"].substring(0, 10));
            found = orderedData.findIndex(element => (element[0].valueOf() == date.valueOf()));
            if (found != -1) {
                orderedData[found][1]++;
            } else {
                newDate = [date, 1];
                orderedData.push(newDate);
            }
            j++;
            currentData = reviewData[j];
        }
        let nextURL = data["pages"]["next_url"];
        console.log(nextURL);
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
    console.log(orderedData);

    // create chart
    var chartData = google.visualization.arrayToDataTable(orderedData);
    var options = {
        title: 'Reviews Per Day',
        curveType: 'none',
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
        curveType: 'none',
    };
    chartDiv = document.getElementById('totalchart');
    chart = new google.visualization.LineChart(chartDiv);
    chart.draw(chartData, options);
}

async function levelinfo() {
    let promise = fetch(new Request('https://api.wanikani.com/v2/level_progressions', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    var data = await promise;
    var levelData = data["data"];
    console.log(levelData)

    // create array
    var chartData = [["Level", "Length"]];
    var currentLevel = levelData[0];
    var prevDate = new Date(currentLevel["data"]["created_at"]);
    var firstDate = new Date(prevDate.getTime())
    var j = 1;
    var date;
    currentLevel = levelData[1];
    while (currentLevel != null) {
        if (currentLevel["data"]["abandoned_at"] != null) {
            j++;
            prevDate = new Date(levelData[j]["data"]["created_at"]);
            firstDate = new Date(prevDate.getTime());
            chartDate = [];
        }
        date = new Date(currentLevel["data"]["created_at"]);
        chartData.push([j, (date.getTime() - prevDate.getTime()) / (3600000 * 24)]);
        j++;
        prevDate = new Date(date.getTime());
        console.log(prevDate, date);
        currentLevel = levelData[j];
    }
    console.log(chartData);

    // create chart
    chartData = google.visualization.arrayToDataTable(chartData);
    var options = {
        title: 'Level Progression',
        bar: { groupWidth: "95%" },
        legend: { position: "none" }
    };
    var chartDiv = document.getElementById('leveltimechart');
    var chart = new google.charts.Bar(chartDiv);
    chart.draw(chartData, options);

    // projection
    var time = (date.getTime() - firstDate.getTime()) / (3600000 * 24);
    var level = j;
    var average = parseInt(time * 60 / level - time); // extrapolating average time until now
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
    console.log(data);

    // create array
    var j;
    var kd;
    var bestWords = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWords = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsR = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsR = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsK = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsK = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var bestWordsV = [[-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0], [-1, 0, 1, 0, 0]];
    var worstWordsV = [[2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0]];
    var c = 0;
    var type;
    var id;
    var cor;
    var inc;
    var used = [];
    for (let i = 0; i < loops; i++) {
        j = 0;
        currentData = wordData[0];
        while (currentData != null) {
            c++;
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
            kd = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"]) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"])) / 2
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
                console.log(currentData);
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
        console.log(nextURL);
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
    console.log(bestWordsK);
    console.log(bestWordsK);
    console.log(bestWordsK);

    // create numbering all
    wordsLbl = "";
    for (let i = 0; i < bestWords.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + bestWords[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + bestWords[i][3] + " | incorrect: " + bestWords[i][4] + " | percentage: " + parseInt(bestWords[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("topwords");
    lbl.innerHTML = wordsLbl;
    console.log(worstWords);
    // create numbering all
    wordsLbl = "";
    for (let i = 0; i < worstWords.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + worstWords[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + worstWords[i][3] + " | incorrect: " + worstWords[i][4] + " | percentage: " + parseInt(worstWords[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("worstwords");
    lbl.innerHTML = wordsLbl;
    // create numbering rad
    wordsLbl = "";
    for (let i = 0; i < bestWordsR.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + bestWordsR[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + bestWordsR[i][3] + " | incorrect: " + bestWordsR[i][4] + " | percentage: " + parseInt(bestWordsR[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("topwordsradical");
    lbl.innerHTML = wordsLbl;
    console.log(worstWords);
    // create numbering rad
    wordsLbl = "";
    for (let i = 0; i < worstWordsR.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + worstWordsR[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + worstWordsR[i][3] + " | incorrect: " + worstWordsR[i][4] + " | percentage: " + parseInt(worstWordsR[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("worstwordsradical");
    lbl.innerHTML = wordsLbl;
    // create numbering kan
    wordsLbl = "";
    for (let i = 0; i < bestWordsK.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + bestWordsK[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + bestWordsK[i][3] + " | incorrect: " + bestWordsK[i][4] + " | percentage: " + parseInt(bestWordsK[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("topwordskanji");
    lbl.innerHTML = wordsLbl;
    console.log(worstWords);
    // create numbering kan
    wordsLbl = "";
    for (let i = 0; i < worstWordsK.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + worstWordsK[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + worstWordsK[i][3] + " | incorrect: " + worstWordsK[i][4] + " | percentage: " + parseInt(worstWordsK[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("worstwordskanji");
    lbl.innerHTML = wordsLbl;
    // create numbering voc
    wordsLbl = "";
    for (let i = 0; i < bestWordsV.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + bestWordsV[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + bestWordsV[i][3] + " | incorrect: " + bestWordsV[i][4] + " | percentage: " + parseInt(bestWordsV[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("topwordsvocab");
    lbl.innerHTML = wordsLbl;
    console.log(worstWords);
    // create numbering voc
    wordsLbl = "";
    for (let i = 0; i < worstWordsV.length; i++) {
        let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/' + worstWordsV[i][2], { method: 'GET', headers: requestHeaders }))
            .then(response => response.json())
            .then(responseBody => responseBody);
        let word = await promise;
        wordsLbl += word["data"]["characters"] + " | correct: " + worstWordsV[i][3] + " | incorrect: " + worstWordsV[i][4] + " | percentage: " + parseInt(worstWordsV[i][1] * 100) + "%\n"
    }
    var lbl = document.getElementById("worstwordsvocab");
    lbl.innerHTML = wordsLbl;
}

async function getAPIToken() {
    apiToken = document.getElementById("tokeninput").value;
    requestHeaders =
        new Headers({
            'Wanikani-Revision': '20170710',
            Authorization: 'Bearer ' + apiToken,
        });

    let promise = fetch(new Request('https://api.wanikani.com/v2/subjects/1', { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    let test = await promise;

    const errorDiv = document.getElementById("errordiv");

    if (test["object"] == "radical") {
        errorDiv.innerHTML = "Success!"
        userinfo();
        reviewinfo();
        levelinfo();
        wordinfo();
    } else {
        errorDiv.innerHTML = "Error (Code " + test["code"] + "): " + test["error"];
    }
}