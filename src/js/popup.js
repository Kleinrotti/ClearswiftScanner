import { grab } from './linkGrabber.js';

let startScan = document.getElementById("btnStartScan");
let urls = document.getElementById("btnReadUrls");
let settings = document.getElementById("btnSettings");
let infoArea = document.getElementById("infoArea");
var links = Array();
var urlList = [];

urls.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: grab
  },
    (result) => {
      links = result[0].result;
      if (links.length > 0) {
        document.getElementById("btnStartScan").disabled = false;
      }
      else {
        document.getElementById("btnStartScan").disabled = true;
        return;
      }
      var linkForm = document.getElementById("links");
      linkForm.innerHTML = '';
      //create main table parts with columns
      var table = document.createElement("table");
      table.className = "table table-bordered url-table";
      var thead = document.createElement("thead");
      var theadRow = document.createElement("tr");
      var theadRowCell1 = document.createElement("th");
      theadRowCell1.scope = "col";
      theadRowCell1.innerHTML = "Urls";
      var theadRowCell2 = document.createElement("th");
      theadRowCell2.scope = "col";
      theadRowCell2.innerHTML = "Actions";
      //append the created main parts to form
      theadRow.appendChild(theadRowCell1);
      theadRow.appendChild(theadRowCell2);
      thead.appendChild(theadRow);
      table.appendChild(thead);
      linkForm.appendChild(table);
      var tbody = document.createElement("tbody");
      var count = 0;
      urlList = [];
      links.forEach(element => {
        //append the id which the control will get and the url to an dictionary array
        var dict = {};
        dict.id = count;
        dict.url = element;
        urlList.push(dict);
        //create the table body
        var tRow1 = document.createElement("tr");
        tRow1.id = "tRow_" + count;
        var tRow1Cell = document.createElement("td");
        tRow1Cell.className = "sticky-col first-col";
        tRow1Cell.innerHTML = element;//url
        tRow1Cell.id = "tRowUrlCell" + count;
        tRow1.appendChild(tRow1Cell);
        var tRow1Cell2 = document.createElement("td");
        tRow1Cell2.className = "sticky-col second-col";
        tRow1Cell2.id = "tRowButtonCell" + count;

        var tRow1CellButtonDelete = document.createElement("button");
        tRow1CellButtonDelete.className = "btn btn-danger deleteBtn";
        var tRow1CellButtonDeleteImg = document.createElement("img");
        tRow1CellButtonDeleteImg.src = "images/trash.svg";
        tRow1CellButtonDelete.id = "tRowButtonDelete" + count;
        tRow1CellButtonDelete.onclick = function () {
          var p = this.parentNode.parentNode;
          const value = p.id.split('_').pop();
          p.parentNode.removeChild(p);
          var index;
          for (index = 0; index < urlList.length; index++) {
            if (urlList[index].id == value) {
              break;
            }
          }
          urlList.splice(index, 1);
        };
        tRow1CellButtonDelete.appendChild(tRow1CellButtonDeleteImg);
        tRow1Cell2.appendChild(tRow1CellButtonDelete);
        tRow1.appendChild(tRow1Cell2);

        tbody.appendChild(tRow1);
        table.appendChild(tbody);
        count++;
      })
    })
});

//start the url scan
startScan.addEventListener("click", async () => {
  urls.disabled = true;
  startScan.disabled = true;
  //disable delete buttons
  document.querySelectorAll('button.deleteBtn').forEach(elem => {
    elem.disabled = true;
  });
  applyScanState();
  //loop through all urls in the array
  for (var i = 0; i < urlList.length; i++) {
    //submit to background script to indicate a new scan has started
    var start = false;
    if (i == 0) {
      start = true;
    }
    //create loading image
    var cell = document.getElementById("tRowButtonCell" + urlList[i].id);
    cell.appendChild(createLoadImg(urlList[i].id));
    //send the url to the background script to scan
    chrome.runtime.sendMessage(
      { contentScriptQuery: 'linkScan', url: urlList[i].url, id: urlList[i].id, length: urlList.length, start: start }, function (response) {
        applyScanState();
        var id = response.result.id;
        var btnCell = document.getElementById("tRowButtonCell" + id);
        //remove loading image
        var loadImg = document.getElementById("loadImg" + id);
        btnCell.removeChild(loadImg);

        if (response.result.error) {
          btnCell.appendChild(createErrorImg(id, response.result.error));
        }
        else {
          console.debug("repsponse from id:" + id);

          var stats = response.result.result.stats;
          var row = document.getElementById("tRowUrlCell" + id);
          if (stats.malicious == 0 && stats.suspicious == 0) {
            //green
            row.style.color = '#00FF00';
          }
          else if (stats.malicious == 0 && stats.suspicious > 0) {
            //orange
            row.style.color = '#FFA500';
          }
          else {
            //red
            row.style.color = '#d00';
          }
          var virustotalGuiUrl = "https://www.virustotal.com/gui/url/";
          var tRowCellButton = document.createElement("button");
          tRowCellButton.className = "btn btn-primary";
          var tRowCellButtonImg = document.createElement("img");
          tRowCellButtonImg.src = "images/info-circle.svg";
          tRowCellButton.onclick = function () {
            //create the virustotal url from the base url and the returned analyse id
            var url = virustotalGuiUrl + response.result.analyseId.split('-')[1]; //we need the numbers between the hyphen
            window.open(url);
          };
          tRowCellButton.appendChild(tRowCellButtonImg);
          btnCell.appendChild(tRowCellButton);
        }
      })
  }
});

function createErrorImg(number, mouseHoveText) {
  var errImg = document.createElement("img");
  errImg.id = "errImg" + number;
  errImg.src = "images/warning.png";
  errImg.title = mouseHoveText;
  errImg.width = 32;
  errImg.height = 32;
  return errImg;
}

function createLoadImg(number) {
  var loadImg = document.createElement("img");
  loadImg.id = "loadImg" + number;
  loadImg.src = "images/loading.svg";
  loadImg.width = 32;
  loadImg.height = 32;
  return loadImg;
}

function applyScanState() {
  chrome.runtime.sendMessage({ action: "getScanState" }, function (response) {
    infoArea.innerHTML = '';
    //last url scan has finished
    if (response.state == "finished") {
      var link = document.createElement("a");
      link.href = "./resultPage.html";
      link.target = "_blank";
      link.innerHTML = "Last scan finished. Click for details."
      infoArea.appendChild(link);
      urls.disabled = false;
      if (urlList.length > 0) {
        startScan.disabled = false;
      }
    }
    else if (response.state == "running") {
      infoArea.innerHTML = "Scan is running ";
      document.getElementById("infoArea").appendChild(createLoadImg(1000));
      urls.disabled = true;
      startScan.disabled = true;
    }
    else {
      infoArea.innerHTML = "";
      urls.disabled = false;
      if (urlList.length > 0) {
        startScan.disabled = false;
      }
    }
  });
}

settings.addEventListener("click", async () => {
  chrome.runtime.openOptionsPage();
});

window.addEventListener("load", function (event) {
  applyScanState();
});
