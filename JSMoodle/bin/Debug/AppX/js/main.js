$(document).ready(function () {

    var getFile = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("queryString.xml").operation;

    if (getFile.errorCode == 0) {
        // Arquivo de configuração já existe
        var getStreamFile = getFile.getResults().openSequentialReadAsync().operation.getResults();
    } else {
        // Arquivo de configuração não existe
        // Criação do arquivo da fonte
        createSettingsFilesFromScratch();
    }


    $('#btn-hi').click(function () {
        $.ajax({
            type: "GET",
            dataType: 'json',
            url: "http://localhost:37006/api/connectionString?connectionStringIndex=0",
            async: true,
            contentType: "application/json; charset=utf-8",
            success: function (firstStep) {
                console.log("Fase 01 completa");
                var dbType = firstStep[0];
                var dbConnector = firstStep[3] + ";Uid=" + firstStep[1];
                console.log(dbConnector);
                $.ajax({
                    type: "GET",
                    dataType: 'json',
                    url: "http://localhost:37006/api/selector" + dbType + "?connectionString=" + dbConnector + "&tblname=" + document.getElementsByTagName("input")[0].value,
                    async: true,
                    contentType: "application/json; charset=utf-8",
                    success: function (secondStep) {
                        console.log("Fase 02 completa");
                        parseToTable(secondStep);
                    }
                });
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

    }

    //end
});