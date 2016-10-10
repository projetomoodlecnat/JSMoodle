usefulContent = "";
feedbackID = null;

$(document).ready(function () {
    var cookiesDict = cookiesToDict();
    try {
        feedbackID = window.location.toString().substring(window.location.toString().indexOf("=") + 1);
    } catch (exception) {
        $("#content").html("[ERRO] Parâmetros inválidos.");
        return;
    }
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
        method: "GET",
        async: true,
        contentType: "application/json",
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                databaseIndex = firstStep[1]["idconexao"];
            } catch (Exception) {
                console.log("ERROR: Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            var finalContentHTML = "";
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": 'select name, intro from mdl_feedback where id=' + feedbackID }
            }).done(function (data, textStatus, jqXHR) {
                $(".titulo").html(data[1][data[0].indexOf("NAME")]);
                $(".subtitulo").html(data[1][data[0].indexOf("INTRO")]);
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": 'select * from mdl_feedback_item where feedback=' + feedbackID }
                }).done(function (data, textStatus, jqXHR) {
                    var i = 1;
                    for (; data[i];) {
                        usefulContent += "<p>" + data[i][data[0].indexOf("NAME")] + "</p>";
                        switch (data[i][data[0].indexOf("TYP")]) {
                            case 'textfield':
                                usefulContent += "<input type='text' style='width:100%' id='" + data[i][data[0].indexOf("ID")] + "' />"
                                break;
                            default:
                                $("#content").html("Esta enquete contém tipos de alternativas não suportadas pelo Moodle.");
                                return;
                        }
                        i++;
                    }
                    usefulContent += "<p class='paragraphResponderEnquete'>RESPONDER ENQUETE</p>";
                    initializeFolder();
                });
            }).error(function () {
                initializeFolder();
            });
        }
    }).error(function () {
        initializeFolder();
    });
    $(".paragraphGoBack").click(function () {
        history.back();
    });
});

function createFile(surveysFolder) {
    var createFileOperation = surveysFolder.createFileAsync(feedbackID);
    createFileOperation.done(function () {
        persistToFile(createFileOperation.operation.getResults(), usefulContent);
    }, function () {
        getFile(surveysFolder);
    });
}

function getFile(surveysFolder) {
    var getFileOperation = surveysFolder.getFileAsync(feedbackID);
    getFileOperation.done(function () {
        readFromFile(getFileOperation.operation.getResults());
    }, function () {
        $("#content").html("[ERRO] Não foi possível carregar ou criar o arquivo.");
        return false;
    });
}

function readFromFile(surveyFile) {
    var readFileOperation = Windows.Storage.FileIO.readTextAsync(surveyFile);
    readFileOperation.done(function () {
        $("#content").html(readFileOperation.operation.getResults());
    }, function () {
    });
}

function persistToFile(surveyFile, contents) {
    $("#content").html(contents);
    var persistFileOperation = Windows.Storage.FileIO.writeTextAsync(surveyFile, contents);
    persistFileOperation.done(function () { }, function () {
    });
}

function initializeFolder() {
    var folderOperation = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("surveys");
    folderOperation.done(function () {
        folderOperation = folderOperation.operation.getResults();
        createFile(folderOperation);
    }, function () {
        folderOperation = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("surveys");
        folderOperation.done(function () {
            folderOperation = folderOperation.operation.getResults();
            createFile(folderOperation);
        }, function () {
            $("#content").html("[ERRO] Não foi possível carregar ou criar a pasta.");
            return false;
        });
    });
}