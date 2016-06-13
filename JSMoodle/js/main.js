$(document).ready(function () {

    $('#btn-hi').click(function () {
        $.ajax({
            type: "GET",
            dataType: 'json',
            url: "http://localhost:37006/api/DBProperties?index=0",
            async: false,
            contentType: "application/json; charset=utf-8",
            success: function (firstStep) {
                console.log("Fase 01 completa");
                var dbType = firstStep[0];
                var dbConnector = firstStep[1] + ";Uid=" + firstStep[2];
                if (firstStep[3] != "") {
                    dbConnector += ";Pwd=" + firstStep[3];
                }
                console.log(dbConnector);
                $.post(("http://localhost:37006/api/selector" + dbType), { connectionString: dbConnector, query: firstStep[4] }, function (data) {
                    parseToTable(data);
                }, "json");
            }
        });
    });

    function parseToTable(sender) {
        document.getElementById("table").innerHTML = "";

        if (sender[0].indexOf("Exception") > -1) {
            document.getElementById("table").appendChild(document.createElement("tr"));
            var lastChildOfTable = document.getElementById("table").lastChild;
            lastChildOfTable.innerHTML += "<td>" + sender[0] + "</td>";
            return;
        }

        $(sender).each(function () {
            document.getElementById("table").appendChild(document.createElement("tr"));
            var lastChildOfTable = document.getElementById("table").lastChild;
            var row = $(this);
            row.each(function (row, td) {
                lastChildOfTable.innerHTML += "<td>" + td + "</td>";
            });
        });
    }

    function createSettingsFilesFromScratch() {
        Windows.Storage.ApplicationData.current.localFolder.createFileAsync("queryString.xml");
    }

    //end
});