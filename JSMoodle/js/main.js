$(document).ready(function () {
    exportTable("teste");

    $('#btn-hi').click(function () {
        var statusParagraph = document.getElementById("status");
        var url = "http://localhost:37006/api/DBProperties?index=" + document.getElementById("conIndex").value;
        statusParagraph.setAttribute("class", "center light-green-text");
        statusParagraph.innerHTML = "Requisição das informações do banco de dados em andamento...";

        $.ajax({
            type: "GET",
            url: url,
            async: true,
            contentType: "text",
            success: function (firstStep) {
                statusParagraph.innerHTML = "Requisição dos registros das tabelas em andamento...";
                try {
                    var results = JSON.parse(firstStep);
                    url = "http://localhost:37006/api/selector" + results[0]["databaseType"];
                    // results[0] é o tipo do banco de dados
                    // results[n+1] é o seletor da query
                    $.post((url), { 'connectionIndex': document.getElementById("conIndex").value, 'query': results[1]["comando"] }, function (data) {
                        parseToTable(data);
                    }, "json");
                } catch (exception) {
                    statusParagraph.setAttribute("class", "center red-text");
                    statusParagraph.innerHTML = "Requisição completou, mas a transformação da stream em JSON falhou.";
                }
                statusParagraph.innerHTML = "Requisição dos registros da tabela completa. Aguarde enquanto transformo os resultados na tabela...";
            },
        }).fail(function (jqXHR, textStatus) {
            statusParagraph.setAttribute("class", "center red-text");
            statusParagraph.innerHTML = "Requisição de aquisição das informações do banco de dados falhou.";
            console.log(jqXHR);
        });

    });

    function parseToTable(sender) {
        try {
            var contentTable = document.getElementById("table");
            if (sender[0].indexOf("Exception") > -1) {
                contentTable.innerHTML = "";
                contentTable.appendChild(document.createElement("tr"));
                var lastChildOfTable = contentTable.lastChild;
                lastChildOfTable.innerHTML += "<td>" + sender[0] + "</td>";
                return;
            }
            var strInnerHtml = "<thead><tr>";

            // Pondo nome nas colunas
            var i = 0;
            while (i < sender[0].length) {
                strInnerHtml+="<th data-field='"+sender[0][i].toString()+"'>"+sender[0][i].toString()+"</th>";
                i++;
            }
            strInnerHtml+="</tr></thead>";
            contentTable.innerHTML = strInnerHtml;

            // Colocando os valores do SELECT nas colunas
            $(sender).each(function () {
                contentTable.appendChild(document.createElement("tr"));
                var lastChildOfTable = contentTable.lastChild;
                var row = $(this);
                row.each(function (row, td) {
                    lastChildOfTable.innerHTML += "<td>" + td + "</td>";
                });
                return;
            });
            contentTable.innerHTML += "</tbody>";
            contentTable.firstChild.nextSibling.removeChild(contentTable.firstChild.nextSibling.firstChild);
            document.getElementById("status").setAttribute("class", "center blue-text");
            document.getElementById("status").innerHTML = "Requisição finalizada com sucesso e todos os resultados foram carregados na tabela.";
            document.getElementById("operacoesTabela").innerHTML += "<input type='button' value='Importar' class='btn-flat' /><input type='button' value='Exportar' class='btn-flat' />";
        } catch (exception) {
            document.getElementById("tableContents").innerHTML = "Transformação do objeto JSON em tabela falhou.";
        }
    }

    function importTable(tableNameFile) {
        var statusParagraph = document.getElementById("status");
        var tablePersisted = "";
        statusParagraph.setAttribute("class", "center light-green-text");
        statusParagraph.innerHTML = "Começando a importar dados do arquivo persistido...";
        var filePicker = Windows.Storage.ApplicationData.current.localFolder.getFileAsync(tableNameFile);
        filePicker.done(function () {
            var fileReader = Windows.Storage.FileIO.readTextAsync(filePicker.operation.getResults());
            fileReader.done(function () {
                tablePersisted = fileReader.operation.getResults().toString();
                statusParagraph.innerHTML = "Dados carregados do arquivo. Transformando em tabela...";
                return tablePersisted;
            }, function () {
                statusParagraph.setAttribute("class", "center red-text");
                statusParagraph.innerHTML = "Erro ao ler o arquivo. Verifique se você tem permissão de leitura ou se o arquivo permite leitura!";
                return "error";
            });
        }, function () {
            statusParagraph.setAttribute("class", "center red-text");
            statusParagraph.innerHTML = "Erro ao carregar o arquivo do computador. Verifique se ele existe!";
            return "error";
        });
    }

    function exportTable(tableNameFile) {
        var statusParagraph = document.getElementById("status");
        statusParagraph.setAttribute("class", "center light-green-text");
        statusParagraph.innerHTML = "Começando a persistir os dados da tabela no dispositivo...";
    }
    //end
});