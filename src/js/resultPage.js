var lastResult;
window.addEventListener("load", function (event) {
    console.debug("Result page loaded");
    chrome.runtime.sendMessage({ action: "getScanState" }, function (response) {
        lastResult = response.result.scanResult;
        //remove some unnecessary properties
        for (var i = 0; i < lastResult.length; i++) {
            delete lastResult[i].id;
            delete lastResult[i].analyseId;
            delete lastResult[i].result.date;
            delete lastResult[i].result.status;
        }
        //Create a new visualizer object
        $(function () {
            //Create a new visualizer object
            var _visualizer = new visualizer($("#resultArea"));
            //Visualize the demo json object
            _visualizer.visualize(lastResult);

        });

    })
});