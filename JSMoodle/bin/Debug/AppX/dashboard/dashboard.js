var databaseIndex = getCookieValue("databaseIndex");
var userId = getCookieValue("userId");

$(document).ready(function () {
    document.getElementsByTagName("h3")[0].innerHTML += "<b>" + document.cookie.substring(document.cookie.lastIndexOf("=") + 1) + "</b>";
    $.ajax("http://localhost:37006/api/dbproperties?index=" + databaseIndex, {
        method: "GET",
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                databaseIndex = firstStep[1]["idconexao"];
            } catch (Exception) {
                //setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            $.post({
                url: "http://localhost:37006/api/selector" + firstStep[0]["databaseType"],
                data: { "connectionIndex": databaseIndex - 1, "query": firstStep[4]["comando"] + " where userid='" + userId + "'" }
            }).done(function (data, textStatus, jqXHR) {

            });
        }
    })
        .fail(function () {

    });
});

function getCookieValue(key) {
    return document.cookie.substring(document.cookie.indexOf(key) + key.length+1, document.cookie.substring(document.cookie.indexOf(key)).indexOf(";"));
}