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
    loadApplicationListeners();

    canUserAttemptSurvey_ = canUserAttemptSurvey();

    if (canUserAttemptSurvey_) {
        initializeFolder();
    } else {
        if (canUserAttemptSurvey_ == "network_error") {
            $("#content").html("Erro na requisição de checagem! Estarei tentando carregar os arquivos do dispositivo...");
            initializeFolder();
            return;
        } else if (canUserAttemptSurvey_ == "exception_error") {
            $("#content").html("Erro de processamento na aplicação.");
            return;
        } else {
            $("#content").html("Você já completou essa enquete.");
            return;
        }
    }
});

function canUserAttemptSurvey() {
    var result;
    try {
        $.post({
            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
            async: false,
            data: { "connectionIndex": cookiesDict["databaseIndex"], "query": "select multiple_submit from mdl_feedback_completed inner join mdl_feedback on feedback = mdl_feedback.id where userid=" + cookiesDict["userID"] + " and feedback=" + feedbackID + " limit 1" }
        }).done(function (data, textStatus, jqXHR) {
            if (data.length == 1 || data[1][data[0].indexOf("MULTIPLE_SUBMIT")] == "1") {
                result = true;
            } else {
                result = false;
            }
        }).error(function () {
            result = "network_error";
        });
    } catch (exception) {
        result = "exception_error";
    }
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
        loadApplicationListeners();
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
}

function loadApplicationListeners() {
    $(".paragraphGoBack").click(function () {
        history.back();
    });
    $(".paragraphSave").click(function () {
        event.target.innerHTML = "<img src='../images/universal/loading.gif' />";
        saveToFile(surveyFile, document.body.outerHTML);
    });
}

function requiredFieldCheck() {
    var booleanToReturn = true;
    $("[required=true]").each(function () {
        var field = $(this);
        if ((field.attr('type') == 'text' && field.val() == "") || (field.attr('type') == 'DIV' && field.find('input[checked=true]').length == 0)) {
            booleanToReturn = false;
            Materialize.toast("Você precisa preencher alguns campos obrigatórios!", 1000);
            return false;
        }
        if (field.attr('type') == 'number') {
            if (parseFloat(field.val()) > parseFloat(field.attr('max')) || parseFloat(field.val()) < parseFloat(field.attr('min'))) {
                booleanToReturn = false;
                Materialize.toast("Você digitou uma resposta fora da zona de números permitida!", 1000);
                return false;
            }
        } else if (field.attr('type') == 'text') {
            if (parseFloat(field.val().length) > parseFloat(field.attr('maxlength'))) {
                booleanToReturn = false;
                Materialize.toast("Você digitou uma resposta maior do que a quantidade de caracteres permitida!", 1000);
                return false;
            }
        }
    });
    return booleanToReturn;
}

function loadFinishListener() {
    $(".paragraphFinishSurvey").click(function () {
        if (canUserAttemptSurvey() && requiredFieldCheck()) {
            $(".paragraphFinishSurvey").remove();
            processSurveyAttempt();
        } else {
            Materialize.toast("Erro na submissão! Verifique se você pode responder essa enquete.", 2000);
        }
    });
}

function processSurveyAttempt() {
    var fieldSelection = $("[item]");
    var howManyCompleted;
    var anonymous;
    var counter;

    $.post({
        async: false,
        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
        data: {
            "connectionIndex": cookiesDict["databaseIndex"], "query": 'select id from mdl_feedback_item order by id desc limit 1'
        }
    }).done(function (data, textStatus, jqXHR) {
        if (data.length == 1) {
            counter = 1;
        } else {
            counter = parseInt(data[1][0]) + 1;
        }
        $.post({
            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
            async: false,
            data: {
                "connectionIndex": cookiesDict["databaseIndex"], "query": 'select completed from mdl_feedback_tracking where userid=' + cookiesDict["userID"] +
                ' order by completed desc limit 1'
            }
        }).done(function (secondData, textStatus, jqXHR) {
            if (secondData.length == 1) {
                howManyCompleted = 1;
            } else {
                howManyCompleted = parseInt(secondData[1][secondData[0].indexOf("COMPLETED")]) + 1;
                anonymous = "2";
            }
        });
    }).error(function () {
        return false;
    });

    for (var i = 0; i < fieldSelection.length; i++) {
        var currentField = fieldSelection.get(i);
        var fieldAnswer = "";
        if (currentField.nodeName == "DIV") {
            for (var j = 0; j < currentField.children.length; j++) {
                if ($(currentField.children[j]).find("[checked]").length != 0) {
                    break;
                }
            }
            fieldAnswer = j+1;
        } else {
            fieldAnswer = currentField.value;
            if (currentField.type == "number" && currentField.value == "") {
                fieldAnswer = "0";
            }
        }
        $.post({
            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
            async: false,
            data: {
                "connectionIndex": cookiesDict["databaseIndex"], "query": 'insert into mdl_feedback_value (id, course_id, item, completed, tmp_completed, value) VALUES (' + counter.toString() +
                    ",0," + currentField.getAttribute("item") + "," + howManyCompleted.toString() + ",0,'" + fieldAnswer + "')"
            }
        }).done(function (firstData, textStatus, jqXHR) {
            var tries = 1;
            while (firstData.indexOf("error") > -1 && tries != 3) {
                counter++;
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: {
                        "connectionIndex": cookiesDict["databaseIndex"], "query": 'insert into mdl_feedback_value (id, course_id, item, completed, tmp_completed, value) VALUES (' + counter.toString() +
                            ",0," + currentField.getAttribute("item") + "," + howManyCompleted.toString() + ",0,'" + fieldAnswer + "')"
                    }
                }).done(function (errorData, textStatus, jqXHR) {
                    firstData = errorData;
                });
                tries++;
            }
            if (firstData.indexOf("error") > -1) {
                Materialize.toast("Erro SQL! Tente novamente mais tarde.", 3000);
                return false;
            }
        });
        counter++;
    }

    $.post({
        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
        async: false,
        data: {
            "connectionIndex": cookiesDict["databaseIndex"], "query": 'select id from mdl_feedback_completed order by id desc limit 1'
        }
    }).done(function (data, textStatus, jqXHR) {
        counter = parseInt(data[1][0]) + 1;
        $.post({
            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
            async: false,
            data: {
                "connectionIndex": cookiesDict["databaseIndex"], "query": "INSERT INTO mdl_feedback_completed (id, feedback, userid, timemodified, random_response, anonymous_response) VALUES (" +
                    counter.toString() + "," + feedbackID + "," + cookiesDict["userID"] + "," + getUnixTime().toString() + ",0," + anonymous + ")"
            }
        }).done(function (firstData, textStatus, jqXHR) {
            var tries = 1;
            while (firstData.indexOf("error") > -1 && tries != 3) {
                counter++;
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: {
                        "connectionIndex": cookiesDict["databaseIndex"], "query": "INSERT INTO mdl_feedback_completed (id, feedback, userid, timemodified, random_response, anonymous_response) VALUES (" +
                            counter.toString() + "," + feedbackID + "," + cookiesDict["userID"] + "," + getUnixTime().toString() + ",0," + anonymous + ")"
                    }
                }).done(function (errorData, textStatus, jqXHR) {
                    firstData = errorData;
                });
                tries++;
            }
            if (firstData.indexOf("error") > -1) {
                Materialize.toast("Erro SQL! Tente novamente mais tarde.", 3000);
                return false;
            }
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                async: false,
                data: {
                    "connectionIndex": cookiesDict["databaseIndex"], "query": 'select id from mdl_feedback_tracking order by id desc limit 1'
                }
            }).done(function (data, textStatus, jqXHR) {
                counter = parseInt(data[1][0]) + 1;
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: {
                        "connectionIndex": cookiesDict["databaseIndex"], "query": 'INSERT INTO mdl_feedback_tracking(id, userid, feedback, completed, tmp_completed) VALUES (' +
                            counter.toString() + "," + cookiesDict["userID"] + "," + feedbackID + "," + howManyCompleted + ",0)"
                    }
                }).done(function (secondData, textStatus, jqXHR) {
                    var tries = 1;
                    while (secondData.indexOf("error") > -1 && tries != 3) {
                        counter++;
                        $.post({
                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                            async: false,
                            data: {
                                "connectionIndex": cookiesDict["databaseIndex"], "query": 'INSERT INTO mdl_feedback_tracking(id, userid, feedback, completed, tmp_completed) VALUES (' +
                                    counter.toString() + "," + cookiesDict["userID"] + "," + feedbackID + "," + howManyCompleted + ",0)"
                            }
                        }).done(function (errorData, textStatus, jqXHR) {
                            secondData = errorData;
                        });
                        tries++;
                    }
                    if (secondData.indexOf("error") > -1) {
                        Materialize.toast("Erro SQL! Tente novamente mais tarde.", 3000);
                        return false;
                    }
                    $('#content').html("<p class='center'>Seu quizz foi salvo!</p><img class='.imgCenteredMiddle' style='width: 100%' src='../images/universal/ok-icon.png' alt='centered' />");
                });
            });
        });
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
                databaseIndex = cookiesDict["databaseIndex"];
            } catch (Exception) {
                console.log("ERROR: Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            var finalContentHTML = "";
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                data: { "connectionIndex": cookiesDict["databaseIndex"], "query": 'select * from mdl_feedback where id=' + feedbackID }
            }).done(function (data, textStatus, jqXHR) {
                $(".titulo").html(data[1][data[0].indexOf("NAME")]);
                $(".subtitulo").html(data[1][data[0].indexOf("INTRO")]);
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    data: { "connectionIndex": cookiesDict["databaseIndex"], "query": 'select * from mdl_feedback_item where feedback=' + feedbackID + ' order by position' }
                }).done(function (data, textStatus, jqXHR) {
                    var i = 1;
                    for (; data[i];) {
                        var presentation = data[i][data[0].indexOf("PRESENTATION")].split("|");
                        var requiredField = "";
                        if (data[i][data[0].indexOf("REQUIRED")] == "1") {
                            requiredField = " required='true'";
                        }
                        usefulContent += "<p>" + data[i][data[0].indexOf("NAME")];
                        switch (data[i][data[0].indexOf("TYP")]) {
                            case 'textfield':
                                usefulContent += " (máximo de " + presentation[1] + "caracteres)</p><input item='" + data[i][data[0].indexOf("ID")] + "' type='text' style='width:100%' maxlength='" + presentation[1] + "'" + requiredField + " id='" + data[i][data[0].indexOf("ID")] + "' />";
                                break;
                            case 'numeric':
                                usefulContent += " (" + presentation[0] + "-" + presentation[1] + ")</p><input item='" + data[i][data[0].indexOf("ID")] + "' min='" + presentation[0] + "' max='" + presentation[1] + "'" +  requiredField + " type='number' style='width:100%' id='" + data[i][data[0].indexOf("ID")] + "' />";
                                break;
                            case 'multichoice':
                                var j = 0;
                                if (data[i][data[0].indexOf("OPTIONS")] != "" && data[i][data[0].indexOf("OPTIONS")] != "h") {
                                    $("#content").html("Esta enquete contém parâmetros de alternativas não suportados pela aplicação.");
                                    return;
                                }
                                usefulContent += "</p><div item='" + data[i][data[0].indexOf("ID")] + "' " + requiredField + ">";
                                for (j; j < presentation.length; j++) {
                                    if (presentation[j].indexOf("r>") == 0) {
                                        presentation[j] = presentation[j].substr(presentation[j].lastIndexOf(">") + 1);
                                    } else if (presentation[j].indexOf("<") > -1) {
                                        presentation[j] = presentation[j].substr(0, presentation[j].indexOf("<"));
                                    }
                                    usefulContent += "<p><input type='radio' name='" + data[i][data[0].indexOf("ID")] + "' /><span>" + presentation[j] + "</span></p>";
                                }
                                usefulContent += "</div>";
                                break;
                            case 'info':
                                break;
                            default:
                                $("#content").html("Esta enquete contém tipos de alternativas não suportadas pela aplicação.");
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