var feedbackID = null;
var cookiesDict;
var canUserAttemptSurvey_;
var surveyFile;

$(document).ready(function () {
    cookiesDict = cookiesToDict();
    try {
        feedbackID = window.location.toString().substring(window.location.toString().indexOf("=") + 1);
    } catch (exception) {
        $("#content").html("[ERRO] Parâmetros inválidos.");
        return;
    }

    canUserAttemptSurvey_ = canUserAttemptSurvey();

    if (canUserAttemptSurvey_) {
        initializeFolder();
    } else {
        if (canUserAttemptSurvey_ == "error") {
            $("#content").html("Erro na requisição de checagem! Estarei tentando carregar os arquivos do dispositivo...");
            initializeFolder();
            return;
        } else {
            $("#content").html("Você já completou essa enquete.");
            return;
        }
    }
});

function canUserAttemptSurvey() {
    var result;
    $.post({
        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
        async: false,
        data: { "connectionIndex": cookiesDict["databaseIndex"], "query": "select * from mdl_feedback_completed where userid=" + cookiesDict["userID"] + "and feedback=" + feedbackID }
    }).done(function (data, textStatus, jqXHR) {
        if (data.length > 1) {
            result = false;
        } else {
            result = true;
        }
    }).error(function () {
        result = "error";
    });
    return result;
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

function createFile(surveysFolder) {
    var createFileOperation = surveysFolder.createFileAsync(feedbackID);
    createFileOperation.done(function () {
        buildSurvey(createFileOperation.operation.getResults());
    }, function () {
        getFile(surveysFolder);
    });
}

function getFile(surveysFolder) {
    var getFileOperation = surveysFolder.getFileAsync(feedbackID);
    getFileOperation.done(function () {
        surveyFile = getFileOperation.operation.getResults();
        readFromFile(getFileOperation.operation.getResults());
    }, function () {
        $("#content").html("[ERRO] Não foi possível carregar ou criar o arquivo.");
        return false;
    });
}

function readFromFile(surveyFile) {
    var readFileOperation = Windows.Storage.FileIO.readTextAsync(surveyFile);
    readFileOperation.done(function () {
        document.body.outerHTML = readFileOperation.operation.getResults();
        $(".paragraphSave").html("SALVAR O SEU PROGRESSO");
        loadListeners();
        if (canUserAttemptSurvey_) {
            loadFinishListener();
        }
    }, function () {
        $("#content").html("[ERRO] Não foi possível carregar o arquivo.");
    });
}

function persistToFile(surveyFile, content) {
    $("#content").html(content);
    loadListeners();
    loadFinishListener();
    saveToFile(surveyFile);
}

function saveToFile(surveyFile) {
    var persistFileOperation = Windows.Storage.FileIO.writeTextAsync(surveyFile, document.body.outerHTML);
    persistFileOperation.done(function () {
        Materialize.toast("Arquivo salvo!", 500);
        $(".paragraphSave").html("SALVAR O SEU PROGRESSO");
    }, function () {
        Materialize.toast("[ERRO] Erro no processo de salvamento do arquivo!", 500);
        $(".paragraphSave").html("SALVAR O SEU PROGRESSO");
    });
}

function loadListeners() {
    $("input[type='number']").each(function () {
        $(this).keypress(function (event) {
            if (".0123456789".indexOf(event.key) == -1 || isNaN(parseFloat(event.target.value + event.key))) {
                event.preventDefault();
            }
        });
    });
    $('input[type="radio"]').each(function () {
        var rdbutton = $(this);
        rdbutton.click(function () {
            $('input[name="' + event.target.name + '"]').each(function () {
                $(this).removeAttr("checked");
            });
            event.target.checked = true;
            event.target.setAttribute("checked", true);
        });
    });
    $("input").each(function () {
        $(this).change(function () {
            event.target.setAttribute('value', event.target.value);
        });
    });
    $(".paragraphGoBack").click(function () {
        history.back();
    });
    $(".paragraphSave").click(function () {
        event.target.innerHTML = "<img src='../images/universal/loading.gif' />";
        saveToFile(surveyFile, document.body.outerHTML);
    });
}

function loadFinishListener() {
    $('.paragraphFinishSurvey').click(function () {

    });
}

function buildSurvey(surveyFile_) {
    surveyFile = surveyFile_;
    var usefulContent = "";
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
                data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": 'select * from mdl_feedback where id=' + feedbackID }
            }).done(function (data, textStatus, jqXHR) {
                $(".titulo").html(data[1][data[0].indexOf("NAME")]);
                $(".subtitulo").html(data[1][data[0].indexOf("INTRO")]);
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": 'select * from mdl_feedback_item where feedback=' + feedbackID + ' order by position' }
                }).done(function (data, textStatus, jqXHR) {
                    var i = 1;
                    for (; data[i];) {
                        var presentation = data[i][data[0].indexOf("PRESENTATION")].split("|");
                        usefulContent += "<p>" + data[i][data[0].indexOf("NAME")];
                        switch (data[i][data[0].indexOf("TYP")]) {
                            case 'textfield':
                                usefulContent += "</p><input type='text' style='width:100%' id='" + data[i][data[0].indexOf("ID")] + "' />";
                                break;
                            case 'numeric':
                                usefulContent += " (" + presentation[0] + "-" + presentation[1] + ")</p><input type='number' style='width:100%' id='" + data[i][data[0].indexOf("ID")] + "' />";
                                break;
                            case 'multichoice':
                                var j = 0;
                                usefulContent += "</p>";
                                for (j; j < presentation.length; j++) {
                                    if (presentation[j].indexOf("r>") == 0) {
                                        presentation[j] = presentation[j].substr(presentation[j].lastIndexOf(">") + 1);
                                    } else if (presentation[j].indexOf("<") > -1) {
                                        presentation[j] = presentation[j].substr(0, presentation[j].indexOf("<"));
                                    }
                                    usefulContent += "<p><input type='radio' name='" + data[i][data[0].indexOf("ID")] + "' />" + presentation[j] + "</p>";
                                }
                                break;
                            case 'info':
                                break;
                            default:
                                $("#content").html("Esta enquete contém tipos de alternativas não suportadas pelo Moodle.");
                                return;
                        }
                        i++;
                    }
                    usefulContent += "<p class='paragraphFinishSurvey'>RESPONDER ENQUETE</p>";
                    persistToFile(surveyFile_, usefulContent);
                });
            }).error(function () {
                $("#content").html("[ERRO] Requisição de criação da enquete falhou.");
            });
        }
    });
}