const prevToken = localStorage.getItem('apiv2_key_override');
if (prevToken !== null) returnToPage();

const tokenInput = document.getElementById('tokeninput');
const errorDiv = document.getElementById('errordiv');

var apiToken;

function returnToPage() {
    let pageOrigin = searchQueryVar('origin');
    if (pageOrigin != undefined) window.location.href = pageOrigin;
    else window.location.href = 'Stats.html';
}

function searchQueryVar(name) {
    let rawSearchQuery = window.location.search;
    if (rawSearchQuery == '') return;
    let varIndex = rawSearchQuery.slice(1).indexOf(name);
    if (varIndex === -1) return;
    return rawSearchQuery.slice(varIndex + name.length + 2).split('&')[0];
}

async function getApiToken() {
    apiToken = tokenInput.value.replace(/[^A-Za-z0-9-]/g, '').toLowerCase();
    if (await fetchTestApi() == true) {
        localStorage.setItem('apiv2_key_override', apiToken);
        console.log(window.location.hash)
        returnToPage();
    }
}

async function fetchTestApi() {
    var fetchSuccess = false;
    let requestHeaders = new Headers({ 'Wanikani-Revision': '20170710', Authorization: 'Bearer ' + apiToken });
    let promise = fetch(new Request("https://api.wanikani.com/v2/subjects/1", { method: 'GET', headers: requestHeaders }))
        .then(response => response.json())
        .then(responseBody => responseBody);
    let data = await promise;
    if (data["object"] == "radical") {
        fetchSuccess = true;
        tokenInput.style.backgroundColor = 'lightgreen';
    } else if (data["code"] !== undefined) {
        errorDiv.innerHTML = "Error (Code " + data["code"] + "): " + data["error"];
        tokenInput.style.backgroundColor = 'lightsalmon';
    } else {
        errorDiv.innerHTML = "Unknown Error Occured (maybe an API update or a transmission error)";
        tokenInput.style.backgroundColor = 'lightsalmon';
        console.log(error);
    }
    return fetchSuccess;
}