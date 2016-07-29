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
                setTooltips();
                $('.btnExpand').click(function (event) {
                    var innerHTMLBuilder = "<ul id='ulActivities" + event.target.id + "'>";

                    // começo da requisição de atividades

                    $.post({
                        url: "http://localhost:37006/api/selector" + cookiesDict["databaseType"],
                        data: { "connectionIndex": cookiesDict["databaseIndex"] - 1, "query": firstStep[5]["comando"] + " where course=" + event.target.id }
                    }).done(function (data, textStatus, jqXHR) {
                        if (data.length <= 1) {
                            innerHTMLBuilder += "<li><div>Nenhuma tarefa cadastrada para esse curso.</div></li>";
                        } else {
                            var innerHTMLActivity = "";
                            // categoriza as atividades por tipo
                            var atividades = []
                            atividades.initialHTML = "<ul class='activitiesContainer' id='ulActivities" + event.target.id + "'>";
                            atividades.atividadesnoprazo = []
                            atividades.atividadesfechadas = []
                            atividades.atividadesforadoprazo = []
                            atividades.finalHTML = "</ul>";
                            var i = 1;
                            // mapeia as colunas aos valores crus dos dados trazidos da tabela
                            for (; data[i];) {
                                if (getUnixTime() < data[i][data[0].indexOf("DUEDATE")] || data[i][data[0].indexOf("DUEDATE")] === "0") {
                                    // caso onde a tarefa está aberta
                                    atividades.atividadesnoprazo.push("<li class='liOpen'><img class='liActivityIcon' src='../images/dashboard/icons/assignment_duedate.png' /><b tooltipvalue='EM ABERTO'>Atividade " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                    console.log(data[i][data[0].indexOf("DUEDATE")]);
                                } else if (getUnixTime() > data[i][data[0].indexOf("DUEDATE")] && (getUnixTime() < data[i][data[0].indexOf("CUTOFFDATE")] || data[i][data[0].indexOf("CUTOFFDATE")] === "0")) {
                                    // caso onde a tarefa extrapolou o prazo, mas ainda está aberta
                                    atividades.atividadesforadoprazo.push("<li class='liOverdue'><img class='liActivityIcon' src='../images/dashboard/icons/assignment_overdue.png' /><b tooltipvalue='FORA DO PRAZO'>Atividade " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                } else {
                                    // caso onde a tarefa não está mais aberta
                                    atividades.atividadesfechadas.push("<li class='liClosed'><img class='liActivityIcon' src='../images/dashboard/icons/assignment_closed.png' /><b tooltipvalue='FECHADA'>Atividade " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                }
                                i++;
                            }

                            // criando a visão em HTML a partir da informação processada
                            innerHTMLActivity += atividades.initialHTML;
                            while (atividades.atividadesnoprazo.length > 0) {
                                innerHTMLActivity += atividades.atividadesnoprazo.pop();
                            }
                            while (atividades.atividadesfechadas.length > 0) {
                                innerHTMLActivity += atividades.atividadesfechadas.pop();
                            }
                            while (atividades.atividadesforadoprazo.length > 0) {
                                innerHTMLActivity += atividades.atividadesforadoprazo.pop();
                            }
                            innerHTMLActivity += atividades.finalHTML;
                            innerHTMLBuilder += innerHTMLActivity;
                        }
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        console.log("<li>Requisição das atividades falhou.</li>");
                    });

                    // final da requisição de atividades
                    // ===
                    // começo da requisição de quizzes

                    $.post({
                        url: "http://localhost:37006/api/selector" + cookiesDict["databaseType"],
                        data: { "connectionIndex": cookiesDict["databaseIndex"] - 1, "query": firstStep[6]["comando"] + " where course=" + event.target.id }
                    }).done(function (data, textStatus, jqXHR) {
                        if (data.length <= 1) {
                            event.target.parentNode.innerHTML += "<li><div>Nenhum quizz cadastrado para esse curso.</div></li>";
                        } else {
                            var innerHTMLQuizzes = "";
                            // categoriza as quizzes por tipo
                            var quizzes = []
                            quizzes.initialHTML = "<ul class='quizzesContainer' id='ulQuizzes" + event.target.id + "'>";
                            quizzes.quizzesnoprazo = []
                            quizzes.quizzesfechadas = []
                            quizzes.quizzesforadoprazo = []
                            quizzes.finalHTML = "</ul>";
                            var i = 1;
                            // mapeia as colunas aos valores crus dos dados trazidos da tabela
                            for (; data[i];) {
                                if (getUnixTime() < data[i][data[0].indexOf("TIMECLOSE")]) {
                                    // caso onde a tarefa está aberta
                                    quizzes.quizzesnoprazo.push("<li class='liOpen'><img class='liQuizzIcon' src='../images/dashboard/icons/quiz_duedate.png' /><b tooltipvalue='EM ABERTO'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                    console.log(data[i][data[0].indexOf("DUEDATE")]);
                                } else if (getUnixTime() > data[i][data[0].indexOf("TIMECLOSE")] && data[i][data[0].indexOf("OVERDUEHANDLING")] !== "autoabandon") {
                                    // caso onde a tarefa extrapolou o prazo, mas ainda está aberta
                                    quizzes.quizzesforadoprazo.push("<li class='liOverdue'><img class='liQuizzIcon' src='../images/dashboard/icons/quiz_overdue.png' /><b tooltipvalue='FORA DO PRAZO'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                } else {
                                    // caso onde a tarefa não está mais aberta
                                    quizzes.quizzesfechadas.push("<li class='liClosed'><img class='liQuizzIcon' src='../images/dashboard/icons/quiz_closed.png' /><b tooltipvalue='FECHADA'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                }
                                i++;
                            }

                            // criando a visão em HTML a partir da informação processada
                            innerHTMLQuizzes += quizzes.initialHTML;
                            while (quizzes.quizzesnoprazo.length > 0) {
                                innerHTMLQuizzes += quizzes.quizzesnoprazo.pop();
                            }
                            while (quizzes.quizzesfechadas.length > 0) {
                                innerHTMLQuizzes += quizzes.quizzesfechadas.pop();
                            }
                            while (quizzes.quizzesforadoprazo.length > 0) {
                                innerHTMLQuizzes += quizzes.quizzesforadoprazo.pop();
                            }
                            innerHTMLQuizzes += quizzes.finalHTML;
                            innerHTMLBuilder += innerHTMLQuizzes;
                        }
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        console.log("<li>Requisição dos quizzes falhou.</li>");
                    });

                    // final da requisição de quizzes
                    // ===
                    // começo da requisição de enquetes
                    // final da requisição de enquetes

                    // finaliza e adiciona o HTML ao list item pai
                    event.target.parentNode.innerHTML += innerHTMLBuilder + "</ul>";
                    unsetTooltips();
                    setTooltips();
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

function setTooltips() {
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
}

function unsetTooltips() {
    $('inline-bubble').each(function(){
        $(this).remove();
    });

    $('li > b').each(function () {
        $(this).unbind('mouseenter mouseleave');
    });

    $('li > i').each(function () {
        $(this).unbind('mouseenter mouseleave');
    });
}

// retornar a data atual em timestamp (formato unix) para comparação na tabela MDL_ASSIGN

function getUnixTime() {
    return Math.round(new Date().getTime() / 1000);
}

// tentativa de correção de bug onde o botão de expandir aparenta perder o listener

function resetEvent(sender) {

}