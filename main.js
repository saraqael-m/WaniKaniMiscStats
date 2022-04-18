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
    userInfo += fixHtml("<b>Subscritppion active: ") + s["data"]["subscription"]["active"] + "\n";
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
    var bestWords  = [[-1, 0, 0, 0, 0], [-1, 0, 0, 0, 0], [-1, 0, 0, 0, 0], [-1, 0, 0, 0, 0], [-1, 0, 0, 0, 0]];
    var worstWords = [[2, 0, 0, 0, 0], [2, 0, 0, 0, 0], [2, 0, 0, 0, 0], [2, 0, 0, 0, 0], [2, 0, 0, 0, 0]];
    var c = 0;
    for (let i = 0; i < loops; i++) {
        j = 0;
        currentData = wordData[0];
        while (currentData != null) {
            c++;
            currentData = currentData["data"];
            kd = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"]) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"])) / 2
            kdWeight = (currentData["meaning_correct"] / (currentData["meaning_incorrect"] + currentData["meaning_correct"] + 0.01) + currentData["reading_correct"] / (currentData["reading_incorrect"] + currentData["reading_correct"] + 0.01)) / 2
            foundBest  =  bestWords.findIndex(element => (element[0] < kdWeight));
            foundWorst = worstWords.findIndex(element => (element[0] > kdWeight));
            if (currentData["subject_id"] == 8952) {
                console.log("herere!!!");
            }
            if (foundBest != -1 && bestWords.findIndex(element => (element[2] == currentData["subject_id"])) == -1) {
                bestWords[foundBest] = [kdWeight, kd, currentData["subject_id"], currentData["meaning_correct"] + currentData["reading_correct"], currentData["meaning_incorrect"] + currentData["reading_incorrect"]];
            }
            if (foundWorst != -1 && worstWords.findIndex(element => (element[2] == currentData["subject_id"])) == -1) {
                worstWords[foundWorst] = [kdWeight, kd, currentData["subject_id"], currentData["meaning_correct"] + currentData["reading_correct"], currentData["meaning_incorrect"] + currentData["reading_incorrect"]];
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
    console.log(c, c, c, c, c, c, c);

    // create numbering
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
    // create numbering
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