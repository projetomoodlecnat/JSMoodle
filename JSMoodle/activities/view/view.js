// variáveis de ambiente globais
var cookiesDict = cookiesToDict();

// variáveis que armazenam os locais de pasta e arquivo
var quizzesFolder;
var assignmentsFolder;
var enquetesFolder;
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
    inicializarPastas();
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

function inicializarPastas() {
    setStatus("progressing", "Tentando carregar as pastas com as suas atividades... ");
    var quizzFolder = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("quizzes");
    quizzFolder.done(function () {
        quizzesFolder = quizzFolder.operation.getResults();
        currentOperation = 'obter_arquivo';
        setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo... ");
    }, function () {
        try {
            quizzFolder = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("quizzes");
            quizzFolder.done(function () {
                quizzesFolder = quizzFolder.operation.getResults();
                currentOperation = 'obter_arquivo';
                setStatus("progressing", "Pastas carregadas. Tentando obter o arquivo... ");
            }, function () {
                endOperation();
                return setStatus("error", "Não foi possível criar ou carregar a pasta de quizzes. Algum erro ocorreu! ");
            });
        } catch (exception) {
            endOperation();
            return;
        }
    });
}

function inicializarArquivoAtividade(pasta, id) {
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

function carregarArquivoNaInterface(file) {
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

function carregarQuestoesBanco() {
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
                data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query":  firstStep[10]["comando"] + " WHERE quizid=" + activityID + " ORDER BY slot"}
            }).done(function (data, textStatus, jqXHR) {
                var questionNames = []
                try {
                    console.log(data[1]);
                } catch (exception) {
                    stringHTMLBuilder = "O quizz não tem questões registradas.";
                    endOperation();
                    return;
                }
                for (i = 1; i < data.length; i++) {
                    if (questionNames.indexOf(data[i][data[0].indexOf("QUESTIONID")]) == -1) {
                        questionNames.push(data[i][data[0].indexOf("QUESTIONID")]);
                        if (data[i][data[0].indexOf("QTYPE")] == 'description') {
                            stringHTMLBuilder += "<div class='paragraphDescription'><ul>" + data[i][data[0].indexOf("QUESTIONTEXT")];
                            continue;
                        }
                        stringHTMLBuilder += "</ul></div><div class='questioncontainer'><b>Questão: </b>" + data[i][data[0].indexOf("QUESTIONTEXT")] + "<ul>";
                    }
                    stringHTMLBuilder += "<li><input class='with-gap' slot='" + data[i][data[0].indexOf("SLOTID")] + "' name='" + data[i][data[0].indexOf("QUESTIONID")] + "' type='radio' style='margin-right: 5px; float:left; position:static; opacity: 1'>" + data[i][data[0].indexOf("ANSWER")] + "</li>";
                }
                $("#content").html(stringHTMLBuilder+"<br><p class='paragraphFinishAttempt'>FINALIZAR A SUA TENTATIVA</p>");
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

function salvarProgresso(activityFile) {
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

function excluirProgresso(activityFile) {
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
                    inicializarArquivoAtividade(quizzesFolder, activityID);
                    break;
                default:
                    endOperation();
                    console.log('tipo inválido');
                    break;
            }
            break;
        case 'ler_arquivo':
            currentOperation = 'working_ler_arquivo';
            carregarArquivoNaInterface(activityFile);
            break;
        case 'carregar_questoes_banco':
            currentOperation = 'carregar_questoes_banco';
            carregarQuestoesBanco();
            break;
        case 'salvar_progresso':
            currentOperation = 'working_salvar_progresso';
            salvarProgresso(activityFile);
            break;
        case 'excluir_progresso':
            currentOperation = 'working_excluir_progresso';
            excluirProgresso(activityFile);
            break;
        default:
            break;
    }
}

function endOperation() {
    clearInterval(operating);
}

// a ser implementado
function checarQuestoesSemResposta() {
    $(".questioncontainer input[checked='true']").each(function () {

    });
    return false;
}

function processarTentativa(questionUsageID, connectionIndex, command) {
    // inserindo na tabela mdl_question_attempts
    $(".questioncontainer input[checked='true']").each(function () {
        selectedElement = $(this);
        var finalFractionGrade = 0.0
        var rightAnswerAndValue = ["", -9999.0];
        command = command.replace(/[\r\n]/g, "");
        $.post({
            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
            async: true,
            data: { "connectionIndex": connectionIndex, "query": command + " where mdl_quiz_slots.id=" + selectedElement.attr("slot") }
        }).done(function (data, textStatus, jqXHR) {
            for (i = 1; i < data.length; i++) {
                if (parseFloat(data[i][data[0].indexOf("FRACTION")]) >= rightAnswerAndValue[1]) {
                    if (parseFloat(data[i][data[0].indexOf("FRACTION")]) == rightAnswerAndValue[1]) {
                        rightAnswerAndValue[0] += data[i][data[0].indexOf("ANSWER")];
                    } else {
                        rightAnswerAndValue[0] = data[i][data[0].indexOf("ANSWER")];
                        rightAnswerAndValue[1] = parseFloat(data[i][data[0].indexOf("FRACTION")]);
                    }
                }
            }

            for (i = 1; i < data.length; i++) {
                if (selectedElement[0].nextSibling.wholeText.indexOf(data[i][data[0].indexOf("ANSWER")]) > -1) {
                    finalFractionGrade += parseFloat(data[i][data[0].indexOf("FRACTION")]);
                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        async: true,
                        data: { "connectionIndex": connectionIndex, "query": "select id from mdl_question_attempts order by id desc limit 1" }
                    }).done(function (secondData, textStatus, jqXHR) {
                        // data[i][data[0].indexOf("QUESTIONTEXT")].split("<p>");
                        $.post({
                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                            async: false,
                            data: {
                                "connectionIndex": connectionIndex, "query": "insert into mdl_question_attempts (id, questionusageid, slot, behaviour, questionid, variant, maxmark, minfraction, maxfraction, flagged, questionsummary, rightanswer, responsesummary, timemodified) values ("
                                    + (parseInt(secondData[1][0]) + 1).toString() + "," + questionUsageID.toString() + "," + data[i][data[0].indexOf("SLOT")] + ",'" + data[i][data[0].indexOf("PREFERREDBEHAVIOUR")] + "'," + data[i][data[0].indexOf("QUESTIONID")] + ",1," + data[i][data[0].indexOf("MAXMARK")] +
                                    ",0," + data[i][data[0].indexOf("FRACTION")] + ",0,'" + data[i][data[0].indexOf("QUESTIONTEXT")] + "','" + rightAnswerAndValue[0] + "',null," + getUnixTime().toString() + ")"
                            }
                        }).done(function (data, textStatus, jqXHR) {

                        });
                    });
                    break;
                }
            }
        }).error(function () {

        });
    });
    /*
    template
    $.post({
        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
        async: true,
        data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": firstStep[13]["comando"] + " values (" + (parseInt(firstdata[1][0]) + 1) + "," + contextID + ",'mod quiz','deferredfeedback') returning id" }
    }).done(function (data, textStatus, jqXHR) {

    }).error(function () {
    });
    */
}

function loadOrReloadListeners() {
    $('input[type="radio"]').each(function () {
        rdbutton = $(this);
        rdbutton.click(function () {
            $('input[name="' + event.target.name + '"]').each(function () {
                $(this).prop("checked", false);
            });
            $(event.target).prop("checked", true);
            event.target.checked = true;
            event.target.setAttribute("checked", true);
        });
    });
    $('.paragraphFinishAttempt').click(function () {
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
                switch (activityType) {
                    case 'quizz':
                        if (checarQuestoesSemResposta()) return;
                        $.post({
                            url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                            async: true,
                            data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "query": firstStep[11]["comando"] + " where fullmodule.instance =" + activityID }
                        }).done(function (data, textStatus, jqXHR) {
                            if (data.length == 1) {
                                // o registro em question usages não existe. iniciam-se as operações para inserir novos valores na tabela.
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
                                                    processarTentativa(data[1][0], (firstStep[1]["idconexao"] - 1), firstStep[14]["comando"]);
                                                }).error(function () {
                                                });
                                            } catch (exception) {
                                                setStatus("error", "Erro na submissão de sua tentativa. Por favor, tente novamente!");
                                            }
                                        }).error(function () { });
                                    } catch (exception) { }
                                }).error(function () { });
                            } else {
                                // o registro em question_usages existe. não será necessário criar um novo manualmente.
                                // deve ser o caso na maioria das vezes!
                                processarTentativa(data[1][data[0].indexOf("ID")], (firstStep[1]["idconexao"] - 1), firstStep[14]["comando"]);
                            }
                        }).error(function () {
                        });
                        break;
                    default:
                        break;
                }
            }
        }).error(function () {
            // Requisição à API falhou
        });
    });
}