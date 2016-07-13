$(document).ready(function () {

    // Definindo os listeners padrão de elementos da interface

    $('#username').focus(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "red-text");
        document.getElementById("loginSpan").setAttribute("class", "bold blue-text");
    }).blur(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "invisible");
        document.getElementById("loginSpan").setAttribute("class", "");
    });

    // Método que realiza a autenticação pelo site do Moodle

    $("#btnSubmitLogin").click(function () {
        $.ajax("http://localhost:37006/api/dbsites?databaseindex=" + document.getElementById("moodleSelector").value, {
            contentType: "application/json",
            method: "GET",
            async: true,
            success: function (firstStep) {
                setStatus("progressing", "O site do Moodle está disponível e ativo. Tentando a autenticação... ");
                jQuery.post({
                    url: firstStep[0] + "login/index.php",
                    data: { 'username': document.getElementById("username").value, 'password': document.getElementById("password").value }
                }).done(function (data, textStatus, jqXHR) {
                    // A tag meta está presente somente na página de índice de login
                    if (data.indexOf('meta name="robots"') == -1) {
                        document.getElementById("username").setAttribute("disabled", "true");
                        document.getElementById("password").setAttribute("disabled", "true");
                        setStatus("succeeded", "A autenticação pelo site do Moodle foi concluída com sucesso!<br>Redirecionando para a página de Dashboard... ");
                        setTimeout(function () {
                            window.location = window.location.toString().substring(0, location.toString().lastIndexOf("/")) + "/dashboard/index.html";
                        }, 2000);
                        return;
                    }
                    setStatus("error", "O processo de autenticação foi concluído com sucesso, mas o usuário ou senha estão incorretos. ");
                }).error(function () {
                    setStatus("error", "A requisição de autenticação com a página de Login do Moodle falhou. ");
                    return;
                });
            }, error: function () {
                setStatus("error", "A requisição de autenticação com a página de Login do Moodle falhou. ");
            }
        }).error(function () {
            setStatus("error", "A requisição de acesso à API do Moodle falhou. ");
        });
    });


    // Método que realiza a autenticação através de seleção na tabela de usuários e um código hash codificador

    //======================================A SER IMPLEMENTADO================================================

    // Métodos que populam a interface com informações

    function setStatus(type, message) {
        if (type == "progressing") {
            document.getElementById("status").setAttribute("class", "center light-green-text");
            document.getElementById("status").innerHTML = message;
        } else if (type == "error") {
            document.getElementById("status").setAttribute("class", "center red-text");
            document.getElementById("status").innerHTML = message;
        } else {
            document.getElementById("status").setAttribute("class", "center blue-text");
            document.getElementById("status").innerHTML = message;
        }
    }
});