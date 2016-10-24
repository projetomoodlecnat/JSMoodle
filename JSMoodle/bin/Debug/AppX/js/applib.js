/* 
    FUNÇÕES GLOBAIS DA APLICAÇÃO
    SÃO USADAS EM MÚLTIPLAS PÁGINAS
*/

function cookiesToDict() {
    var hashTable = {}
    var i = 0;
    for (; document.cookie.split(";")[i];) {
        hashTable[document.cookie.split(";")[i].substring(0, document.cookie.split(";")[i].indexOf("=")).trim()] = document.cookie.split(";")[i].substring(document.cookie.split(";")[i].indexOf("=") + 1);
        i++;
    }
    return hashTable;
}

function isAppOnline() {
    if (true) {
        return true;
    }
    else {
        return false;
    }
}

// retornar a data atual em timestamp (formato unix) para comparação na tabela MDL_ASSIGN

function getUnixTime() {
    return Math.round(new Date().getTime() / 1000);
}

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

function splitHTMLText(questionText) {
    if (questionText.indexOf("<p") == -1) {
        return questionText;
    }
    var splittedText = questionText.substring(questionText.indexOf(">") + 1);
    splittedText = splittedText.substring(splittedText.indexOf(">") + 1);
    splittedText = splittedText.substring(0, splittedText.indexOf("<"));
    return splittedText;
}

function persistCacheImage(url, filename) {
    var request = new Windows.Web.Http.HttpClient().getAsync(new Windows.Foundation.Uri(url));
    var fileBytes;
    var fileCreated;
    request.done(function () {
        request = request.operation.getResults().content.readAsBufferAsync();
        request.done(function () {
            fileCreated = Windows.Storage.ApplicationData.current.localCacheFolder.createFileAsync(filename);
            fileCreated.done(function () {
                Windows.Storage.FileIO.writeBufferAsync(fileCreated.operation.getResults(), request.operation.getResults()).done(function () {

                });
            }, function () {
                console.log("[ERRO] Arquivo já existe ou não pode escrever");
                return;
            });
        }, function () {
            console.log("[ERRO] Requisição");
            return;
        });
    });
}

function getFoldersAmount() {
    // define a quantidade de pastas a serem pesquisadas na pesquisa de atividades
    return 3;
}