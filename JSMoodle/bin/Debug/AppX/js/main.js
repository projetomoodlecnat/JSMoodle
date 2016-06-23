$(document).ready(function () {

    var awaiter = "null";
    var lastLoadedTable = "";

    //document.getElementById("btn-recuperar").onclick = getTableInJSONFromAPI();

    $('#btn-recuperar').click(function () {
        var conIndex = document.getElementById("conIndex").value.split(":")[0];
        var queryIndex = document.getElementById("conIndex").value.split(":")[1];
        var url = "http://localhost:37006/api/DBProperties?index=" + conIndex;
        setStatus("progressing", "Requisição das informações do banco de dados em andamento...");

        $.ajax({
            type: "GET",
            url: url,
            async: true,
            contentType: "text",
            success: function (firstStep) {
                setStatus("progressing", "Requisição dos registros das tabelas em andamento...");
                try {
                    var results = JSON.parse(firstStep);
                    url = "http://localhost:37006/api/selector" + results[0]["databaseType"];
                    lastLoadedTable = results[parseInt(queryIndex)]["tabela"];
                    // results[0] é o tipo do banco de dados
                    // results[n+1] é o seletor da query
                    $.post((url), { 'connectionIndex': conIndex, 'query': results[parseInt(queryIndex)]["comando"] }, function (data) {
                        parseToTable(data);
                    }, "json");
                } catch (exception) {
                    setStatus("error", "Requisição completou, mas a transformação da stream em JSON falhou.");
                }
                //setStatus("progressing", "Requisição dos registros da tabela completa. Aguarde enquanto transformo os resultados na tabela...");
            },
        }).fail(function (jqXHR, textStatus) {
            setStatus("error", "Requisição de aquisição das informações do banco de dados falhou.");
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
                strInnerHtml += "<th data-field='" + sender[0][i].toString() + "'>" + sender[0][i].toString() + "</th>";
                i++;
            }
            strInnerHtml += "</tr></thead>";
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
            setStatus("succeeded", "Requisição finalizada com sucesso e todos os resultados foram carregados na tabela.");

            // Adiciona os botões e reseta o estado do elemento ao recriá-lo
            document.getElementById("operacoesTabela").innerHTML = "<input class='btn-flat' id='btn-recuperar' type='button' value='Recuperar a tabela'/><input id='btn-import' type='button' value='Importar' class='btn-flat' /><input id='btn-export' type='button' value='Exportar' class='btn-flat' />";
            $("#btn-import").click(function () {
                try {
                    awaiter = "null";
                    importTable(lastLoadedTable);
                    var interval = setInterval(function () {
                        if (awaiter != "null") {
                            document.getElementById("table").innerHTML = awaiter;
                            setStatus("succeeded", "A tabela foi importada com sucesso do arquivo e foi transformada numa tabela do HTML.");
                            console.log("Interval cleared!");
                            clearInterval(interval);
                        }
                    }, 2000);
                } catch (exception) {
                    console.log(exception);
                }
            });
            $("#btn-export").click(function () {
                try {
                    exportTable(lastLoadedTable);
                } catch (exception) {
                    console.log(exception);
                }
            });
            $('#btn-recuperar').click(function () {
                var conIndex = document.getElementById("conIndex").value.split(":")[0];
                var queryIndex = document.getElementById("conIndex").value.split(":")[1];
                var url = "http://localhost:37006/api/DBProperties?index=" + conIndex;
                setStatus("progressing", "Requisição das informações do banco de dados em andamento...");

                $.ajax({
                    type: "GET",
                    url: url,
                    async: true,
                    contentType: "text",
                    success: function (firstStep) {
                        setStatus("progressing", "Requisição dos registros das tabelas em andamento...");
                        try {
                            var results = JSON.parse(firstStep);
                            url = "http://localhost:37006/api/selector" + results[0]["databaseType"];
                            lastLoadedTable = results[parseInt(queryIndex)]["tabela"];
                            // results[0] é o tipo do banco de dados
                            // results[n+1] é o seletor da query
                            $.post((url), { 'connectionIndex': conIndex, 'query': results[parseInt(queryIndex)]["comando"] }, function (data) {
                                parseToTable(data);
                            }, "json");
                        } catch (exception) {
                            setStatus("error", "Requisição completou, mas a transformação da stream em JSON falhou.");
                        }
                        //setStatus("progressing", "Requisição dos registros da tabela completa. Aguarde enquanto transformo os resultados na tabela...");
                    },
                }).fail(function (jqXHR, textStatus) {
                    setStatus("error", "Requisição de aquisição das informações do banco de dados falhou.");
                    console.log(jqXHR);
                });
            });
        } catch (exception) {
            setStatus("error", "Transformação do objeto JSON em tabela falhou.");
        }
    }

    function importTable(tableNameFile) {
        console.log(tableNameFile);
        var tablePersisted = "";
        setStatus("progressing", "Começando a importar dados do arquivo persistido...");
        var filePicker = Windows.Storage.ApplicationData.current.localFolder.getFileAsync(tableNameFile);
        filePicker.done(function () {
            var fileReader = Windows.Storage.FileIO.readTextAsync(filePicker.operation.getResults());
            fileReader.done(function () {
                setStatus("progressing", "Dados carregados do arquivo. Transformando em tabela...");
                console.log(tablePersisted);
                awaiter = fileReader.operation.getResults().toString();
            }, function () {
                setStatus("error", "Erro ao ler o arquivo. Verifique se você tem permissão de leitura ou se o arquivo permite leitura!");
                awaiter = "error";
            });
        }, function () {
            setStatus("error", "Erro ao carregar o arquivo do computador. Verifique se ele existe!");
            awaiter = "error";
        });
    }

    function exportTable(tableNameFile) {
        setStatus("progressing", "Começando a persistir os dados da tabela no dispositivo...");
        var createFile = Windows.Storage.ApplicationData.current.localFolder.createFileAsync(tableNameFile);
        createFile.done(function () {
            setStatus("progressing", "Arquivo não existia e foi criado. Aguarde enquanto persisto a tabela...");
            var writer = Windows.Storage.FileIO.writeTextAsync(createFile.operation.getResults(),  tableInnerHTML(document.getElementById("table")));
            writer.done(function () {
                setStatus("succeeded", "Tabela persistida com sucesso. Você pode tentar carregá-la utilizando o botão de importação.");
            }, function () {
                setStatus("error", "Não foi possível escrever no arquivo criado.");
            });
        }, function (failure) {
            if (failure.toString().indexOf("existente")>-1) {
                setStatus("progressing", "Arquivo já existia. Aguarde enquanto eu o sobrescrevo!");
                var filePicker = Windows.Storage.ApplicationData.current.localFolder.getFileAsync(tableNameFile);
                filePicker.done(function () {
                    setStatus("progressing", "Sobrescrevendo o arquivo com o conteúdo da tabela. Aguarde...")
                    var writer = Windows.Storage.FileIO.writeTextAsync(filePicker.operation.getResults(), tableInnerHTML(document.getElementById("table")));
                    writer.done(function () {
                        setStatus("succeeded", "Tabela " + lastLoadedTable + " persistida com sucesso num arquivo de mesmo nome dessa.")
                    }, function () {
                        setStatus("error", "Não foi possível sobrescrever o arquivo.");
                    });
                }, function () {
                    setStatus("error", "Não foi possível abrir o processo para sobrescrição do arquivo, verifique suas permissões de usuário.");
                });
            } else {
                setStatus("error", "Ocorreu um erro sem tratamento pelo programador da aplicação. Contate os desenvolvedores.");
            }
        });
    }

    function setStatus(type, message) {
        if (type == "progressing") {
            document.getElementById("status").setAttribute("class", "center light-green-text");
            document.getElementById("status").innerHTML = message;
        } else if (type == "error") {
            document.getElementById("status").setAttribute("class", "center red-text");
            document.getElementById("status").innerHTML = message;
        } else {
            document.getElementById("status").setAttribute("class", "center blue-text");
            document.getElementById("status").innerHTML = message;
        }
    }

    function tableInnerHTML(tableDomObject) {
        return tableDomObject.innerHTML;
    }
    //end
});