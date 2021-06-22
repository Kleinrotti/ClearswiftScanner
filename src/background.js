const vtBase = "https://www.virustotal.com/api/v3";
var count = 0;
var currentLength = 0;
var lastresult = [];

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.contentScriptQuery == "linkScan") {
      //reset counter and lastresult if new link batch starts
      if (request.start == true) {
        lastresult = [];
        count = 0;
      }
      currentLength = request.length;
      var dict = {};
      dict.id = request.id;
      dict.url = request.url;
      try {
        var apiKey = storageCache.options.textKey;
      } catch (TypeError) {
        dict.error = "No Api key set.";
        sendResponse({ result: dict });
        return;
      }
      var apiUrl = vtBase + "/urls";
      var b = 'url=' + request.url;
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-apikey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: b
      })
        .then(response => response.json().then(data => {
          if (data.error) {
            console.log(data.error);
            dict.error = data.error.message;
            sendResponse({ result: dict });
          }
          else {
            console.log(data);
            //now transmit the received analysis id to get the result
            getAnalyseResult(data.data.id).then(analyseResponse => {
              dict.analyseId = data.data.id;
              dict.result = analyseResponse;
              lastresult.push(dict);
              chrome.storage.local.set({ scanResult: lastresult }, function () {
                console.debug('ScanResult updated ' + lastresult);
              });
              count++;
              console.debug("Scan " + count + " finished");
              sendResponse({ result: dict });
            });
          };
        })
        )
        .catch((error) => {
          dict.error = error;
          console.error('Error:', error);
          sendResponse({ result: dict });
        })
      return true;  // Will respond asynchronously.
    }
  });

//return an analyse result from virustotal
async function getAnalyseResult(id) {
  var repeat = 0;
  var result;
  while (repeat < 4) {
    await fetchAnalyse(id).then(response => {
      if (response.status == 'queued') {
        console.debug("Result isn't ready yet. Waiting 10 sec and checking again then.");
        repeat++;
      }
      else if (response.status == 'completed') {
        console.debug("Result was received.");
        result = response;
        repeat = 4;
      }
      else {
        console.debug("Analyse result unknown", response);
        repeat = 4;
      }
    });
    if (repeat < 4)
      await sleep(10000);
  };
  return result;
}

async function fetchAnalyse(id) {
  var apiKey = storageCache.options.textKey;
  var apiUrl = vtBase + "/analyses/" + id;
  return await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'x-apikey': apiKey,
    }
  })
    .then(response => response.json().then(data => {
      return data.data.attributes;
    })
    )
    .catch((error) => {
      console.error('Error:', error);
    })
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
};
//when starting chrome clear the last scan result
chrome.runtime.onStartup.addListener(function () {
  chrome.storage.local.set({ scanResult: null })
});

// Watch for changes to the user's options & apply them
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.options?.newValue) {
    getAllStorageSyncData().then(items => {
      // Copy the data retrieved from storage into storageCache.
      Object.assign(storageCache, items);
    })
  }
});

// Where we will expose all the data we retrieve from storage.sync.
const storageCache = {};
// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = getAllStorageSyncData().then(items => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(storageCache, items);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await initStorageCache;
  } catch (e) {
    // Handle error that occurred during storage initialization.
  }
  // Normal action handler logic.
});

// Reads all data out of storage.sync and exposes it via a promise.
//
// Note: Once the Storage API gains promise support, this function
// can be greatly simplified.
function getAllStorageSyncData() {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
};

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.action == "getScanState") {
      var state;
      chrome.storage.local.get(['scanResult'], function (result) {
        if (result.scanResult == null) {
          state = "none";
        }
        //scan is finished
        else if (count == currentLength) {
          state = "finished";
        }
        //scan is running
        else if (count < currentLength) {
          state = "running";
        }
        sendResponse({ state: state, result: result });
      }
      )
    };
    return true;
  })