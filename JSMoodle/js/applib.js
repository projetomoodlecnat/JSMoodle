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

function persistCacheImage(url) {
    var request = new Windows.Web.Http.HttpClient().getAsync(new Windows.Foundation.Uri(url));
    var fileBytes;
    var fileCreated;
    request.done(function () {
        request = request.operation.getResults().content.readAsBufferAsync();
        request.done(function () {
            fileCreated = Windows.Storage.ApplicationData.current.localCacheFolder.createFileAsync("image.jpg");
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