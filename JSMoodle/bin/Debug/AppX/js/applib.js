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