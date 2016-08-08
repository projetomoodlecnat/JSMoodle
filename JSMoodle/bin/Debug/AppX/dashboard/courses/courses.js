// parsing dos cookies
var cookiesDict = cookiesToDict();

// variáveis de ambiente global
var courseid;
var courseContent = []

try {
    var courseid = window.location.toString().substring(window.location.toString().lastIndexOf("=") + 1);
} catch (exception) {
    document.getElementById("coursecontent").innerHTML = "Ocorreu um erro no carregamento inicial da página. Tente novamente mais tarde.";
}

$(document).ready(function () {
    document.title += courseid;

    // salva o HTMLElement e o elemento na forma de seletor pelo jquery no array global
    coursecontent.push = document.getElementById("coursecontent");
    coursecontent.push = $("#coursecontent");

    // início do preenchimento das informações do curso
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + (cookiesDict["databaseIndex"] - 1), {
        method: "GET",
        async: false,
        contentType: "application/json",
        success: function (firstStep) {
            try {
                firstStep = JSON.parse(firstStep);
            } catch (Exception) {
                console.log("ERROR: Parsing dos dados da API falhou no primeiro estágio.");
                return;
            }

            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                data: { "connectionIndex": (cookiesDict["databaseIndex"] - 1), "query": firstStep[8]["comando"] + " where id=" + courseid },
                async: false
            }).done(function (data, textStatus, jqXHR) {
                $('.header.flow-text.thin.center').html(data[1][data[0].indexOf("FULLNAME")]);
                $('.summarytext').html(data[1][data[0].indexOf("SUMMARY")]);
                $('.objectivetext').html(data[1][data[0].indexOf("OBJETIVOS")]);
                }).fail(function () {
                    $('.header.flow-text.thin.center').attr("style", "font-size: large");
                    $('.header.flow-text.thin.center').html("Requisição das informações do curso no banco falharam.");
                });

            innerSectionBuilder = "";
            $.post({
                url: cookiesDict["api_Path"] + "selector" + cookiesDict["databaseType"],
                data: { "connectionIndex": (cookiesDict["databaseIndex"] - 1), "query": firstStep[9]["comando"] + " where course=" + courseid + " order by section"},
                async: false
            }).done(function (data, textStatus, jqXHR) {
                for (i = 1; i < data.length; i++) {
                    innerSectionBuilder += "<b>" + data[i][data[0].indexOf("NAME")] + "</b><br />";
                    innerSectionBuilder += data[i][data[0].indexOf("SUMMARY")];
                }
            }).fail(function () {
                $('.header.flow-text.thin.center').attr("style", "font-size: large");
                $('.header.flow-text.thin.center').html("Requisição das informações do curso no banco falharam.");
            });
            $('#sections').html(innerSectionBuilder);
        }
    }).fail(function () {
        // requisição à api falhou
    });

    $('.sectionsholder').click(function () {
        if ($('#sections').attr('class') == "sections") {
            $('#sections').attr('class', 'hiddendiv');
        } else {
            $('#sections').attr('class', 'sections');
        }
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