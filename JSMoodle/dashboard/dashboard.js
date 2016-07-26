// parsing dos cookies

var cookiesDict = cookiesToDict();

$(document).ready(function () {
    document.getElementsByTagName("h3")[0].innerHTML += "<b>" + document.cookie.substring(document.cookie.lastIndexOf("=") + 1) + "</b>";
    $.ajax("http://localhost:37006/api/dbproperties?index=" + (cookiesDict["databaseIndex"] - 1), {
        method: "GET",
        async: true,
        contentType: "application/json",
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                databaseIndex = firstStep[1]["idconexao"];
            } catch (Exception) {
                //setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                console.log("ERROR: Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            $.post({
                url: "http://localhost:37006/api/selector" + firstStep[0]["databaseType"],
                async: true,
                data: { "connectionIndex": (cookiesDict["databaseIndex"] - 1), "query": firstStep[4]["comando"] + " where userid=" + cookiesDict["userId"] }
            }).done(function (data, textStatus, jqXHR) {
                strBuilder = "";
                var i = 1;
                if (data.length == 1) {
                    strBuilder = "<li>Você não está cadastrado em curso algum.</li>";
                } else {
                    for (; data[i] ;) {
                        strBuilder += "<li class='bordered courseli'>• " + data[i][0] + " (<b tooltipvalue='   Sigla'>" + data[i][1] + "</b>) <i tooltipvalue='   Código do curso'>ID:" + data[i][2] + "</i><input type='button' id='" + data[i][2] + "' value='➕' class='btnExpand' /></li><br>";
                        i++;
                    }
                }
                document.getElementById("courses").innerHTML = strBuilder;
                $('li > b').each(function () {
                    $(this).hover(function () {
                        showTooltip($(this));
                    }, function () {
                        deleteTooltip($(this));
                    });
                });

                $('li > i').each(function () {
                    $(this).hover(function () {
                        showTooltip($(this));
                    }, function () {
                        deleteTooltip($(this));
                    });
                });

                $('.btnExpand').click(function (event){
                    $.post({
                        url: "http://localhost:37006/api/selector" + cookiesDict["databaseType"],
                        dataType: "application/json",
                        data: { "connectionIndex": (cookiesDict["databaseIndex"] - 1), "query": firstStep[5]["comando"] + " where course=" + event.target.id }
                    }).done(function (data, textStatus, jqXHR) {
                        console.log(data);
                    }).fail({

                    });
                });
            });
        }
    })
        .fail(function () {
            console.log("falhou");
    });
});

// separa a string de cookies e transforma em array

function cookiesToDict() {
    var hashTable = {}
    var i = 0;
    for (; document.cookie.split(";")[i];) {
        hashTable[document.cookie.split(";")[i].substring(0, document.cookie.split(";")[i].indexOf("=")).trim()] = document.cookie.split(";")[i].substring(document.cookie.split(";")[i].indexOf("=") + 1);
        i++;
    }
    return hashTable;
}

// toggle ON/OFF das tooltips da interface

function showTooltip(sender) {
    sender.parent().append("<span class='inline-bubble'>" + sender[0].getAttribute("tooltipvalue") + "</span>");
}

function deleteTooltip(sender) {
    sender[0].parentNode.removeChild(sender[0].parentNode.lastChild);
}

// retornar a data atual em timestamp (formato unix) para comparação na tabela MDL_ASSIGN

function getUnixTime() {
    return Math.round(new Date().getTime() / 1000);
}