export function grab() {
    var links = new Array();
    var unique;
    try {
        var table = document.getElementById("urlDetails");
        var rows = table.getElementsByClassName("styledTable");
        for (u = 0; u < rows.length; u++) {
            var row = rows[u].tBodies[0].rows;
            for (i = 0; i < row.length; i++) {
                links.push(row.item(i).innerText);
            }
        }
        //filter doubled entries
        unique = [...new Set(links)];
    } catch (TypeError) {
        console.debug("no element with urls found")
    }
    return unique;
}