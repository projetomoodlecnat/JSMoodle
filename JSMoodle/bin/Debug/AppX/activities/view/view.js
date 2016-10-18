// variáveis de ambiente globais
var cookiesDict = cookiesToDict();

// variáveis que armazenam os locais de pasta e arquivo
var quizzesFolder;
var assignmentsFolder;
var activityFile;

// variáveis de atributo da atividade
var activityType;
var activityID;
var offline = false;

// variáveis que controlam a sequência de operações
var currentOperation;
var operating;

$(document).ready(function () {
    $('.paragraphGoBack').click(function () {
        $('.paragraphGoBack').html("<img src='../../images/universal/loading.gif' alt='animacao_carregando'>");
        history.back();
    });
    $('.paragraphSave').click(function () {
        currentOperation = "salvar_progresso";
        operating = setInterval(checkCurrentOperation, 1000);
    });
    $('.paragraphClear').click(function () {
        currentOperation = "excluir_progresso";
        operating = setInterval(checkCurrentOperation, 1000);
    });
    activityType = window.location.toString().substring((window.location.toString().indexOf('?') + 1), window.location.toString().indexOf('='));
    operating = setInterval(checkCurrentOperation, 1000);
    currentOperation = "working_inicializar_pasta";
    initializeFolders();
});

function setStatus(type, message) {
    if (type == "progressing") {
        document.getElementById("status").setAttribute("class", "center light-green-text");
        document.getElementById("status").innerHTML = message;
    } else if (type == "error") {
        document.getElementById("status").setAttribute("class", "center red-text");
        document.getElementById("status").innerHTML = message;
    } else if (type == "neutral") {
        document.getElementById("status").setAttribute("class", "center");
        document.getElementById("status").innerHTML = message;
    } else {
        document.getElementById("status").setAttribute("class", "center blue-text");
        document.getElementById("status").innerHTML = message;
    }
}

function initializeFolders() {
    setStatus("progressing", "Tentando carregar as pastas com as suas atividades...");
    var quizzFolder = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("quizzes");
    quizzFolder.done(function () {
        quizzesFolder = quizzFolder.operation.getResults();
        currentOperation = 'obter_arquivo';
        setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo...");
    }, function () {
        try {
            quizzFolder = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("quizzes");
            quizzFolder.done(function () {
                quizzesFolder = quizzFolder.operation.getResults();
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
}

function initializeActivityFile(pasta, id) {
    setStatus("progressing", "Carregando o arquivo da sua atividade...");
    try {
        var createFile = pasta.createFileAsync(id);
        createFile.done(function () {
            activityFile = createFile.operation.getResults();
            currentOperation = 'carregar_questoes_banco';
        }, function () {
            var getFile = quizzesFolder.getFileAsync(id);
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
                    currentOperation = 'carregar_questoes_banco';
                    return;
                }
            } else {
                setStatus("success", "Arquivo carregado com sucesso. ");
                $('#content').html(readFromFile.operation.getResults());
                loadOrReloadListeners();
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
                try {
                    console.log(data[1]);
                } catch (exception) {
                    stringHTMLBuilder = "O quizz não tem questões registradas.";
                    endOperation();
                    return;
                }
                for (var i = 1; i < data.length; i++) {
                    var optionType = "";
                    switch (data[i][data[0].indexOf("QTYPE")]) {
                        case 'multichoice':
                            $.post({
                                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                async: false,
                                data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": "select single from mdl_qtype_multichoice_options where questionid=" + data[i][data[0].indexOf("QUESTIONID")] }
                            }).done(function (data, textStatus, jqXHR) {
                                if (data[1][0] == "0") {
                                    optionType = "checkbox";
                                } else {
                                    optionType = "radio";
                                }
                            }).error(function () {
                                setStatus("error", "Erro na requisição que define o tipo das questões.");
                                $('#content').html("");
                                endOperation();
                            });
                            break;
                        case 'truefalse':
                            optionType = "radio";
                            break;
                        case 'description':
                            break;
                        default:
                            $('#content').html("Essa tarefa contém tipos de questões não suportadas pela aplicação e não poderá ser mostrada.");
                            endOperation();
                            return;
                    }
                    if (questionNames.indexOf(data[i][data[0].indexOf("QUESTIONID")]) == -1) {
                        questionNames.push(data[i][data[0].indexOf("QUESTIONID")]);
                        if (data[i][data[0].indexOf("QTYPE")] == 'description') {
                            stringHTMLBuilder += "<div class='paragraphDescription'><ul>" + data[i][data[0].indexOf("QUESTIONTEXT")];
                            continue;
                        }
                        stringHTMLBuilder += "</ul></div><div class='questioncontainer'><b>Questão: </b>" + data[i][data[0].indexOf("QUESTIONTEXT")] + "<ul>";
                    }
                    stringHTMLBuilder += "<li><input class='with-gap' slot='" + data[i][data[0].indexOf("SLOTID")] + "' name='" + data[i][data[0].indexOf("QUESTIONID")] + "' type='" + optionType + "' style='margin-right: 5px; float:left; position:static; opacity: 1'>" + data[i][data[0].indexOf("ANSWER")] + "</li>";
                }
                $("#content").html(stringHTMLBuilder + "<br><p class='paragraphFinishAttempt'>FINALIZAR A SUA TENTATIVA</p>");
                setStatus("succeeded", "As questões foram carregadas com sucesso e renderizadas na interface. ");
                loadOrReloadListeners();
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
    setStatus("progressing", "Salvando o seu processo num arquivo, aguarde... ");
    $('.paragraphSave').html("<img src='../../images/universal/loading.gif' alt='animacao_carregando'>");
    var savingOperation = Windows.Storage.FileIO.writeTextAsync(activityFile, $('#content').html());
    savingOperation.done(function () {
        setStatus("success", "Seu progresso foi salvo em um arquivo e será carregado na próxima vez que você entrar na tarefa.");
        $('.paragraphSave').html('SALVAR O SEU PROGRESSO');
        endOperation();
        return;
    }, function () {
        setStatus("error", "Não foi possível salvar o seu progresso.");
        $('.paragraphSave').html('SALVAR O SEU PROGRESSO');
        endOperation();
        return;
    });
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
                    initializeActivityFile(quizzesFolder, activityID);
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
            currentOperation = 'carregar_questoes_banco';
            loadQuestionsFromDatabase();
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
}

// TENTATIVAS

function splitHTMLText(questionText) {
    if (questionText.indexOf("<p") == -1) {
        return questionText;
    }
    var splittedText = questionText.substring(questionText.indexOf(">") + 1);
    splittedText = splittedText.substring(splittedText.indexOf(">") + 1);
    splittedText = splittedText.substring(0, splittedText.indexOf("<"));
    return splittedText;
}

function countAnsweredQuestions() {
    return $(".questioncontainer input[checked='true']").length;
}

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

function processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots) {
    setStatus("progressing", "Processando as tentativas sem resposta...");
    var cumulativeAnswerID;

    try {
        $(".questioncontainer").each(function () {
            var selectedContainer = $(this);
            if (selectedContainer.children("input[checked='true']").length == 0) {
                    var selectedElement = $(selectedContainer.find("input")[0]);
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
                            // contornando os True/Falses do Moodle

                            if (selectedElement[0].nextSibling.toString() == "[object Text]") {
                                selectedElement[0].nextSibling.outerHTML = selectedElement[0].nextSibling.wholeText;
                            }

                            // end contornando os True/Falses do Moodle
                        } catch (exception) {
                            setStatus("error", "Os resultados da requisição falharam no primeiro estágio.");
                            return false;
                        }

                        for (var i = 1; i < data.length; i++) {
                            if (data[i][data[0].indexOf("ANSWER")].indexOf(splitHTMLText(selectedElement[0].nextSibling.outerHTML)) > -1) {
                                answerValue = i - 1;
                                data[i][data[0].indexOf("FRACTION")] = data[i][data[0].indexOf("FRACTION")].replace(",", ".");
                                data[i][data[0].indexOf("MAXMARK")] = data[i][data[0].indexOf("MAXMARK")].replace(",", ".");
                                layoutSlots += data[i][data[0].indexOf("SLOT")] + ",";
                                var userAnswer = "";
                                // contornando os True/Falses do Moodle

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

                                // end contornando os True/Falses do Moodle
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

                                        while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                            while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                            }
                                                        });
                                                        styleQuestion(selectedElement, 'not_answered');
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
            }
        });
    } catch (exception) {
        return false;
    }
    return [true, layoutSlots];
}

function processActivityAttempt(questionUsageID, connectionIndex, command) {
    setStatus("progressing", "Processando a sua tentativa...");

    var isDone;
    var processedAnswersLength = 0;
    var answersToProcess = countAnsweredQuestions();

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

    command = command.replace(/[\r\n]/g, "");

    switch (activityType) {
        case 'quizz':
            // Verificando se o usuário pode submeter o quizz

            quizzAttemptResults = canUserAttempQuizz();
            if (quizzAttemptResults == false) {
                return quizzAttemptResults;
            }

            // end Verificando se o usuário pode submeter o quizz
            // inserindo na tabela mdl_question_attempts e mdl_question_attempts_step

            var matchSelected = $(".questioncontainer input[checked='true']");
            if (matchSelected.length == 0) {
                isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
            } else {
                setStatus("progressing", "Processando as tentativas com resposta...");
            }
            matchSelected.each(function (index) {
                var selectedElement = $(this);
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
                        // contornando os True/Falses do Moodle

                        if (selectedElement[0].nextSibling.toString() == "[object Text]") {
                            selectedElement[0].nextSibling.outerHTML = selectedElement[0].nextSibling.wholeText;
                        }

                        // end contornando os True/Falses do Moodle
                    } catch (exception) {
                        setStatus("error", "Os resultados da requisição falharam no primeiro estágio.");
                        return false;
                    }

                    for (var i = 1; i < data.length; i++) {
                        if (data[i][data[0].indexOf("ANSWER")].indexOf(splitHTMLText(selectedElement[0].nextSibling.outerHTML)) > -1) {
                            // A questão faz parte de um quizz de multi-escolhas e os registros já foram inseridos

                            answerValue = i - 1;
                            data[i][data[0].indexOf("FRACTION")] = data[i][data[0].indexOf("FRACTION")].replace(",", ".");
                            data[i][data[0].indexOf("MAXMARK")] = data[i][data[0].indexOf("MAXMARK")].replace(",", ".");
                            if (processedMultiSlot == selectedElement.attr('slot')) {
                                $.post({
                                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                    async: false,
                                    data: { "connectionIndex": connectionIndex, "query": "UPDATE mdl_question_attempts SET responsesummary = responsesummary || '; " + splitHTMLText(selectedElement[0].nextSibling.outerHTML) + "' where id =" + lastProcessedSlotAttemptID }
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
                                processedAnswersLength++;
                            }

                            // end A questão faz parte de um quizz de multi-escolhas e os registros já foram inseridos
                            layoutSlots += data[i][data[0].indexOf("SLOT")] + ",";
                            var userAnswer = splitHTMLText(selectedElement[0].nextSibling.outerHTML);
                            // contornando os True/Falses do Moodle

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

                            // end contornando os True/Falses do Moodle
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

                                    while (insertSerialData[0].indexOf("duplicate") > -1) {
                                        secondData[1][0] += 1;
                                        $.post({
                                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                                            async: false,
                                            data: {
                                                "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                                    + secondData[1][0].toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                                    ",0," + rightAnswerAndValue[1].toString() + ",0,'" + splitHTMLText(data[i][data[0].indexOf("QUESTIONTEXT")]) + "','" + rightAnswerAndValue[0] + "','" + userAnswer + "'," + getUnixTime().toString() + ")"
                                            }
                                        }).done(function (hasErrors) {
                                            insertSerialData = hasErrors;
                                        }).error(function () {
                                            setStatus("error", "Requisição à API falhou.");
                                            return;
                                        });
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
                                            while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                    return;
                                                });
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
                                                        while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                        }
                                                        if (finalFractionGrade + parseFloat(data[i][data[0].indexOf("FRACTION")]) >= 0) {
                                                            finalFractionGrade += parseFloat(data[i][data[0].indexOf("FRACTION")]) * parseFloat(data[i][data[0].indexOf("MAXMARK")]);
                                                        }
                                                        processedAnswersLength++;
                                                        if (processedAnswersLength == answersToProcess) {
                                                            isDone = processUnansweredQuestions(questionUsageID, connectionIndex, command, layoutSlots);
                                                        }
                                                    });
                                                    styleQuestion(selectedElement, parseFloat(data[i][data[0].indexOf("FRACTION")]), rightAnswerAndValue[1], data[i][data[0].indexOf("FEEDBACK")]);
                                                } else if (selectedElement.attr('type') == 'checkbox') {
                                                    var insertSerialData = "duplicate";
                                                    secondData3[1][0] -= 1;
                                                    while (insertSerialData[0].indexOf("duplicate") > -1) {
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
                                                    console.log("erro");
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
                    return;
                });
            });
            // iterou por todos os inputs de containers de questão e finalizou o processamento
            $("input").prop("disabled", true);
            break;
        default:
            break;
    }

    var greaterInterval = setInterval(function () {
        if (isDone == false) {
            clearInterval(greaterInterval);
            setStatus("error", "Mecanismos de processamento da aplicação falharam.");
            return;
        }
        else if (isDone[0] && activityType == 'quizz') {
            clearInterval(greaterInterval);
            layoutSlots += isDone[1] + "0";
            try {
                $.post({
                    url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                    async: false,
                    data: {
                        "connectionIndex": connectionIndex, "query": "insert into mdl_quiz_attempts(id, quiz, userid, attempt, uniqueid, layout, currentpage, preview, state, timestart, timefinish, timemodified, timecheckstate, sumgrades) values (" +
                            quizzAttemptResults[1][0].toString() + "," + activityID + "," + cookiesDict["userID"] + "," + quizzAttemptResults[1][1].toString() + "," + questionUsageID + ",'" + layoutSlots + "',0,1,'finished'," + getUnixTime().toString() + "," + getUnixTime().toString() + "," + getUnixTime().toString() + ",NULL," + finalFractionGrade + ")"
                    }
                }).done(function (insertSerialData, textStatus, jqXHR) {
                    while (insertSerialData[0].indexOf("duplicate") > -1) {
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
        // erro na marcação
        console.log("error");
    }
}

// FIM TENTATIVAS

// LISTENERS DE ELEMENTOS

function loadOrReloadListeners() {
    $('input[type="radio"]').each(function () {
        rdbutton = $(this);
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
        chkbox = $(this);
        chkbox.click(function () {
            if ($(event.target).prop("checked")) {
                event.target.checked = true;
                event.target.setAttribute("checked", true);
            } else {
                event.target.removeAttribute('checked');
            };
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
                                            processActivityAttempt(data[1][0], (firstStep[1]["idconexao"] - 1), firstStep[14]["comando"]);
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
// FIM LISTENERS