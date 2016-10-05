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
    // tentando varrer as pastas
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
    var contentInterval = setInterval(function () {
        if (activitiesFoldersDoneAmount == getFoldersAmount()) {
            clearInterval(contentInterval);
            $(".content").html(finalHTMLContent);
        }
    }, 1500);
});