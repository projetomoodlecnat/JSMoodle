// parsing dos cookies

var cookiesDict = cookiesToDict();
var buttonset = []

$(document).ready(function () {
    // definindo o botão de saída
    $('.paragraphLogout.center').click(function () {
        document.cookie.split(";").forEach(function (c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
        console.log(document.cookie);
        window.location.href = "../index.html";
    });
    // document.cookie.substring(document.cookie.lastIndexOf("=") + 1)
    document.getElementsByTagName("h3")[0].innerHTML += "<b>" + cookiesDict["username"] + "</b>";
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
        method: "GET",
        async: true,
        contentType: "application/json",
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
                databaseIndex = firstStep[1]["idconexao"];
            } catch (Exception) {
                console.log("ERROR: Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }
            $.post({
                url: cookiesDict["api_Path"] + "selector" + firstStep[0]["databaseType"],
                async: true,
                data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[4]["comando"] + " where userid=" + cookiesDict["userId"] }
            }).done(function (data, textStatus, jqXHR) {
                strBuilder = "";
                var i = 1;
                if (data.length == 1) {
                    strBuilder = "<li>Você não está cadastrado em curso algum.</li>";
                } else {
                    for (; data[i] ;) {
                        strBuilder += "<li class='bordered courseli'><a href='courses/index.html?id=" + data[i][2] + "'>• " + data[i][0] + " (<b tooltipvalue='   Sigla'>" + data[i][1] + "</b>) <i tooltipvalue='   Código do curso'>ID:" + data[i][2] + "</i></a><input type='button' id='" + data[i][2] + "' value='➕' class='btn-floating' /></li><br>";
                        i++;
                    }
                }
                document.getElementById("courses").innerHTML = strBuilder;
                setTooltips();

                $('.btn-floating').click(function (event) {
                    if (document.getElementById("ulActivities" + event.target.id) != null) {
                        $("#ulActivities" + event.target.id).parent().children("ul").each(function () {
                            $(this).remove();
                        });
                        return;
                    }
                    var innerHTMLBuilder = "<ul id='ulActivities" + event.target.id + "'>";

                    // começo da requisição de atividades

                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[5]["comando"] + " where course=" + event.target.id },
                        async: false
                    }).done(function (data, textStatus, jqXHR) {
                        if (data.length <= 1) {
                            innerHTMLBuilder += "<ul><li><div>Nenhuma tarefa cadastrada para esse curso.</div></li></ul>";
                        } else {
                            var innerHTMLActivity = "";
                            // categoriza as atividades por tipo
                            var atividades = []
                            atividades.initialHTML = "<ul class='activitiesContainer' id='ulTasks" + event.target.id + "'>";
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

                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[6]["comando"] + " where course=" + event.target.id },
                        async: false
                    }).done(function (data, textStatus, jqXHR) {
                        if (data.length <= 1) {
                            document.getElementById(event.target.id).parentNode.innerHTML += "<ul><li><div>Nenhum quizz cadastrado para esse curso.</div></li></ul>";
                        } else {
                            var innerHTMLQuizzes = "";
                            // categoriza as quizzes por tipo
                            var quizzes = []
                            quizzes.initialHTML = "<ul class='activitiesContainer' id='ulQuizzes" + event.target.id + "'>";
                            quizzes.quizzesnoprazo = []
                            quizzes.quizzesfechadas = []
                            quizzes.quizzesforadoprazo = []
                            quizzes.finalHTML = "</ul>";
                            var i = 1;
                            // mapeia as colunas aos valores crus dos dados trazidos da tabela
                            for (; data[i];) {
                                if (getUnixTime() < data[i][data[0].indexOf("TIMECLOSE")] || data[i][data[0].indexOf("TIMECLOSE")] === "0") {
                                    // caso onde a tarefa está aberta
                                    quizzes.quizzesnoprazo.push("<a href='../activities/view/index.html?quizz=" + data[i][data[0].indexOf("ID")] + "'><li class='liOpen'><img class='liActivityIcon' src='../images/dashboard/icons/quiz_duedate.png' /><b tooltipvalue='EM ABERTO'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li></a>");
                                } else if (getUnixTime() > data[i][data[0].indexOf("TIMECLOSE")] && data[i][data[0].indexOf("OVERDUEHANDLING")] !== "autoabandon") {
                                    // caso onde a tarefa extrapolou o prazo, mas ainda está aberta
                                    quizzes.quizzesforadoprazo.push("<a href='../activities/view/index.html?quizz=" + data[i][data[0].indexOf("ID")] + "'><li class='liOverdue'><img class='liActivityIcon' src='../images/dashboard/icons/quiz_overdue.png' /><b tooltipvalue='FORA DO PRAZO'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li></a>");
                                } else {
                                    // caso onde a tarefa não está mais aberta
                                    quizzes.quizzesfechadas.push("<a href='../activities/view/index.html?quizz=" + data[i][data[0].indexOf("ID")] + "'><li class='liClosed'><img class='liActivityIcon' src='../images/dashboard/icons/quiz_closed.png' /><b tooltipvalue='FECHADA'>Quizz " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li></a>");
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

                    $.post({
                        url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                        data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[7]["comando"] + " where course=" + event.target.id },
                        async: false
                    }).done(function (data, textStatus, jqXHR) {
                        if (data.length <= 1) {
                            document.getElementById(event.target.id).parentNode.innerHTML += "<ul><li><div>Nenhuma enquete cadastrada para esse curso.</div></li></ul>";
                        } else {
                            var innerHTMLenquetes = "";
                            // categoriza as enquetes por tipo
                            var enquetes = []
                            enquetes.initialHTML = "<ul class='activitiesContainer' id='ulEnquetes" + event.target.id + "'>";
                            enquetes.enquetesnoprazo = []
                            enquetes.enquetesfechadas = []
                            enquetes.finalHTML = "</ul>";
                            var i = 1;
                            // mapeia as colunas aos valores crus dos dados trazidos da tabela
                            for (; data[i];) {
                                if (getUnixTime() < data[i][data[0].indexOf("TIMECLOSE")] || data[i][data[0].indexOf("TIMECLOSE")] === "0") {
                                    // caso onde a tarefa está aberta
                                    enquetes.enquetesnoprazo.push("<li class='liOpen'><img class='liActivityIcon' src='../images/dashboard/icons/enquete_duedate.png' /><b tooltipvalue='EM ABERTO'>Enquete " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                    console.log(data[i][data[0].indexOf("DUEDATE")]);
                                } else {
                                    // caso onde a tarefa não está mais aberta
                                    enquetes.enquetesfechadas.push("<li class='liClosed'><img class='liActivityIcon' src='../images/dashboard/icons/enquete_closed.png' /><b tooltipvalue='FECHADA'>Enquete " + data[i][data[0].indexOf("NAME")].toUpperCase() + "</b> ID: " + data[i][data[0].indexOf("ID")] + "</li>");
                                }
                                i++;
                            }

                            // criando a visão em HTML a partir da informação processada
                            innerHTMLenquetes += enquetes.initialHTML;
                            while (enquetes.enquetesnoprazo.length > 0) {
                                innerHTMLenquetes += enquetes.enquetesnoprazo.pop();
                            }
                            while (enquetes.enquetesfechadas.length > 0) {
                                innerHTMLenquetes += enquetes.enquetesfechadas.pop();
                            }
                            innerHTMLenquetes += enquetes.finalHTML;
                            innerHTMLBuilder += innerHTMLenquetes;
                        }
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        console.log("<li>Requisição dos enquetes falhou.</li>");
                    });

                    // finaliza e adiciona o HTML ao list item pai
                    var innerHTMLQuizzes = "";
                    document.getElementById(event.target.id).parentNode.innerHTML += innerHTMLBuilder + "</ul>";
                    unsetTooltips();
                    setTooltips();
                    if (buttonset.length != 0) {
                        var i = 0;
                        $('.btn-floating').each(function () {
                            $(this).replaceWith($(buttonset[i]));
                            i++;
                        });
                    }
                });
                $('.btn-floating').each(function () {
                    buttonset.push($(this));
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
    sender.parent().append("<span class='inline-bubble'>     " + sender[0].getAttribute("tooltipvalue") + "</span>");
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