// parsing dos cookies
var cookiesDict = cookiesToDict();

// variáveis de ambiente global
var courseid;
var courseFolder;
var courseFile;

// variável de operação na persistência do curso
var courseAndFileOperation = "ready_to_start";

$(document).ready(function () {
    $('.btnVoltar').click(function () {
        history.back();
    });
    try {
        courseid = window.location.toString().substring(window.location.toString().lastIndexOf("=") + 1);
    } catch (exception) {
        document.getElementById("coursecontent").innerHTML = "Ocorreu um erro no carregamento inicial da página. Tente novamente mais tarde.";
        return;
    }
    // carrega a pasta e arquivo do curso e joga nas variáveis de escopo global
    loadCourseFolderAndFile();
    document.title += courseid;

    // início do preenchimento das informações do curso
    $.ajax(cookiesDict["api_Path"] + "dbproperties?index=" + cookiesDict["databaseIndex"], {
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
                data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[8]["comando"] + " where id=" + courseid },
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
                data: { "connectionIndex": cookiesDict["databaseIndex"], "query": firstStep[9]["comando"] + " where course=" + courseid + " order by section"},
                async: false
            }).done(function (data, textStatus, jqXHR) {
                for (i = 1; i < data.length; i++) {
                    innerSectionBuilder += "<b>" + data[i][data[0].indexOf("NAME")] + "</b><br />";
                    innerSectionBuilder += data[i][data[0].indexOf("SUMMARY")];
                }
                $('#sections').html(innerSectionBuilder);

                // persistindo as informações do curso no aplicativo

                isWriteReady = setInterval(function () {
                    if (courseAndFileOperation == "write_read_ready") {
                        clearInterval(isWriteReady);
                        var writeOnFile = Windows.Storage.FileIO.writeTextAsync(courseFile, $('body')[0].innerHTML + "#WRITE_OK");
                        writeOnFile.done(function () { /* sucesso na escrita do arquivo */ }, function () { /* falha na escrita do arquivo */ });
                    } else if (courseAndFileOperation == "operation_failed") {
                        clearInterval(isWriteReady);
                    }}, 1000);

                // fim da persistência
                setExpandCourseButtonHandler();
            }).fail(function () {
                $('.header.flow-text.thin.center').attr("style", "font-size: large");
                $('.header.flow-text.thin.center').html("Requisição das informações do curso no banco falhou.");
            });
        }
    }).fail(function () {
        // requisição à api falhou
        // tentará carregar do arquivo
        $('body').html("<p class='center'><img src='../../images/universal/loading.gif' alt='loading_gif'></p>");
        isReadReady = setInterval(function () {
            if (courseAndFileOperation == "write_read_ready") {
                clearInterval(isReadReady);
                var readFromFile = Windows.Storage.FileIO.readTextAsync(courseFile);
                readFromFile.done(function () {
                    readFromFile = readFromFile.operation.getResults();
                    if (readFromFile == "") {
                        $('body').html("<div class='btnVoltar btn'>↩ Voltar</div><p>Você não tem o conteúdo desse curso salvo no dispositivo. Autentique-se online e tente novamente.</p>");
                        setGoBackButtonHandler();
                    } else if (readFromFile.indexOf("#WRITE_OK") == -1) {
                        $('body').html("<div class='btnVoltar btn'>↩ Voltar</div><p>O arquivo de conteúdo salvo do seu curso encontra-se corrompido. Isso pode ter acontecido porque você fechou o aplicativo durante o processo de gravação ou algum outro problema aconteceu enquanto a aplicação persistia os dados.</p>");
                        setGoBackButtonHandler();
                    } else {
                        $('body').html(readFromFile.substring(0, readFromFile.indexOf("#WRITE_OK")));
                        setGoBackButtonHandler();
                        setExpandCourseButtonHandler();
                    }
                }, function () {
                    $('#sections').html("<div class='btnVoltar btn'>↩ Voltar</div><p>O aplicativo falhou ao ler o arquivo do dispositivo.</p>");
                    setGoBackButtonHandler();
                });
            } else if (courseAndFileOperation == "operation_failed") {
                clearInterval(isReadReady);
                $('#sections').html("<div class='btnVoltar btn'>↩ Voltar</div><p>O aplicativo falhou na inicialização das pastas e do arquivo do curso.</p>");
                setGoBackButtonHandler();
            }
        }, 1000);
    });
});

function loadCourseFolderAndFile() {
    var getCourseFolder = Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("courses");
    getCourseFolder.done(function () {
        courseFolder = getCourseFolder.operation.getResults();
        var getFile = courseFolder.createFileAsync(courseid);
        getFile.done(function () {
            courseFile = getFile.operation.getResults();
            courseAndFileOperation = "write_read_ready";
            return;
        }, function () {
            getFile = courseFolder.getFileAsync(courseid);
            getFile.done(function () {
                courseFile = getFile.operation.getResults();
                courseAndFileOperation = "write_read_ready";
                return;
            }, function () {
                courseAndFileOperation = "operation_failed";
                // falha de obtenção de arquivo
            });
            // falha na criação do arquivo
        });
    }, function () {
        getCourseFolder = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("courses");
        getCourseFolder.done(function () {
            courseFolder = getCourseFolder.operation.getResults();
            var getFile = courseFolder.createFileAsync(courseid);
            getFile.done(function () {
                courseFile = getFile.operation.getResults();
                courseAndFileOperation = "write_read_ready";
                return;
            }, function () {
                getFile = courseFolder.getFileAsync(courseid);
                getFile.done(function () {
                    courseFile = getFile.operation.getResults();
                    courseAndFileOperation = "write_read_ready";
                    return;
                }, function () {
                    courseAndFileOperation = "operation_failed";
                    // falha de obtenção de arquivo
                });
            });
        }, function () {
            courseAndFileOperation = "operation_failed";
        });
    });
}

function setExpandCourseButtonHandler() {
    $('.sectionsholder').click(function () {
        if ($('#sections').attr('class') == "sections leftOffset") {
            $('#sections').attr('class', 'hiddendiv');
            $("#coursecontent").children().toggleClass("leftOffset");
        } else {
            $('#sections').attr('class', 'sections');
            $("#coursecontent").children().toggleClass("leftOffset");
        }
    });
}

function setGoBackButtonHandler() {
    $('.btnVoltar').click(function () {
        history.back();
    });
}