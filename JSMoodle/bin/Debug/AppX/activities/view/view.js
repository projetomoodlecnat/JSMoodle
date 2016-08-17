// variáveis de ambiente globais
var quizzesFolder;
var assignmentsFolder;
var enquetesFolder;
var activityFile;

// variáveis que controlam a sequência de operações
var currentOperation;
var operating;

$(document).ready(function () {
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
            currentOperation = 'ler_arquivo';
            setStatus("progressing", "Estou criando o arquivo. Aguarde enquanto faço isso e transformo os resultados em atividade...");
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

function checkCurrentOperation() {
    console.log(currentOperation);
    switch (currentOperation) {
        case 'obter_arquivo':
            currentOperation = 'working_obter_arquivo';
            switch (window.location.toString().substring((window.location.toString().indexOf('?') + 1), window.location.toString().indexOf('='))) {
                case 'quizz':
                    // verifica a cada segundo se a tarefa de criação já completou
                    // parâmetro da query string para determinar o id da atividade
                    inicializarArquivoAtividade(quizzesFolder, window.location.toString().substr(window.location.toString().indexOf('=') + 1));
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
        default:
            break;
    }
}

function endOperation() {
    clearInterval(operating);
}