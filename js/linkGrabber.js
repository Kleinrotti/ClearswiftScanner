export function grab() {
    var links = new Array();
    try {
        var table = document.getElementById("urlDetails");
        var rows = table.getElementsByClassName("styledTable")[0].tBodies[0].rows;
    } catch (TypeError) {
        console.debug("no element with urls found")
        return links;
    }
    for (i = 0; i < rows.length; i++) {
        links.push(rows.item(i).innerText);
    }
    return links;
}