// variáveis de ambiente globais
var cookiesDict = cookiesToDict();
var quizzesFolder;
var assignmentsFolder;
var enquetesFolder;
var activityType;
var activityFile;
var activityID;

// variáveis que controlam a sequência de operações
var currentOperation;
var operating;

$(document).ready(function () {
    $('.paragraphReload').click(function () {
        window.location = window.location.toString();
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
            return endOperation();}
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
            setStatus("success", "Arquivo carregado com sucesso. ");
            $('#content').html("Conteúdo do arquivo:" + readFromFile.operation.getResults());
            endOperation();
        }, function () {
            setStatus("error", "Não foi possível ler do arquivo da atividade. Verifique se você tem permissões de leitura no arquivo.");
            endOperation();
        });
    } catch (exception) {
        setStatus("error", "Não foi possível ler do arquivo da atividade. Verifique se você tem permissões de leitura no arquivo.");
        endOperation();
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
                    questionNames.push(data[1][data[0].indexOf("QUESTIONID")]);
                    stringHTMLBuilder = "<div class='questioncontainer'>" + data[1][data[0].indexOf("QUESTIONTEXT")] + "<ul>";
                } catch (exception) {
                    stringHTMLBuilder = "O quizz não tem questões registradas.";
                    endOperation();
                    return;
                }
                for (i = 1; i < data.length; i++) {
                    if (questionNames.indexOf(data[i][data[0].indexOf("QUESTIONID")]) == -1) {
                        stringHTMLBuilder += "</ul></div><div class='questioncontainer'>" + data[i][data[0].indexOf("QUESTIONTEXT")] + "<ul>";
                        questionNames.push(data[i][data[0].indexOf("QUESTIONID")]);
                    }
                    stringHTMLBuilder += "<li><input class='with-gap' name='" + data[data[i][0].indexOf("QUESTIONID")]+ "' type='radio' style='margin-right: 5px; float:left; position:static; opacity: 1'>" +data[i][data[0].indexOf("ANSWER")]+ "</li>";
                }
                $("#content").html(stringHTMLBuilder);
                console.log(data);
                endOperation();
            }).error(function () {
                setStatus("error", "A requisição à API do Moodle falhou na obtenção das questões. ");
                endOperation();
            });
        }
    }).error(function () {
        if (cookiesDict["databaseType"] == null) {
            setStatus("neutral", "Não foi possível determinar o tipo do banco para fazer a requisição. Verifique a conexão com a internet.");
        } else {
            setStatus("error", "A requisição de acesso à API do Moodle falhou no primeiro estágio. Verifique a conexão com a internet!");
        }
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
        default:
            break;
    }
}

function endOperation() {
    clearInterval(operating);
}

function cookiesToDict() {
    var hashTable = {}
    var i = 0;
    for (; document.cookie.split(";")[i];) {
        hashTable[document.cookie.split(";")[i].substring(0, document.cookie.split(";")[i].indexOf("=")).trim()] = document.cookie.split(";")[i].substring(document.cookie.split(";")[i].indexOf("=") + 1);
        i++;
    }
    return hashTable;
}