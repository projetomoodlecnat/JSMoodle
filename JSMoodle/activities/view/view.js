// variáveis de ambiente globais
var cookiesDict = cookiesToDict();

// variável que armazena a referência ao local de pasta
var activityFolder;

// variáveis de atributo da atividade
var activityType;
var activityID;
var activityFile;
var offline = false;

// variáveis que controlam a sequência de operações
var currentOperation;
var operating = null;

$(document).ready(function () {
    $('.paragraphGoBack').click(function () {
        $('.paragraphGoBack').html("<img src='../../images/universal/loading.gif' alt='animacao_carregando'>");
        history.back();
    });
    $('.paragraphSave').click(function () {
        saveActivityProgress(activityFile);
    });
    $('.paragraphClear').click(function () {
        excludeActivityProgress(activityFile);
    });
    activityType = window.location.toString().substring((window.location.toString().indexOf('?') + 1), window.location.toString().indexOf('='));
    currentOperation = "working_inicializar_pasta";
    operating = setInterval(checkCurrentOperation, 1000);
    initializeFolders(activityType);
});

function initializeFolders(activityType) {
    setStatus("progressing", "Tentando carregar as pastas com as suas atividades...");
    switch (activityType) {
        case 'quizz':
            var quizzFolder = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("quizzes");
            quizzFolder.done(function () {
                activityFolder = quizzFolder.operation.getResults();
                currentOperation = 'obter_arquivo';
                setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo...");
            }, function () {
                try {
                    quizzFolder = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("quizzes");
                    quizzFolder.done(function () {
                        activityFolder = quizzFolder.operation.getResults();
                        currentOperation = 'obter_arquivo';
                        setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo...");
                    }, function () {
                        endOperation();
                        return setStatus("error", "Não foi possível criar ou carregar a pasta de quizzes. Algum erro ocorreu!");
                    });
                } catch (exception) {
                    endOperation();
                    return;
                }
            });
            break;
        case 'assignment':
            var assignmentFolder = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("assignments");
            assignmentFolder.done(function () {
                activityFolder = assignmentFolder.operation.getResults();
                currentOperation = 'obter_arquivo';
                setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo...");
            }, function () {
                try {
                    assignmentFolder = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("assignments");
                    assignmentFolder.done(function () {
                        activityFolder = assignmentFolder.operation.getResults();
                        currentOperation = 'obter_arquivo';
                        setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo...");
                    }, function () {
                        endOperation();
                        return setStatus("error", "Não foi possível criar ou carregar a pasta de tarefas. Algum erro ocorreu!");
                    });
                } catch (exception) {
                    endOperation();
                    return;
                }
            });
            break;
        default:
            setStatus("error", "Tipo de atividade inválido ou não suportado.");
            endOperation();
            break;
    }
}

function initializeActivityFile(activityType, activityFolder, id) {
    setStatus("progressing", "Carregando o arquivo da sua atividade...");
    try {
        var createFile = activityFolder.createFileAsync(id);
        createFile.done(function () {
            activityFile = createFile.operation.getResults();
            switch (activityType) {
                case 'quizz':
                    currentOperation = 'carregar_questoes_banco';
                    break;
                case 'assignment':
                    currentOperation = 'carregar_tarefa_banco';
                    break;
                default:
                    setStatus("error", "Você tentou criar o arquivo com tipo de atividade inválido. ");
                    endOperation();
                    break;
            }
        }, function () {
            var getFile = activityFolder.getFileAsync(id);
            getFile.done(function () {
                activityFile = getFile.operation.getResults();
                currentOperation = 'ler_arquivo';
                return setStatus("progressing", "Consegui carregar o arquivo. Transformando em atividade na interface...");
            }, function () {
                endOperation();
                setStatus("error", "Não foi possível carregar ou criar o arquivo da sua atividade.");
            });
        });
    } catch (exception) {
        endOperation();
        setStatus("error", "Não foi possível carregar ou criar o arquivo da sua atividade.");
    }
}

function loadFileIntoInterface(file) {
    try {
        setStatus("progressing", "Lendo do arquivo e transformando na interface... ");
        var readFromFile = Windows.Storage.FileIO.readTextAsync(file);
        readFromFile.done(function () {
            if (readFromFile.operation.getResults() == "") {
                if (offline) {
                    setStatus("neutral", "Você não tem a atividade salva no dispositivo.");
                } else {
                    switch (activityType) {
                        case 'quizz':
                            currentOperation = 'carregar_questoes_banco';
                            break;
                        case 'assignment':
                            currentOperation = 'carregar_tarefa_banco';
                            break;
                        default:
                            setStatus("error", "Tipo de atividade não suportada.");
                            endOperation();
                            break;
                    }
                    return;
                }
            } else {
                setStatus("success", "Arquivo carregado com sucesso. ");
                $('#content').html(readFromFile.operation.getResults());
                if (activityType == 'quizz') {
                    loadQuizzListeners();
                } else if (activityType == 'assignment') {
                    loadAssignmentListeners();
                }
                loadGeneralListeners();
            }
            endOperation();
            return;
        }, function () {
            setStatus("error", "Não foi possível ler do arquivo da atividade. Verifique se você tem permissões de leitura no arquivo.");
            endOperation();
            return;
        });
    } catch (exception) {
        setStatus("error", "Não foi possível ler do arquivo da atividade. Verifique se você tem permissões de leitura no arquivo.");
        endOperation();
        return;
    }
}

function loadQuestionsFromDatabase() {
    setStatus("progressing", "Foi criado um arquivo no qual guardarei as suas respostas. Carregando a atividade do banco... ");
    var stringHTMLBuilder = "";
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
        contentType: "application/json",
        method: "GET",
        async: true,
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                document.cookie = "databaseType=" + firstStep[0]["databaseType"];
                document.cookie = "databaseIndex=" + firstStep[1]["idconexao"];
            } catch (Exception) {
                setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                endOperation();
                return;
            }
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                async: true,
                data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": firstStep[10]["comando"] + " WHERE quizid=" + activityID + " ORDER BY slot" }
            }).done(function (data, textStatus, jqXHR) {
                var questionNames = []
                var oneLiners = []
                try {
                    console.log(data[1]);
                } catch (exception) {
                    stringHTMLBuilder = "O quizz não tem questões registradas.";
                    endOperation();
                    return;
                }
                for (var i = 1; i < data.length; i++) {
                    var optionType = data[i][data[0].indexOf("QTYPE")];
                    var complementHTML = "";
                    var inputType = "";
                    var questionToHTML = "";
                    try {
                        switch (optionType) {
                            case 'multichoice':
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select single from mdl_qtype_multichoice_options where questionid=" + data[i][data[0].indexOf("QUESTIONID")] }
                                }).done(function (innerData, textStatus, jqXHR) {
                                    if (innerData[1][0] == "0") {
                                        inputType = "checkbox";
                                    } else {
                                        inputType = "radio";
                                    }
                                }).error(function () {
                                    setStatus("error", "Erro na requisição que define o tipo das questões.");
                                    throw new (Error("REQUEST_EXCEPTION"));
                                });
                                break;
                            case 'truefalse':
                                inputType = "radio";
                                break;
                            case 'match':
                                questionToHTML = [];
                                complementHTML = [];
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select * from mdl_qtype_match_subquestions where questionid=" + data[i][data[0].indexOf("QUESTIONID")] }
                                }).done(function (innerData, textStatus, jqXHR) {
                                    for (var j = 1; j < innerData.length; j++) {
                                        if (innerData[j][innerData[0].indexOf("QUESTIONTEXT")] != "") {
                                            questionToHTML.push(innerData[j][innerData[0].indexOf("QUESTIONTEXT")]);
                                        }
                                        complementHTML.push(innerData[j][innerData[0].indexOf("ANSWERTEXT")]);
                                    }
                                });
                                break;
                            case 'essay':
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select * from mdl_qtype_essay_options where questionid=" + data[i][data[0].indexOf("QUESTIONID")] }
                                }).done(function (innerData, textStatus, jqXHR) {
                                    if (innerData[1][innerData[0].indexOf("ATTACHMENTSREQUIRED")] != "0" || innerData[1][innerData[0].indexOf("RESPONSETEMPLATE")] != "") {
                                        setStatus("error", "A questão contém configurações que não são suportadas pelo aplicativo.");
                                        throw new (Error("DATA_EXCEPTION"));
                                    } else {
                                        if (innerData[1][innerData[0].indexOf("ATTACHMENTS")] != "0") {
                                            complementHTML = "<input type='file' id='input-" + data[i][data[0].indexOf("SLOTID")] + "' maxfiles='" + innerData[1][innerData[0].indexOf("ATTACHMENTS")] + "' /><div id='d-input-" + data[i][data[0].indexOf("SLOTID")] + "'></div>";
                                        }
                                        questionToHTML = "<li><textarea style='height:" + (parseInt(innerData[1][innerData[0].indexOf("RESPONSEFIELDLINES")]) * 22) + "px' slot='" + data[i][data[0].indexOf("SLOTID")] + "' required='" + (innerData[1][innerData[0].indexOf("RESPONSEREQUIRED")] == "1").toString() + "'";
                                    }
                                }).error(function () {
                                    setStatus("error", "Erro na requisição que define o tipo das questões.");
                                    throw new (Error("REQUEST_EXCEPTION"));
                                });
                                break;
                            case 'shortanswer':
                                inputType = 'text';
                                break;
                            case 'numerical':
                                inputType = 'number';
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select * from mdl_question_numerical_options where question=" + data[i][data[0].indexOf("QUESTIONID")] }
                                }).done(function (innerData, textStatus, jqXHR) {
                                    if (innerData[1][innerData[0].indexOf("UNITGRADINGTYPE")] == "1") {
                                        setStatus("error", "A questão contém configurações que não são suportadas pelo aplicativo.");
                                        throw new (Error("DATA_EXCEPTION"));
                                    }
                                }).error(function () {
                                    setStatus("error", "Erro na requisição que define o tipo das questões.");
                                    throw new (Error("REQUEST_EXCEPTION"));
                                });
                                break;
                            case 'description':
                                break;
                            default:
                                setStatus("error", "A questão contém configurações que não são suportadas pelo aplicativo.");
                                throw new (Error("DATA_EXCEPTION"));
                                break;
                        }
                        if (questionNames.indexOf(data[i][data[0].indexOf("QUESTIONID")]) == -1) {
                            questionNames.push(data[i][data[0].indexOf("QUESTIONID")]);
                            if (data[i][data[0].indexOf("QTYPE")] == 'description') {
                                stringHTMLBuilder += "<div class='paragraphDescription'><ul>" + data[i][data[0].indexOf("QUESTIONTEXT")];
                                continue;
                            }
                            stringHTMLBuilder += "</ul></div><div type='" + optionType + "' class='questioncontainer'><b>Questão: </b>" + data[i][data[0].indexOf("QUESTIONTEXT")] + "<ul>";
                        }
                        if (optionType == "multichoice" || optionType == "truefalse") {
                            stringHTMLBuilder += "<li><input class='with-gap' slot='" + data[i][data[0].indexOf("SLOTID")] + "' name='" + data[i][data[0].indexOf("QUESTIONID")] + "' type='" + inputType + "' style='margin-right: 5px; float:left; position:static; opacity: 1'/>" + data[i][data[0].indexOf("ANSWER")] + "</li>";
                        } else if ((optionType == "shortanswer" || optionType == "numerical") && oneLiners.indexOf(data[i][data[0].indexOf("QUESTIONID")]) == -1) {
                            oneLiners.push(data[i][data[0].indexOf("QUESTIONID")]);
                            stringHTMLBuilder += "<li><input slot='" + data[i][data[0].indexOf("SLOTID")] + "' name='" + data[i][data[0].indexOf("QUESTIONID")] + "' type='" + inputType + "'/></li>";
                        } else if (optionType == "essay") {
                            stringHTMLBuilder += questionToHTML + " slot='" + data[i][data[0].indexOf("SLOTID")] + "' name='" + data[i][data[0].indexOf("QUESTIONID")] + "'></textarea>" +
                                complementHTML + "</li>";
                        } else if (optionType == "match") {
                            while (questionToHTML.length > 0) {
                                stringHTMLBuilder += questionToHTML.pop() + "<select><option value=''></option>";
                                for (var j = 0; j < complementHTML.length; j++) {
                                    stringHTMLBuilder += "<option value='" + complementHTML[j] + "'>" + complementHTML[j] + "</option>";
                                }
                                stringHTMLBuilder += "</select>";
                            }
                        }
                    } catch (exception) {
                        $('#content').html("");
                        endOperation();
                        return false;
                    }
                }
                $("#content").html(stringHTMLBuilder + "<br><p class='paragraphFinishAttempt'>FINALIZAR A SUA TENTATIVA</p>");
                setStatus("succeeded", "As questões foram carregadas com sucesso e renderizadas na interface. ");
                loadQuizzListeners();
                loadGeneralListeners();
                currentOperation = "salvar_progresso";
            }).error(function () {
                setStatus("error", "A requisição à API do Moodle falhou na obtenção das questões. ");
                endOperation();
            });
        }
    }).error(function () {
        // Requisição à API falhou
        // Tentará carregar o arquivo do dispositivo
        offline = true;
        setStatus("neutral", "A requisição de acesso à API do Moodle falhou no primeiro estágio. Você está conectado à internet? Se não, aguarde enquanto procuro o arquivo da atividade... ");
        currentOperation = 'ler_arquivo';
    });
}

function saveActivityProgress(activityFile) {
    setStatus("progressing", "Processando o conteúdo para um arquivo, aguarde... ");
    if (activityType == "quizz") {
        var savingOperation = Windows.Storage.FileIO.writeTextAsync(activityFile, $('#content').html());
        savingOperation.done(function () {
            setStatus("success", "Seu progresso foi salvo em um arquivo e será carregado na próxima vez que você entrar na tarefa.");
            Materialize.toast('Arquivo salvo!', 3000);
            $('.paragraphSave').html('SALVAR O SEU PROGRESSO');
            endOperation();
            return;
        }, function () {
            setStatus("error", "Não foi possível salvar o seu progresso.");
            $('.paragraphSave').html('SALVAR O SEU PROGRESSO');
            endOperation();
            return;
        });
    } else if (activityType == "assignment") {
        var savingOperation = Windows.Storage.FileIO.writeTextAsync(activityFile, $('#content').html());
        savingOperation.done(function () {
            setStatus("success", "A atividade foi salva no dispositivo e tentarei carregá-la na próxima vez que você tentar iniciá-la.");
            endOperation();
            return;
        }, function () {
            setStatus("neutral", "Não foi possível salvar a atividade no dispositivo.");
            endOperation();
            return;
        });
    }
}

function excludeActivityProgress(activityFile) {
    setStatus("progressing", "Excluindo o seu progresso dos arquivos, aguarde... ");
    $('.paragraphClear').html("<img src='../../images/universal/loading.gif' alt='animacao_carregando'>");
    var fileDeleteOperation = activityFile.deleteAsync(Windows.Storage.StorageDeleteOption.permanentDelete);
    fileDeleteOperation.done(function () {
        $('#content').html("Excluído com sucesso. Recarregarei a página... ");
        setTimeout(function () {
            window.location = window.location.toString();
            console.log("deletion_ok");
        }, 2000);
        endOperation();
    }, function () {
        $('#content').html("Falha ao excluir o arquivo corrompido. Tente excluir o arquivo manualmente!");
        setTimeout(function () {
            window.location = "/index.html";
            console.log("deletion_failed");
        }, 2000);
        endOperation();
    });
}

function checkCurrentOperation() {
    console.log(currentOperation);
    switch (currentOperation) {
        case 'obter_arquivo':
            currentOperation = 'working_obter_arquivo';
            switch (activityType) {
                case 'quizz':
                    activityID = window.location.toString().substr(window.location.toString().indexOf('=') + 1);
                    // verifica a cada segundo se a tarefa de criação já completou
                    // parâmetro da query string para determinar o id da atividade
                    initializeActivityFile(activityType, activityFolder, activityID);
                    break;
                case 'assignment':
                    activityID = window.location.toString().substr(window.location.toString().indexOf('=') + 1);
                    // verifica a cada segundo se a tarefa de criação já completou
                    // parâmetro da query string para determinar o id da atividade
                    initializeActivityFile(activityType, activityFolder, activityID);
                    break;
                default:
                    endOperation();
                    console.log('tipo inválido');
                    break;
            }
            break;
        case 'ler_arquivo':
            currentOperation = 'working_ler_arquivo';
            loadFileIntoInterface(activityFile);
            break;
        case 'carregar_questoes_banco':
            currentOperation = 'working_carregar_questoes_banco';
            loadQuestionsFromDatabase();
            break;
        case 'carregar_tarefa_banco':
            currentOperation = 'working_carregar_tarefa_banco';
            loadAssignmentFromDatabase();
            break;
        case 'salvar_progresso':
            currentOperation = 'working_salvar_progresso';
            saveActivityProgress(activityFile);
            break;
        case 'excluir_progresso':
            currentOperation = 'working_excluir_progresso';
            excludeActivityProgress(activityFile);
            break;
        default:
            break;
    }
}

function endOperation() {
    clearInterval(operating);
    operating = null;
}

function restartOperation(fromStep) {
    if (operating == null) {
        currentOperation = fromStep;
        operating = setInterval(checkCurrentOperation, 1000);
    } else {
        console.log("[ERRO] Operação em andamento.");
    }
}

// TENTATIVAS DE QUIZZ

function calculateFractionsMultiAnswer(multiAnswerQuestion) {
    var sumFractions = 0.0;
    for (var i = 1; i < data.length; i++) {
        var fraction = parseFloat(multiAnswerQuestion[i][multiAnswerQuestion[0].indexOf("FRACTION")]);
        if (fraction > 0) {
            sumFractions += fraction;
        }
    }
    return sumFractions;
}

function stateQuizzAttempt(answer_fraction, max_fraction) {
    if (answer_fraction == max_fraction) {
        return "gradedright";
    } else if (answer_fraction > 0) {
        return "gradedpartial";
    } else {
        return "gradedwrong";
    }
}

function checkRequiredFields() {
    var allContainers = $(".questioncontainer input");
    allContainers = allContainers.add($(".questioncontainer textarea"));
    allContainers = allContainers.add($(".questioncontainer select"));
    var requiredContainers = $("[required='true']", allContainers);
    requiredContainers.each(function (index) {
        var selectedElement = $(this);
        if (selectedElement.prop('nodeName') == "TEXTAREA" && selectedElement.length == 0) {
            setStatus("neutral", "Você precisa responder algumas questões requeridas!");
            selectedElement.focus();
            allContainers = false;
            return false;
        }
    });
    return allContainers;
}

function canUserAttempQuizz() {
    var quizzAttemptResults;
    $.post({
        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
        async: false,
        data: {
            "connectionIndex": cookiesDict["databaseIndex"], "query": "select id, (select attempt from mdl_quiz_attempts where userid=" + cookiesDict["userID"] + " and quiz=" + activityID + " order by attempt desc limit 1) attempt, (select attempts from mdl_quiz where id=" + activityID + ") max_attempts from mdl_quiz_attempts order by id desc limit 1"
        }
    }).done(function (serialData, textStatus, jqXHR) {
        if (serialData[0].indexOf("error") > -1) {
            setStatus("error", "Um erro ocorreu na busca das suas tentativas nesse quizz.");
            quizzAttemptResults = false;
        }
        quizzAttemptResults = serialData;
        quizzAttemptResults[1][0] = parseInt(quizzAttemptResults[1][0]) + 1;
        quizzAttemptResults[1][2] = parseInt(quizzAttemptResults[1][2]);
        if (quizzAttemptResults[1][1] == "") {
            quizzAttemptResults[1][1] = 0;
        }
        quizzAttemptResults[1][1] = parseInt(quizzAttemptResults[1][1]) + 1;
        if (quizzAttemptResults[1][1] >= quizzAttemptResults[1][2] && quizzAttemptResults[1][2] != 0) {
            setStatus("neutral", "Você já estourou o limite de tentativas permitidas para esse quizz.");
            quizzAttemptResults = false;
        }
    }).error(function () {
        setStatus("error", "Erro na requisição da API.");
        quizzAttemptResults = false;
    });
    return quizzAttemptResults;
}

function checkIfContainerHasNoAnswer(container) {
    if (container.attr('type') == 'multichoice' || container.attr('type') == 'truefalse') {
        if (container.find("input[checked='true']").length == 0) {
            return true;
        } else {
            return false;
        }
    } else if (container.attr('type') == 'shortanswer' || container.attr('type') == 'numerical') {
        if (container.find("input[value='']").length > 0) {
            return true;
        } else {
            return false;
        }
    } else if (container.attr('type') == 'match') {
        if (container.find("select[value='']").length > 0) {
            return true;
        } else {
            return false;
        }
    } else {
        return "error";
    }
}

function processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots) {
    setStatus("progressing", "Processando as tentativas sem resposta...");
    var cumulativeAnswerID;
    var returnValue = false;
    try {
        var allContainers = $('.questioncontainer');
        allContainers.each(function (index) {
            var selectedContainer = $(this);
            var isContainerUnanswered = checkIfContainerHasNoAnswer(selectedContainer);
            if (isContainerUnanswered) {
                var selectedElement = $(selectedContainer.find("input")[0]);
                if (selectedElement.length == 0) {
                    setStatus("error", "Falha no processamento das questões em branco.");
                    return false;
                }
                var rightAnswerAndValue = ["", -9999.0];
                var sumFractions;
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: { "connectionIndex": connectionIndex, "query": command + " where mdl_quiz_slots.id=" + selectedElement.attr("slot") + " order by mdl_question_answers.id" }
                }).done(function (data, textStatus, jqXHR) {
                    try {
                        sumFractions = 0.0;
                        cumulativeAnswerID = "";
                        for (var i = 1; i < data.length; i++) {
                            cumulativeAnswerID += data[i][data[0].indexOf("ANSWERID")] + ",";
                            if (parseFloat(data[i][data[0].indexOf("FRACTION")]) >= rightAnswerAndValue[1]) {
                                if (parseFloat(data[i][data[0].indexOf("FRACTION")]) > 0) {
                                    sumFractions += parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                }
                                if (parseFloat(data[i][data[0].indexOf("FRACTION")]) == rightAnswerAndValue[1]) {
                                    rightAnswerAndValue[0] += splitHTMLText(data[i][data[0].indexOf("ANSWER")]);
                                } else {
                                    rightAnswerAndValue[0] = splitHTMLText(data[i][data[0].indexOf("ANSWER")]);
                                    rightAnswerAndValue[1] = parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                }
                            }
                        }
                        if (selectedElement.prop('type') == "TEXT") {
                            fieldAnswer = selectedElement.val();
                        } else if (selectedElement[0].nextSibling.toString() == "[object Text]") {
                            fieldAnswer = selectedElement[0].nextSibling.wholeText;
                        } else {
                            fieldAnswer = selectedElement[0].nextSibling.outerHTML;
                        }

                        fieldAnswer = splitHTMLText(fieldAnswer);
                    } catch (exception) {
                        setStatus("error", "Os resultados da requisição falharam no primeiro estágio.");
                        return false;
                    }
                    for (var i = 1; i < data.length; i++) {
                        if (splitHTMLText(data[i][data[0].indexOf("ANSWER")]) == fieldAnswer) {
                            answerValue = i - 1;
                            data[i][data[0].indexOf("FRACTION")] = data[i][data[0].indexOf("FRACTION")].replace(",", ".");
                            data[i][data[0].indexOf("MAXMARK")] = data[i][data[0].indexOf("MAXMARK")].replace(",", ".");
                            layoutSlots += data[i][data[0].indexOf("SLOT")] + ",";
                            var userAnswer = "";
                            if (rightAnswerAndValue[0] == "Falso") {
                                rightAnswerAndValue[0] = "False";
                            } else if (rightAnswerAndValue[0] == "Verdadeiro") {
                                rightAnswerAndValue[0] = "True";
                            }
                            if (userAnswer == "Falso") {
                                userAnswer = "False";
                                answerValue = 0;
                            } else if (userAnswer == "Verdadeiro") {
                                userAnswer = "True";
                                answerValue = 1;
                            }
                            $.post({
                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                async: false,
                                data: { "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempts order by id desc limit 1" }
                            }).done(function (secondData, textStatus, jqXHR) {
                                secondData[1][0] = parseInt(secondData[1][0]) + 1;
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: {
                                        "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                            + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                            ",0," + rightAnswerAndValue[1].toString() + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + userAnswer + "'," + getUnixTime().toString() + ") returning id"
                                    }
                                }).done(function (insertSerialData, textStatus, jqXHR) {
                                    // tentando contornar o problema do ID não ser serializado (auto-incremental)
                                    // POST on MDL_QUESTION_ATTEMPTS

                                    var tries = 0;
                                    while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                        secondData[1][0] += 1;
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: {
                                                "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                    + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                    ",0," + rightAnswerAndValue[1].toString() + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + userAnswer + "'," + getUnixTime().toString() + ") returning id"
                                            }
                                        }).done(function (hasErrors) {
                                            insertSerialData = hasErrors;
                                        }).error(function () {
                                            setStatus("error", "Requisição à API falhou.");
                                            return false;
                                        });
                                        tries++;
                                    }

                                    // end POST on MDL_QUESTION_ATTEMPTS
                                    // POST on MDL_QUESTION_ATTEMPT_STEPS with MDL_QUESTION_ATTEMPTS query results

                                    $.post({
                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                        async: false,
                                        data: {
                                            "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_steps order by id desc limit 1"
                                        }
                                    }).done(function (secondData2, textStatus, jqXHR) {
                                        secondData2[1][0] = parseInt(secondData2[1][0]) + 1;
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: {
                                                "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                            secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                            (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",1,'gaveup',null," + getUnixTime().toString() + "," + cookiesDict["userID"] + ") returning id"
                                            }
                                        }).done(function (insertSerialData, textStatus, jqXHR) {
                                            var tries = 0;
                                            while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                secondData2[1][0] += 1;
                                                $.post({
                                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                    async: false,
                                                    data: {
                                                        "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                            secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                            (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",1,'gaveup',null," + getUnixTime().toString() + "," + cookiesDict["userID"] + ") returning id"
                                                    }
                                                }).done(function (hasErrors) {
                                                    insertSerialData = hasErrors;
                                                })
                                                .error(function () {
                                                    setStatus("error", "Requisição à API falhou.");
                                                    return false;
                                                });
                                                tries++;
                                            }
                                            var savedSerialData = []
                                            savedSerialData[1] = insertSerialData[1][0];
                                            savedSerialData[2] = insertSerialData[2][0];
                                            // POST on MDL_QUESTION_ATTEMPT_STEP_DATA with MDL_QUESTION_ATTEMPT_STEPS query results

                                            $.post({
                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                async: false,
                                                data: {
                                                    "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_step_data order by id desc limit 1"
                                                }
                                            }).done(function (secondData3) {
                                                secondData3[1][0] = parseInt(secondData3[1][0]) + 1;
                                                $.post({
                                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                    async: false,
                                                    data: {
                                                        "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                    secondData3[1][0].toString() + "," + savedSerialData[1] + ",'_order','" + cumulativeAnswerID.substring(0, cumulativeAnswerID.lastIndexOf(",")) + "'),(" +
                                                                    (secondData3[1][0] + 1).toString() + "," + savedSerialData[2] + ",'-finish', '1')"
                                                    }
                                                }).done(function (insertSerialData, textStatus, jqXHR) {
                                                    var tries = 0;
                                                    while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                        secondData3[1][0] += 1;
                                                        $.post({
                                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                            async: false,
                                                            data: {
                                                                "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                            secondData3[1][0].toString() + "," + savedSerialData[1] + ",'_order','" + cumulativeAnswerID.substring(0, cumulativeAnswerID.lastIndexOf(",")) + "'),(" +
                                                                            (secondData3[1][0] + 1).toString() + "," + savedSerialData[2] + ",'-finish', '1')"
                                                            }
                                                        }).done(function (hasErrors) {
                                                            insertSerialData = hasErrors;
                                                        });
                                                        tries++;
                                                    }
                                                    if (insertSerialData[0].indexOf("error") > -1) {
                                                        setStatus("error", "Erro na transação SQL.");
                                                        return false;
                                                    }
                                                    styleQuestion(selectedElement, 'not_answered');
                                                    if (allContainers.eq(index + 1).length == 0) {
                                                        returnValue = [true, layoutSlots];
                                                        return false;
                                                    }
                                                });

                                                // end POST on MDL_QUESTION_ATTEMPT_STEP_DATA with MDL_QUESTION_ATTEMPT_STEPS query results
                                            });
                                        });
                                    });

                                    // end POST on MDL_QUESTION_ATTEMPT_STEPS with MDL_QUESTION_ATTEMPTS query results
                                });
                            });
                            break;
                        }
                    }
                }).error(function () {
                    setStatus("error", "Requisição à API falhou no primeiro estágio.");
                    return false;
                });
            } else if (isContainerUnanswered == "error") {
                setStatus("error", "Erro no processamento das questões sem resposta.");
                returnValue = false;
                return false;
            }
        }).promise().done(function () {
            returnValue = [true, layoutSlots];
        });
    } catch (exception) {
        return false;
    }
    return returnValue;
}

function processActivityAttempt(questionUsageID, connectionIndex, queriesBatch) {
    setStatus("progressing", "Processando a sua tentativa...");
    var greaterInterval;
    var isDone = [false];

    // variáveis de tentativa em quizz
    var quizzAttemptResults = false;

    // variáveis de questão em quizz
    var lastProcessedSlotAttemptID;
    var lastProcessedAttemptDataID;
    var individualFraction = 0.0;
    var processedMultiSlot = null;
    var answerValue;

    // variáveis de quizz
    var finalFractionGrade = 0.0;
    var layoutSlots = "";
    var cumulativeAnswerID;

    var command = queriesBatch[14]["comando"].replace(/[\r\n]/g, "");

    switch (activityType) {
        case 'quizz':
            // Verificando se o usuário pode submeter o quizz

            quizzAttemptResults = canUserAttempQuizz();
            if (quizzAttemptResults == false) {
                return quizzAttemptResults;
            }
            var requiredFieldCheck = checkRequiredFields();
            if (requiredFieldCheck == false) {
                return requiredFieldCheck;
            }

            // end Verificando se o usuário pode submeter o quizz
            var matchSelected = $();//= $("input[checked='true']", requiredFieldCheck);
            requiredFieldCheck.each(function () {
                var field = $(this);
                if ((field.val() != "" && field.prop('type') == 'TEXTBOX') || (field[0].checked || field.prop('type') == 'TEXTAREA')) {
                    matchSelected = matchSelected.add(field);
                }
            });
            if (matchSelected.length == 0) {
                isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
            } else {
                setStatus("progressing", "Processando as tentativas com resposta...");
                matchSelected.each(function (index) {
                    var selectedElement = $(this);
                    var rightAnswerAndValue = ["", -9999.0];
                    var sumFractions = 0.0;
                    var isEssay = (selectedElement.prop('nodeName') == "TEXTAREA");
                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        async: false,
                        data: { "connectionIndex": connectionIndex, "query": command + " where mdl_quiz_slots.id=" + selectedElement.attr("slot") + " order by mdl_question_answers.id" }
                    }).done(function (data, textStatus, jqXHR) {
                        var fieldAnswer = "";
                        try {
                            if (isEssay) {
                                fieldAnswer = selectedElement.val();
                                rightAnswerAndValue["", 0];
                                var i = 1;
                                layoutSlots += data[i][data[0].indexOf("SLOT")] + ",";
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempts order by id desc limit 1" }
                                }).done(function (secondData, textStatus, jqXHR) {
                                    secondData[1][0] = parseInt(secondData[1][0]) + 1;
                                    $.post({
                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                        async: false,
                                        data: {
                                            "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'manualgraded'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                ",0," + data[i][data[0].indexOf("MAXMARK")] + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + fieldAnswer + "'," + getUnixTime().toString() + ") returning id"
                                        }
                                    }).done(function (insertSerialData, textStatus, jqXHR) {
                                        var tries = 0;
                                        while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                            secondData[1][0] += 1;
                                            $.post({
                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                async: false,
                                                data: {
                                                    "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                        + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'manualgraded'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                        ",0," + data[i][data[0].indexOf("MAXMARK")] + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + fieldAnswer + "'," + getUnixTime().toString() + ") returning id"
                                                }
                                            }).done(function (hasErrors) {
                                                insertSerialData = hasErrors;
                                            }).error(function () {
                                                setStatus("error", "Requisição à API falhou.");
                                                return false;
                                            });
                                            tries++;
                                        }
                                        if (insertSerialData[0].indexOf("error") > -1) {
                                            setStatus("error", "Erro na transação SQL.");
                                            isDone = false;
                                            return false;
                                        }
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: {
                                                "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_steps order by id desc limit 1"
                                            }
                                        }).done(function (secondData2, textStatus, jqXHR) {
                                            secondData2[1][0] = parseInt(secondData2[1][0]) + 1;
                                            $.post({
                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                async: false,
                                                data: {
                                                    "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                                secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",1,'todo', null, " + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                (secondData2[1][0] + 2).toString() + "," + secondData[1][0].toString() + ",2,'gaveup', null, " + getUnixTime().toString() + "," + cookiesDict["userID"] +
                                                                ") returning id"
                                                }
                                            }).done(function (insertSerialData, textStatus, jqXHR) {
                                                var tries = 0;
                                                while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                    secondData2[1][0] += 1;
                                                    $.post({
                                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                        async: false,
                                                        data: {
                                                            "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                                        secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                        (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",1,'todo', null, " + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                        (secondData2[1][0] + 2).toString() + "," + secondData[1][0].toString() + ",2,'gaveup', null, " + getUnixTime().toString() + "," + cookiesDict["userID"] +
                                                                        ") returning id"
                                                        }
                                                    }).done(function (hasErrors) {
                                                        insertSerialData = hasErrors;
                                                    })
                                                    .error(function () {
                                                        setStatus("error", "Requisição à API falhou.");
                                                        isDone = false;
                                                        return false;
                                                    });
                                                    tries++;
                                                }
                                                if (insertSerialData[0].indexOf("error") > -1) {
                                                    setStatus("error", "Erro na transação SQL.");
                                                    return false;
                                                }
                                                var savedSerialData = []
                                                savedSerialData[2] = insertSerialData[2][0];
                                                lastProcessedAttemptDataID = savedSerialData[2];
                                                savedSerialData[3] = insertSerialData[3][0];
                                                $.post({
                                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                    async: false,
                                                    data: {
                                                        "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_step_data order by id desc limit 1"
                                                    }
                                                }).done(function (secondData3) {
                                                    secondData3[1][0] = parseInt(secondData3[1][0]) + 1;
                                                    $.post({
                                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                        async: false,
                                                        data: {
                                                            "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                        secondData3[1][0].toString() + "," + savedSerialData[2] + ",'answer','" + fieldAnswer + "'),(" +
                                                                        (secondData3[1][0] + 1).toString() + "," + savedSerialData[2] + ",'answerformat', '1'),(" + (secondData3[1][0] + 2).toString() + "," + savedSerialData[3] + ",'-finish','1')"
                                                        }
                                                    }).done(function (insertSerialData, textStatus, jqXHR) {
                                                        var tries = 0;
                                                        while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                            secondData3[1][0] += 1;
                                                            $.post({
                                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                                async: false,
                                                                data: {
                                                                    "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                                secondData3[1][0].toString() + "," + savedSerialData[2] + ",'answer','" + fieldAnswer + "'),(" +
                                                                                (secondData3[1][0] + 1).toString() + "," + savedSerialData[2] + ",'answerformat', '1'),(" + (secondData3[1][0] + 2).toString() + "," + savedSerialData[3] + ",'-finish','1')"
                                                                }
                                                            }).done(function (hasErrors) {
                                                                insertSerialData = hasErrors;
                                                            });
                                                            tries++;
                                                        }
                                                        if (insertSerialData[0].indexOf("error") > -1) {
                                                            setStatus("error", "Erro na transação SQL.");
                                                            isDone = false;
                                                            return false;
                                                        }
                                                        if (finalFractionGrade + parseFloat(data[i][data[0].indexOf("FRACTION")]) >= 0) {
                                                            finalFractionGrade += parseFloat(data[i][data[0].indexOf("FRACTION")]) * parseFloat(data[i][data[0].indexOf("MAXMARK")]);
                                                        }
                                                        if (matchSelected.eq(index + 1).length == 0) {
                                                            isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                                        }
                                                    }).error(function () {
                                                        isDone = false;
                                                        return false;
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                                return false;
                            } else {
                                cumulativeAnswerID = "";
                                for (var i = 1; i < data.length; i++) {
                                    cumulativeAnswerID += data[i][data[0].indexOf("ANSWERID")] + ",";
                                    if (parseFloat(data[i][data[0].indexOf("FRACTION")]) >= rightAnswerAndValue[1]) {
                                        if (parseFloat(data[i][data[0].indexOf("FRACTION")]) > 0) {
                                            sumFractions += parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                        }
                                        if (parseFloat(data[i][data[0].indexOf("FRACTION")]) == rightAnswerAndValue[1]) {
                                            rightAnswerAndValue[0] += splitHTMLText(data[i][data[0].indexOf("ANSWER")]);
                                        } else {
                                            rightAnswerAndValue[0] = splitHTMLText(data[i][data[0].indexOf("ANSWER")]);
                                            rightAnswerAndValue[1] = parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                        }
                                    }
                                }
                                if (selectedElement.prop('type') == "TEXT") {
                                    fieldAnswer = selectedElement.val();
                                } else if (selectedElement[0].nextSibling.toString() == "[object Text]") {
                                    fieldAnswer = selectedElement[0].nextSibling.wholeText;
                                } else {
                                    fieldAnswer = selectedElement[0].nextSibling.outerHTML;
                                }
                                fieldAnswer = splitHTMLText(fieldAnswer);
                            }
                        } catch (exception) {
                            setStatus("error", "Os resultados da requisição falharam no primeiro estágio.");
                            isDone = false;
                            return false;
                        }
                        for (var i = 1; i < data.length; i++) {
                            if (splitHTMLText(data[i][data[0].indexOf("ANSWER")]) == fieldAnswer) {
                                // A questão faz parte de um quizz de multi-escolhas e os registros já foram inseridos?

                                answerValue = i - 1;
                                data[i][data[0].indexOf("FRACTION")] = data[i][data[0].indexOf("FRACTION")].replace(",", ".");
                                data[i][data[0].indexOf("MAXMARK")] = data[i][data[0].indexOf("MAXMARK")].replace(",", ".");
                                if (processedMultiSlot == selectedElement.attr('slot')) {
                                    $.post({
                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                        async: false,
                                        data: { "connectionIndex": connectionIndex, "query": "UPDATE mdl_question_attempts SET responsesummary = responsesummary || '; " + fieldAnswer + "' where id =" + lastProcessedSlotAttemptID }
                                    }).done(function (updateData) {
                                    });
                                    individualFraction += parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                    if (matchSelected.eq(index + 1).length == 0) {
                                        finalFractionGrade += (individualFraction * parseFloat(data[i][data[0].indexOf("MAXMARK")]));
                                        if (finalFractionGrade < 0) {
                                            finalFractionGrade = 0;
                                        }
                                        if (individualFraction < 0) {
                                            individualFraction = 0;
                                        }
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: { "connectionIndex": connectionIndex, "query": "UPDATE mdl_question_attempt_steps SET state='" + stateQuizzAttempt(individualFraction, sumFractions) + "', fraction=" + individualFraction.toString() + " where id=" + lastProcessedAttemptDataID }
                                        }).done(function (updateData) {
                                        });
                                        styleQuestion(selectedElement, individualFraction, sumFractions, data[i][data[0].indexOf("FEEDBACK")]);
                                        isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                    }
                                    break;
                                } else if (processedMultiSlot != null) {
                                    processedMultiSlot = null;
                                    individualFraction += parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                    finalFractionGrade += (individualFraction * parseFloat(data[i][data[0].indexOf("MAXMARK")]));
                                    if (finalFractionGrade < 0) {
                                        finalFractionGrade = 0;
                                    }
                                    if (individualFraction < 0) {
                                        individualFraction = 0;
                                    }
                                    $.post({
                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                        async: false,
                                        data: { "connectionIndex": connectionIndex, "query": "UPDATE mdl_question_attempt_steps SET state='" + stateQuizzAttempt(individualFraction, sumFractions) + "', fraction=" + individualFraction.toString() + " where id=" + lastProcessedAttemptDataID }
                                    }).done(function (updateData) {
                                    });
                                    styleQuestion(selectedElement, individualFraction, sumFractions, data[i][data[0].indexOf("FEEDBACK")]);
                                    if (matchSelected.eq(index + 1).length == 0) {
                                        isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                    }
                                }

                                // end A questão faz parte de um quizz de multi-escolhas e os registros já foram inseridos?
                                layoutSlots += data[i][data[0].indexOf("SLOT")] + ",";
                                if (rightAnswerAndValue[0] == "Falso") {
                                    rightAnswerAndValue[0] = "False";
                                } else if (rightAnswerAndValue[0] == "Verdadeiro") {
                                    rightAnswerAndValue[0] = "True";
                                }
                                if (fieldAnswer == "Falso") {
                                    fieldAnswer = "False";
                                    answerValue = 0;
                                } else if (fieldAnswer == "Verdadeiro") {
                                    fieldAnswer = "True";
                                    answerValue = 1;
                                }
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempts order by id desc limit 1" }
                                }).done(function (secondData, textStatus, jqXHR) {
                                    secondData[1][0] = parseInt(secondData[1][0]) + 1;
                                    $.post({
                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                        async: false,
                                        data: {
                                            "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                ",0," + rightAnswerAndValue[1].toString() + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + fieldAnswer + "'," + getUnixTime().toString() + ") returning id"
                                        }
                                    }).done(function (insertSerialData, textStatus, jqXHR) {
                                        // tentando contornar o problema do ID não ser serializado (auto-incremental)
                                        // POST on MDL_QUESTION_ATTEMPTS

                                        var tries = 0;
                                        while (insertSerialData[0].indexOf("duplicate") > -1 && tries!=3) {
                                            secondData[1][0] += 1;
                                            $.post({
                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                async: false,
                                                data: {
                                                    "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                        + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                        ",0," + rightAnswerAndValue[1].toString() + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + fieldAnswer + "'," + getUnixTime().toString() + ") returning id"
                                                }
                                            }).done(function (hasErrors) {
                                                insertSerialData = hasErrors;
                                            }).error(function () {
                                                setStatus("error", "Requisição à API falhou.");
                                                return false;
                                            });
                                            tries++;
                                        }

                                        if (insertSerialData[0].indexOf("error") > -1) {
                                            setStatus("error", "Erro na transação SQL.");
                                            return false;
                                        }

                                        // end POST on MDL_QUESTION_ATTEMPTS
                                        // POST on MDL_QUESTION_ATTEMPT_STEPS with MDL_QUESTION_ATTEMPTS query results

                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: {
                                                "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_steps order by id desc limit 1"
                                            }
                                        }).done(function (secondData2, textStatus, jqXHR) {
                                            secondData2[1][0] = parseInt(secondData2[1][0]) + 1;
                                            $.post({
                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                async: false,
                                                data: {
                                                    "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                                secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",2,'" + stateQuizzAttempt(parseFloat(data[i][data[0].indexOf("FRACTION")]), rightAnswerAndValue[1]) +
                                                                "'," + data[i][data[0].indexOf("FRACTION")] + "," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" + (secondData2[1][0] + 2).toString() + "," + secondData[1][0].toString() +
                                                                ",1,'complete',NULL," + getUnixTime().toString() + "," + cookiesDict["userID"] + ") returning id"
                                                }
                                            }).done(function (insertSerialData, textStatus, jqXHR) {
                                                var tries = 0;
                                                while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                    secondData2[1][0] += 1;
                                                    $.post({
                                                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                        async: false,
                                                        data: {
                                                            "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempt_steps(id, questionattemptid, sequencenumber, state, fraction, timecreated, userid) values (" +
                                                                secondData2[1][0].toString() + "," + secondData[1][0].toString() + ",0, 'todo', null," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" +
                                                                (secondData2[1][0] + 1).toString() + "," + secondData[1][0].toString() + ",2,'" + stateQuizzAttempt(parseFloat(data[i][data[0].indexOf("FRACTION")]), rightAnswerAndValue[1]) +
                                                                "'," + data[i][data[0].indexOf("FRACTION")] + "," + getUnixTime().toString() + "," + cookiesDict["userID"] + "),(" + (secondData2[1][0] + 2).toString() + "," + secondData[1][0].toString() +
                                                                ",1,'complete',NULL," + getUnixTime().toString() + "," + cookiesDict["userID"] + ") returning id"
                                                        }
                                                    }).done(function (hasErrors) {
                                                        insertSerialData = hasErrors;
                                                    })
                                                    .error(function () {
                                                        setStatus("error", "Requisição à API falhou.");
                                                        return false;
                                                    });
                                                    tries++;
                                                }
                                                if (insertSerialData[0].indexOf("error") > -1) {
                                                    setStatus("error", "Erro na transação SQL.");
                                                    return false;
                                                }
                                                var savedSerialData = []
                                                savedSerialData[1] = insertSerialData[2][0];
                                                lastProcessedAttemptDataID = savedSerialData[1];
                                                savedSerialData[2] = insertSerialData[3][0];
                                                savedSerialData[3] = insertSerialData[1][0];
                                                // POST on MDL_QUESTION_ATTEMPT_STEP_DATA with MDL_QUESTION_ATTEMPT_STEPS query results

                                                $.post({
                                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                    async: false,
                                                    data: {
                                                        "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempt_step_data order by id desc limit 1"
                                                    }
                                                }).done(function (secondData3) {
                                                    secondData3[1][0] = parseInt(secondData3[1][0]) + 1;
                                                    if (selectedElement.attr('type') == 'radio') {
                                                        $.post({
                                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                            async: false,
                                                            data: {
                                                                "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                            secondData3[1][0].toString() + "," + savedSerialData[3] + ",'_order','" + cumulativeAnswerID.substring(0, cumulativeAnswerID.lastIndexOf(",")) + "'),(" +
                                                                            (secondData3[1][0] + 1).toString() + "," + savedSerialData[1] + ",'-finish', '1'),(" + (secondData3[1][0] + 2).toString() + "," + savedSerialData[2] + ",'answer','" + answerValue + "')"
                                                            }
                                                        }).done(function (insertSerialData, textStatus, jqXHR) {
                                                            var tries = 0;
                                                            while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                                secondData3[1][0] += 1;
                                                                $.post({
                                                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                                    async: false,
                                                                    data: {
                                                                        "connectionIndex": connectionIndex, "query": "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES (" +
                                                                            secondData3[1][0].toString() + "," + savedSerialData[3] + ",'_order','" + cumulativeAnswerID.substring(0, cumulativeAnswerID.lastIndexOf(",")) + "'),(" +
                                                                            (secondData3[1][0] + 1).toString() + "," + savedSerialData[1] + ",'-finish', '1'),(" + (secondData3[1][0] + 2).toString() + "," + savedSerialData[2] + ",'answer','" + answerValue + "')"
                                                                    }
                                                                }).done(function (hasErrors) {
                                                                    insertSerialData = hasErrors;
                                                                });
                                                                tries++;
                                                            }
                                                            if (insertSerialData[0].indexOf("error") > -1) {
                                                                setStatus("error", "Erro na transação SQL.");
                                                                return false;
                                                            }
                                                            if (finalFractionGrade + parseFloat(data[i][data[0].indexOf("FRACTION")]) >= 0) {
                                                                finalFractionGrade += parseFloat(data[i][data[0].indexOf("FRACTION")]) * parseFloat(data[i][data[0].indexOf("MAXMARK")]);
                                                            }
                                                            if (matchSelected.eq(index + 1).length == 0) {
                                                                isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                                            }
                                                        });
                                                        styleQuestion(selectedElement, parseFloat(data[i][data[0].indexOf("FRACTION")]), rightAnswerAndValue[1], data[i][data[0].indexOf("FEEDBACK")]);
                                                    } else if (selectedElement.attr('type') == 'checkbox') {
                                                        var insertSerialData = "duplicate";
                                                        secondData3[1][0] -= 1;
                                                        var tries = 0;
                                                        while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                                                            secondData3[1][0] += 1;
                                                            var choiceI = 0;
                                                            var finalQuery = "INSERT INTO mdl_question_attempt_step_data(id, attemptstepid, name, value) VALUES ";
                                                            finalQuery += "(" + secondData3[1][0].toString() + "," + savedSerialData[3] + ",'_order','" + cumulativeAnswerID.substring(0, cumulativeAnswerID.lastIndexOf(",")) + "'),"
                                                            $("[slot='" + selectedElement.attr("slot") + "']").each(function () {
                                                                var element = $(this);
                                                                if (element.attr('checked') == 'checked') {
                                                                    finalQuery += "(" + (secondData3[1][0] + 1 + choiceI).toString() + "," + savedSerialData[1] + ",'choice" + choiceI.toString() + "',1),";
                                                                } else {
                                                                    finalQuery += "(" + (secondData3[1][0] + 1 + choiceI).toString() + "," + savedSerialData[1] + ",'choice" + choiceI.toString() + "',0),";
                                                                }
                                                                choiceI++;
                                                            }).promise().done(function () {
                                                                finalQuery += "(" + (secondData3[1][0] + 1 + choiceI).toString() + "," + savedSerialData[2] + ",'-finish',1)";
                                                            });
                                                            $.post({
                                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                                async: false,
                                                                data: {
                                                                    "connectionIndex": connectionIndex, "query": finalQuery
                                                                }
                                                            }).done(function (hasErrors) {
                                                                insertSerialData = hasErrors;
                                                            });
                                                            tries++;
                                                        }
                                                        processedMultiSlot = selectedElement.attr('slot');
                                                        lastProcessedSlotAttemptID = secondData[1][0].toString();
                                                        individualFraction = parseFloat(data[i][data[0].indexOf("FRACTION")]);
                                                        if (matchSelected.eq(index + 1).length == 0) {
                                                            finalFractionGrade += (individualFraction * parseFloat(data[i][data[0].indexOf("MAXMARK")]));
                                                            if (finalFractionGrade < 0) {
                                                                finalFractionGrade = 0;
                                                            }
                                                            if (individualFraction < 0) {
                                                                individualFraction = 0;
                                                            }
                                                            $.post({
                                                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                                                async: false,
                                                                data: { "connectionIndex": connectionIndex, "query": "UPDATE mdl_question_attempt_steps SET state='" + stateQuizzAttempt(individualFraction, sumFractions) + "', fraction=" + individualFraction.toString() + " where id=" + lastProcessedAttemptDataID }
                                                            }).done(function (updateData) {
                                                            });
                                                            styleQuestion(selectedElement, individualFraction, sumFractions, data[i][data[0].indexOf("FEEDBACK")]);
                                                            isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                                        }
                                                    } else {
                                                        setStatus("error", "Erro no tipo de seletor de resposta.");
                                                        return false;
                                                    }

                                                    // end POST on MDL_QUESTION_ATTEMPT_STEP_DATA with MDL_QUESTION_ATTEMPT_STEPS query results
                                                });
                                            });
                                        });

                                        // end POST on MDL_QUESTION_ATTEMPT_STEPS with MDL_QUESTION_ATTEMPTS query results
                                    });
                                });
                                break;
                            }
                        }
                    }).error(function () {
                        setStatus("error", "Requisição à API falhou no primeiro estágio.");
                        isDone = false;
                        return;
                    });
                });
            }
            $("input").prop("disabled", true);
            $("textarea").prop("disabled", true);
            break;
        default:
            break;
    }

    greaterInterval = setInterval(function () {
        if (isDone == false) {
            clearInterval(greaterInterval);
            setStatus("error", "Mecanismos de processamento da aplicação falharam.");
            return;
        }
        else if (isDone[0] && activityType == 'quizz') {
            clearInterval(greaterInterval);
            layoutSlots = isDone[1] + "0";
            try {
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: {
                        "connectionIndex": connectionIndex, "query": "insert into mdl_quiz_attempts(id, quiz, userid, attempt, uniqueid, layout, currentpage, preview, state, timestart, timefinish, timemodified, timecheckstate, sumgrades) values (" +
                            quizzAttemptResults[1][0].toString() + "," + activityID + "," + cookiesDict["userID"] + "," + quizzAttemptResults[1][1].toString() + "," + questionUsageID + ",'" + layoutSlots + "',0,1,'finished'," + getUnixTime().toString() + "," + getUnixTime().toString() + "," + getUnixTime().toString() + ",NULL," + finalFractionGrade + ")"
                    }
                }).done(function (insertSerialData, textStatus, jqXHR) {
                    var tries = 0;
                    while (insertSerialData[0].indexOf("duplicate") > -1 && tries != 3) {
                        quizzAttemptResults[1][0] += 1;
                        $.post({
                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                            async: false,
                            data: {
                                "connectionIndex": connectionIndex, "query": "insert into mdl_quiz_attempts(id, quiz, userid, attempt, uniqueid, layout, currentpage, preview, state, timestart, timefinish, timemodified, timecheckstate, sumgrades) values (" +
                                    quizzAttemptResults[1][0].toString() + "," + activityID + "," + cookiesDict["userID"] + "," + quizzAttemptResults[1][1].toString() + "," + questionUsageID + ",'" + layoutSlots + "',0,1,'finished'," + getUnixTime().toString() + "," + getUnixTime().toString() + "," + getUnixTime().toString() + ",NULL," + finalFractionGrade + ")"
                            }
                        }).done(function (hasErrors, textStatus, jqXHR) {
                            insertSerialData = hasErrors;
                        });
                        tries++;
                    }
                    if (insertSerialData[0].indexOf("error") > -1) {
                        setStatus("error", "Erro na transação SQL.");
                        return false;
                    }
                    setStatus("succeeded", "Consegui executar todas as tarefas e cadastrar a sua tentativa no Moodle. Veja os resultados abaixo!")
                }).error(function () {
                    setStatus("error", "Requisição à API falhou.");
                    return;
                });
            } catch (exception) {
                clearInterval(greaterInterval);
                setStatus("error", "Mecanismos de processamento da aplicação falharam.");
                return;
            }
        }
    }, 3000);
}

function styleQuestion(selectedElement, fraction, rightFraction, feedback) {
    try {
        var findDivContainer = selectedElement;
        while (findDivContainer.parent()[0] != null) {
            findDivContainer = findDivContainer.parent();
            if (findDivContainer.attr('class') != "questioncontainer") {
                continue;
            }
            if (fraction == 'not_answered') {
                findDivContainer.attr('class', 'divNotGraded');
                findDivContainer[0].innerHTML += "<p>Não avaliado.</p>";
            }
            else if (fraction == rightFraction) {
                findDivContainer.attr('class', 'divGradedRight');
                findDivContainer[0].innerHTML += "<p>Correto. " + feedback + "</p>";
            } else if (fraction > 0) {
                findDivContainer.attr('class', 'divGradedPartial');
                findDivContainer[0].innerHTML += "<p>Parcialmente correto. " + feedback + "</p>";
            } else {
                findDivContainer.attr('class', 'divGradedWrong');
                findDivContainer[0].innerHTML += "<p>Errado. " + feedback + "</p>";
            }
        }
    } catch (exception) {
        console.log("error");
    }
}

// FIM TENTATIVAS DE QUIZZ

// TAREFAS (ASSIGNMENT)

function loadAssignmentFromDatabase() {
    setStatus("progressing", "Recuperando as informações de tarefas do banco de dados... ");
    var finalHTMLBuilder = "";
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
        contentType: "application/json",
        method: "GET",
        async: true,
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                document.cookie = "databaseType=" + firstStep[0]["databaseType"];
                document.cookie = "databaseIndex=" + firstStep[1]["idconexao"];
            } catch (Exception) {
                setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                async: true,
                data: { "connectionIndex": cookiesDict["databaseIndex"], "query": "select * from mdl_assign where id=" + activityID }
            }).done(function (data, textStatus, jqXHR) {
                if (!canUserSubmitAssignment(data)) {
                    return;
                }
                try {
                    finalHTMLBuilder += "<p class='center paragraphAssignmentHeader'>" + data[1][data[0].indexOf("NAME")] + "</p>";
                    finalHTMLBuilder += data[1][data[0].indexOf("INTRO")];
                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        async: true,
                        data: { "connectionIndex": cookiesDict["databaseIndex"], "query": "select * from mdl_assign_plugin_config where assignment=" + activityID + " order by id" }
                    }, function (data2, textStatus2, jqXHR2) {
                        var i = 1;
                        var textAreaHTML = "";
                        var textAreaHTML_enabled = false;
                        var inputFileHTML = "";
                        var inputFileHTML_enabled = false;
                        for (i; i < data2.length; i++) {
                            if (data2[i][data2[0].indexOf("SUBTYPE")] == "assignsubmission" && data2[i][data2[0].indexOf("SUBTYPE")] != "comments") {
                                switch (data2[i][data2[0].indexOf("NAME")]) {
                                    case 'enabled':
                                        if (data2[i][data2[0].indexOf("VALUE")] == 1) {
                                            if (data2[i][data2[0].indexOf("PLUGIN")] == "file") {
                                                inputFileHTML += "<p><input type='file' name='file'";
                                                inputFileHTML_enabled = true;
                                            } else if (data2[i][data2[0].indexOf("PLUGIN")] == "onlinetext") {
                                                textAreaHTML += "<p><textarea id='onlinetextarea'";
                                                textAreaHTML_enabled = true;
                                            } else {
                                                setStatus("error", "Configuração de tarefa não suportada pela aplicação.");
                                                endOperation();
                                                break;
                                            }
                                        }
                                        break;
                                    case 'maxsubmissionsizebytes':
                                        inputFileHTML += " maxbytes='" + data2[i][data2[0].indexOf("VALUE")] + "'";
                                        break;
                                    case "maxfilesubmissions":
                                        inputFileHTML += " maxfiles='" + data2[i][data2[0].indexOf("VALUE")] + "'";
                                        break;
                                    case "wordlimit":
                                        textAreaHTML += " maxlength='" + data2[i][data2[0].indexOf("VALUE")] + "'";
                                        break;
                                    default:
                                        setStatus("error", "Configuração de tarefa não suportada pela aplicação.");
                                        endOperation();
                                        break;
                                }
                            }
                        }
                        if (textAreaHTML_enabled) {
                            finalHTMLBuilder += textAreaHTML + "></textarea><span id='spanupdate'></p></p>";
                        }
                        if (inputFileHTML_enabled) {
                            finalHTMLBuilder += inputFileHTML + "/></p>";
                        }
                        finalHTMLBuilder += "<p><input id='submit' type='button' class='btn btn-shadowed' value='Enviar resposta' /></p>";
                        $('#content').html(finalHTMLBuilder);
                        setStatus("succeeded", "A tarefa foi carregada com sucesso.");
                        loadAssignmentListeners();
                        restartOperation("salvar_progresso");
                    });
                } catch (exception) {
                    setStatus("error", "Erro de processamento nas informações de tarefa.");
                    console.log(exception);
                    endOperation();
                    return;
                }
            });
        }
    }).error(function () {
        // Requisição à API falhou
        // Tentará carregar o arquivo do dispositivo
        offline = true;
        setStatus("neutral", "A requisição de acesso à API do Moodle falhou no primeiro estágio. Você está conectado à internet? Se não, aguarde enquanto procuro o arquivo da atividade... ");
        currentOperation = 'ler_arquivo';
    });
}

function canUserSubmitAssignment(data) {
    if (data[1][data[0].indexOf("ALLOWSUBMISSIONSFROMDATE")] != "0") {
        if (getUnixTime() > parseInt(data[1][data[0].indexOf("ALLOWSUBMISSIONSFROMDATE")])) {
            setStatus("neutral", "Essa tarefa ainda não está aceitando submissões. Tente responder novamente mais tarde!");
            return false;
        }
    }
    if (data[1][data[0].indexOf("NOSUBMISSIONS")] != "0") {
        setStatus("neutral", "Essa tarefa não está aceitando submissões.");
        return false;
    }
    if (getUnixTime() > parseFloat(data[1][data[0].indexOf("CUTOFF")]) && data[1][data[0].indexOf("DUEDATE")] != "0") {
        setStatus("neutral", "Essa tarefa não está aceitando mais submissões.");
        return false;
    }
    if (data[1][data[0].indexOf("MAXATTEMPTS")] != "-1") {
        if (checkUserAttempts(cookiesDict["userID"]) > parseInt(data[1][data[0].indexOf("MAXATTEMPTS")])) {
            setStatus("neutral", "Você já fez todas as tentativas possíveis para essa tarefa.");
            return false;
        }
    }
    return true;
}

function checkUserAttempts(userID) {
    return 0;
}
// FIM TAREFAS (ASSIGNMENT)

// LISTENERS DE ELEMENTOS DE QUIZZ

function loadQuizzListeners() {
    $('input[type="radio"]').each(function () {
        var rdbutton = $(this);
        rdbutton.click(function () {
            $('input[name="' + event.target.name + '"]').each(function () {
                $(this).removeAttr("checked");
            });
            $(event.target).prop("checked", true);
            event.target.checked = true;
            event.target.setAttribute("checked", true);
        });
    });

    $('input[type="checkbox"]').each(function () {
        var chkbox = $(this);
        chkbox.click(function () {
            if ($(event.target).prop("checked")) {
                event.target.checked = true;
                event.target.setAttribute("checked", true);
            } else {
                event.target.removeAttribute('checked');
            };
        })
    });
    $('input[type="number"]').each(function () {
        var numberfield = $(this);
        numberfield.keydown(function (event) {
            if (isNaN(parseFloat(event.target.value + String.fromCharCode(event.which))) && event.keyCode != 8) {
                event.preventDefault();
                Materialize.toast("Entrada somente numérica!", 400);
            }
        })
    });
    $('select').each(function () {
        var select = $(this);
        select.change(function (event) {
            for (var i = 0; i < event.target.children.length; i++) {
                if (event.target.children[i].index == event.target.selectedIndex) {
                    event.target.children[i].setAttribute('selected', true);
                } else {
                    event.target.children[i].removeAttribute('selected');
                }
            }
        })
    });
    loadFinishAttemptListener();
}

function loadSubmitAttemptListeners() {
    $('.buttonConfirmAttempt').click(function () {
        setStatus("progressing", "Estou enviando a sua tentativa, aguarde um pouco...");
        if (canUserAttempQuizz() == false) {
            return;
        }
        $("#divButtonsHolder").remove();
        $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
            contentType: "application/json",
            method: "GET",
            async: true,
            success: function (firstStep) {
                try {
                    firstStep = JSON.parse(firstStep);
                    document.cookie = "databaseType=" + firstStep[0]["databaseType"];
                    document.cookie = "databaseIndex=" + firstStep[1]["idconexao"];
                } catch (Exception) {
                    setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                    return;
                }
                switch (activityType) {
                    case 'quizz':
                        $.post({
                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                            async: true,
                            data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": firstStep[12]["comando"] + " where fullmodule.instance=" + activityID + " order by mc.id limit 1" }
                        }).done(function (data, textStatus, jqXHR) {
                            try {
                                var contextID = data[1][data[0].indexOf("ID")];
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: true,
                                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select id from mdl_question_usages order by id desc limit 1" }
                                }).done(function (firstdata, textStatus, jqXHR) {
                                    try {
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: true,
                                            data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": firstStep[13]["comando"] + " values (" + (parseInt(firstdata[1][0]) + 1) + "," + contextID + ",'mod quiz','deferredfeedback') returning id" }
                                        }).done(function (data, textStatus, jqXHR) {
                                            // a partir do ID recém-inserido na tabela mdl_question_usages retornado será possível construir tentativas de respostas
                                            processActivityAttempt(data[1][0], (firstStep[1]["idconexao"] - 1), firstStep);
                                        }).error(function () {
                                            setStatus("error", "Erro na requisição de submissão de sua tentativa. Por favor, tente novamente!");
                                        });
                                    } catch (exception) {
                                        setStatus("error", "Erro na requisição de submissão de sua tentativa. Por favor, tente novamente!");
                                    }
                                }).error(function () {
                                    setStatus("error", "Requisição à API falhou. Por favor, tente mais tarde.");
                                    return;
                                });
                            } catch (exception) {
                                setStatus("error", "Erro interno da aplicação. Por favor, contate o desenvolvedor.");
                                return;
                            }
                        }).error(function () {
                            setStatus("error", "Requisição à API falhou. Por favor, tente mais tarde.");
                            return;
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    });

    $('.buttonCancelAttempt').click(function () {
        $("#divButtonsHolder").replaceWith("<p class='paragraphFinishAttempt'>FINALIZAR A SUA TENTATIVA</p>");
        loadFinishAttemptListener();
        setStatus("neutral", "Você cancelou o envio.");
    });
}

function loadFinishAttemptListener() {
    $('.paragraphFinishAttempt').click(function () {
        if (offline) {
            setStatus("neutral", "Você não pode submeter tentativas no modo off-line.");
            return;
        }
        setStatus("progressing", "Confira todas as suas questões antes de enviar!");
        $('.paragraphFinishAttempt').replaceWith("<div id='divButtonsHolder' style='text-align: center'><input type='button' class='buttonConfirmAttempt btn' value='CONFIRMAR ENVIO' /><input type='button' class='buttonCancelAttempt btn' value='CANCELAR ENVIO' /></div>");
        loadSubmitAttemptListeners();
    });
}
// FIM LISTENERS DE ELEMENTOS DE QUIZZ

// LISTENERS DE ELEMENTOS DE ASSIGNMENT

function loadAssignmentListeners() {
    if ($('#onlinetextarea').length != 0 && $('#onlinetextarea')[0].maxLength != undefined) {
        $('#onlinetextarea').on('input', function (e) {
            $('#spanupdate').html((parseInt(e.target.maxLength) - e.target.value.length).toString());
        });
    }
    $('#submit').click(function (event) {
    });
}

// FIM LISTENERS DE ELEMENTOS DE ASSIGNMENT

function loadGeneralListeners() {
    $("input[type='file']").each(function () {
        var inputFile = $(this);
        inputFile.change(function (ev) {
            if (inputFile.attr('maxfiles') == "-1" || (inputFile.attr('maxfiles') != "-1" && inputFile[0].files.length <= parseInt(inputFile.attr('maxfiles')))) {
                $('#d-' + inputFile.prop('id'))[0].innerHTML += "<label class='displayBlock'>" + event.currentTarget.files[0].name + "</label>";
            } else {
                ev.preventDefault();
                if (inputFile[0].files.length == 1) {
                    inputFile.val("");
                }
                Materialize.toast('Você estourou o número máximo de arquivos permitidos.', 4000);
            }
        });
    });
}