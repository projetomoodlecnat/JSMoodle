$(document).ready(function () {

    $('#btn-hi').click(function () {
        var url = "http://localhost:37006/api/DBProperties?index=" + document.getElementById("conIndex").value;
        document.getElementById("status").setAttribute("class", "center light-green-text");
        document.getElementById("status").innerHTML = "Requisição das informações do banco de dados em andamento...";
        $.ajax({
            type: "GET",
            url: url,
            async: false,
            contentType: "text",
            success: function (firstStep) {
                document.getElementById("status").innerHTML = "Requisição dos registros das tabelas em andamento...";
                try {
                    var results = JSON.parse(firstStep);
                    url = "http://localhost:37006/api/selector" + results[0]["databaseType"];
                    //[1] é o seletor da query
                    $.post((url), { 'connectionIndex': document.getElementById("conIndex").value, 'query': results[1]["comando"] }, function (data) {
                        parseToTable(data);
                    }, "json");
                } catch (exception) {
                    document.getElementById("status").setAttribute("class", "center red-text");
                    document.getElementById("status").innerHTML = "Requisição completou, mas a transformação da stream em JSON falhou.";
                }
                document.getElementById("status").innerHTML = "Requisição dos registros da tabela completa. Aguarde enquanto transformo os resultados na tabela...";
            },
        }).fail(function (jqXHR, textStatus) {
            document.getElementById("status").setAttribute("class", "center red-text");
            document.getElementById("status").innerHTML = "Requisição de aquisição das informações do banco de dados falhou.";
            console.log(textStatus);
            console.log(jqXHR);
        });
    });

    function parseToTable(sender) {
        try {
            document.getElementById("table").innerHTML = "";
            if (sender[0].indexOf("Exception") > -1) {
                document.getElementById("table").appendChild(document.createElement("tr"));
                var lastChildOfTable = document.getElementById("table").lastChild;
                lastChildOfTable.innerHTML += "<td>" + sender[0] + "</td>";
                return;
            }
            document.getElementById("table").innerHTML += "<tbody>";
            $(sender).each(function () {
                document.getElementById("table").appendChild(document.createElement("tr"));
                var lastChildOfTable = document.getElementById("table").lastChild;
                var row = $(this);
                row.each(function (row, td) {
                    lastChildOfTable.innerHTML += "<td>" + td + "</td>";
                });
            });
            document.getElementById("table").innerHTML += "</tbody>";
            document.getElementById("status").setAttribute("class", "center blue-text");
            document.getElementById("status").innerHTML = "Requisição finalizada com sucesso e todos os resultados foram carregados na tabela.";
            document.getElementById("operacoesTabela").innerHTML += "<input type='button' value='Importar' class='btn-flat' /><input type='button' value='Exportar' class='btn-flat' />";
        } catch (exception) {
            document.getElementById("tableContents").innerHTML = "Transformação do objeto JSON em tabela falhou.";
        }
    }

    function createSettingsFilesFromScratch() {
        Windows.Storage.ApplicationData.current.localFolder.createFileAsync("queryString.xml");
    }

    //end
});