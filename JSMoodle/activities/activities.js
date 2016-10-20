$(document).ready(function () {
    $('.paragraphLogout.center').click(function () {
        document.cookie.split(";").forEach(function (c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
        console.log(document.cookie);
        window.location.href = "../index.html";
    });
    $('.paragraphViewActivities').click(function () {
        history.back();
    });
    var finalHTMLContent = "";
    var activitiesFoldersDoneAmount = 0;

    // pasta de quizzes

    var quizzOperation = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("quizzes");
    quizzOperation.done(function () {
        quizzOperation = quizzOperation.operation.getResults().getFilesAsync();
        quizzOperation.done(function () {
            quizzOperation = quizzOperation.operation.getResults();
            if (quizzOperation.length == 0) {
                finalHTMLContent += "<p>Nenhum quizz salvo.</p>";
            } else {
                finalHTMLContent += "<h3>Quizzes</h3><ul>";
                for (var i = 0; i < quizzOperation.length; i++) {
                    finalHTMLContent += "<a href='view/index.html?quizz=" + quizzOperation[i].name.toString() + "'><li>Quizz de ID #" + quizzOperation[i].displayName.toString() + "</li></a>";
                }
                finalHTMLContent += "</ul>";
            }
            activitiesFoldersDoneAmount++;
        }, function () {
            finalHTMLContent += "<p>Erro na requisição dos arquivos de quizz.</p>";
            activitiesFoldersDoneAmount++;
        });
    }, function () {
        finalHTMLContent += "<p>Nenhum quizz salvo.</p>";
        activitiesFoldersDoneAmount++;
    });

    // fim pasta de quizzes

    var assignmentOperation = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("assignments");
    assignmentOperation.done(function () {
        assignmentOperation = assignmentOperation.operation.getResults().getFilesAsync();
        assignmentOperation.done(function () {
            assignmentOperation = assignmentOperation.operation.getResults();
            if (assignmentOperation.length == 0) {
                finalHTMLContent += "<p>Nenhuma tarefa salva.</p>";
            } else {
                finalHTMLContent += "<h3>Tarefas</h3><ul>";
                for (var i = 0; i < assignmentOperation.length; i++) {
                    finalHTMLContent += "<a href='view/index.html?assignment=" + assignmentOperation[i].name.toString() + "'><li>Tarefa de ID #" + assignmentOperation[i].displayName.toString() + "</li></a>";
                }
                finalHTMLContent += "</ul>";
            }
            activitiesFoldersDoneAmount++;
        }, function () {
            finalHTMLContent += "<p>Erro na requisição dos arquivos de tarefa.</p>";
            activitiesFoldersDoneAmount++;
        });
    }, function () {
        finalHTMLContent += "<p>Nenhuma tarefa salva.</p>";
        activitiesFoldersDoneAmount++;
    });

    var surveyOperation = Windows.Storage.ApplicationData.current.localFolder.getFolderAsync("surveys");
    surveyOperation.done(function () {
        surveyOperation = surveyOperation.operation.getResults().getFilesAsync();
        surveyOperation.done(function () {
            surveyOperation = surveyOperation.operation.getResults();
            if (surveyOperation.length == 0) {
                finalHTMLContent += "<p>Nenhuma enquete salva.</p>";
            } else {
                finalHTMLContent += "<h3>Enquetes</h3><ul>";
                for (var i = 0; i < surveyOperation.length; i++) {
                    finalHTMLContent += "<a href='../surveys/index.html?survey=" + surveyOperation[i].name.toString() + "'><li>Enquete de ID #" + surveyOperation[i].displayName.toString() + "</li></a>";
                }
                finalHTMLContent += "</ul>";
            }
            activitiesFoldersDoneAmount++;
        }, function () {
            finalHTMLContent += "<p>Erro na requisição dos arquivos de enquete.</p>";
            activitiesFoldersDoneAmount++;
        });
    }, function () {
        finalHTMLContent += "<p>Nenhuma enquete salva.</p>";
        activitiesFoldersDoneAmount++;
    });


    var contentInterval = setInterval(function () {
        if (activitiesFoldersDoneAmount == getFoldersAmount()) {
            clearInterval(contentInterval);
            $(".content").html(finalHTMLContent);
        }
    }, 1500);
});