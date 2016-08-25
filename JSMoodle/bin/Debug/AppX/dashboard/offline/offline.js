var coursesFile;

$(document).ready(function () {
    coursesFile = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("dashboard.html");
    coursesFile.done(function () {
        var readFile = Windows.Storage.FileIO.readTextAsync(coursesFile.operation.getResults());
        readFile.done(function () {
            resultString = readFile.operation.getResults();
            try {
                //$('#courses').html(resultString.substring(0, resultString.indexOf("#WRITE_OK")));
                $('#courses').html(resultString);
                $('.btn-floating').click(function (event) {
                    if (document.getElementById("ulActivities" + event.target.id) != null && document.getElementById("ulActivities" + event.target.id).style.display != "none") {
                        document.getElementById("ulActivities" + event.target.id).style.display = "none";
                        $(this).val("➕");
                        $(this).attr("style", "");
                        return;
                    }
                    $(this).val("➖");
                    if (document.getElementById("ulActivities" + event.target.id) != null) {
                        document.getElementById("ulActivities" + event.target.id).removeAttribute("style");
                        $(this).attr("style", "background-color: #80cbc4");
                    } else {
                        $(this).attr("style", "background-color: #ffff66");
                    }
                });
            } catch (exception) {
                // escrita do arquivo foi corrompida
                $('#courses').html("O seu arquivo persistido está corrompido. Aguarde enquanto excluo...<p><img src='../images/universal/loading.gif' alt='animacao_carregando'></p>");
                deleteCorruptedFile(coursesFile);
            }
        }, function () {
            $('#courses').html("Não foi possível carregar do dispositivo nenhuma informação dos cursos dos quais você participa.");
            return;
        })
    }, function () {
        $('#courses').html("Não foi possível carregar do dispositivo nenhuma informação dos cursos dos quais você participa.");
        return;
    }, function () {
        $('#courses').html("<img src='../../images/universal/loading.gif' alt='animacao_carregando'>");
    });
});

function deleteCorruptedFile(coursesFile) {
    var fileDeleteOperation = coursesFile.deleteAsync(Windows.Storage.StorageDeleteOption.permanentDelete);
    fileDeleteOperation.done(function () {
        $('#courses').html("Excluído com sucesso. Recarregarei a página... ");
        setTimeout(function () {
            window.location = window.location.toString();
            console.log("deletion_ok");
        }, 2000);
    }, function () {
        $('#courses').html("Falha ao excluir o arquivo corrompido. Tente excluir o arquivo manualmente!");
        setTimeout(function () {
            window.location = "/index.html";
            console.log("deletion_failed");
        }, 2000);
    });
}