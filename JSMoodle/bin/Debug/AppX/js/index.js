$(document).ready(function () {

    // Carregando as configurações iniciais de usuário
    readUserSettings();

    // Definindo os listeners padrão de elementos da interface

    $('#username').focus(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "red-text");
        document.getElementById("loginSpan").setAttribute("class", "bold blue-text");
    }).blur(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "invisible");
        document.getElementById("loginSpan").setAttribute("class", "");
    });

    $('#api_PathHolder').click(function () {
        $('#api_Path').prop('disabled', false);
    });

    $('#api_Path').blur(function () {
        $('#api_Path').attr('disabled', true);
    });

    // Método que tenta a autenticação por seleção na tabela MDL_USER através da API
    $('#btnSubmitLoginBanco').click(function () {
        api_Path = document.getElementById('api_Path').value;
        $.ajax(api_Path + "dbproperties?index=" + document.getElementById("moodleSelector").value, {
            contentType: "application/json",
            method: "GET",
            async: true,
            success: function (firstStep) {
                setStatus("progressing", "Informações de acesso ao banco foram coletadas. Aguarde enquanto procuro seus dados entre os usuários... ");
                try {
                    firstStep = JSON.parse(firstStep);
                    document.cookie = "databaseType=" + firstStep[0]["databaseType"];
                    document.cookie = "databaseIndex=" + firstStep[1]["idconexao"];
                } catch (Exception) {
                    setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                    return;
                }
                $.post({
                    url: api_Path + "authenticate",
                    async: true,
                    data: { "connectionIndex": firstStep[1]["idconexao"] - 1, "databaseType": firstStep[0]["databaseType"], "username": document.getElementById("username").value,
                    "password": document.getElementById("password").value }
                }).done(function (data, textStatus, jqXHR) {
                    switch (data.split(";")[0]) {
                        case "user_authenticated":
                            document.cookie = "api_Path=" + api_Path;
                            document.cookie = "userId=" + data.split(";")[1];
                            document.cookie = "username=" + data.split(";")[2];
                            document.getElementById("username").setAttribute("disabled", "true");
                            document.getElementById("password").setAttribute("disabled", "true");
                            setStatus("succeeded", "A autenticação pelo banco do Moodle foi concluída com sucesso!<br>Redirecionando para a página de Dashboard... ");
                            setTimeout(function () {
                                window.location = window.location.toString().substring(0, location.toString().lastIndexOf("/")) + "/dashboard/index.html";
                            }, 2000);
                            break;
                        case "user_login_incorrect":
                            document.getElementById("username").value = "";
                            document.getElementById("password").value = "";
                            setStatus("error", "Usuário ou senha estão incorretos.");
                            break;
                        case "user_non_existent":
                            setStatus("error", "O usuário que você inseriu não existe. ");
                            document.getElementById("username").value = "";
                            document.getElementById("username").focus();
                            break;
                        case "user_password_null":
                            setStatus("error", "A senha não pode ficar em branco!");
                            document.getElementById("password").focus();
                            break;
                        default:
                            setStatus("error", "Algum erro interno ocorreu na API. Tente novamente mais tarde!");
                            break;
                    }
                }).error(function () {
                    setStatus("error", "A requisição à API do Moodle falhou no segundo estágio. ");
                });
            }
        }).error(function () {
            setStatus("error", "A requisição de acesso à API do Moodle falhou no primeiro estágio. ");
        });
    });

    $('#moodleSelector').change(function () {
        saveUserSettings(document.getElementById('moodleSelector').selectedIndex, document.getElementById('api_Path').value);
    });

    $('#api_Path').change(function () {
        saveUserSettings(document.getElementById('moodleSelector').selectedIndex, document.getElementById('api_Path').value);
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

    function saveUserSettings(connectionIndex, api_Path) {
        operation = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("config.ini");
        file = null;
        try {
            operation.done(function () {
                file = operation;
                var writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + connectionIndex + "\napi_Path=" + api_Path + "\n");
                writer.done(function () {
                    setStatus("succeeded", "Suas configurações foram salvas num arquivo e serão carregadas sempre que o aplicativo for iniciado.");
                }, function () {
                    setStatus("error", "Não foi possível salvar as novas configurações num arquivo.");
                });
            }, function () {
                file = Windows.Storage.ApplicationData.current.localFolder.createFileAsync("config.ini");
                file.done(function () {
                    file = file.operation.getResults();
                    var writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + connectionIndex + "\napi_Path=" + api_Path + "\n");
                    writer.done(function () {
                        setStatus("succeeded", "Suas configurações foram salvas num arquivo e serão carregadas sempre que o aplicativo for iniciado.");
                    }, function () {
                        setStatus("error", "Não foi possível salvar as novas configurações num arquivo.");
                    });
                }, function () {
                    setStatus("error", "Um outro erro inesperado ocorreu! Desculpe a inconveniência. ");
                });
            });
        } catch (exception) {
            setStatus("error", "Um outro erro inesperado ocorreu! Desculpe a inconveniência. ");
        }
    }

    function readUserSettings() {
        operation = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("config.ini");
        operation.done(function () {
            fileReader = Windows.Storage.FileIO.readTextAsync(operation.operation.getResults());
            fileReader.done(function () {
                parseString = fileReader.operation.getResults();
                document.getElementById('moodleSelector').selectedIndex = parseFromConfigIni(parseString, 'connectionIndex');
                document.getElementById('api_Path').value = parseFromConfigIni(parseString, 'api_Path');
                setStatus("succeeded", "Suas configurações foram carregadas com sucesso. ");
            }, function () {
                setStatus("error", "Erro ao ler o arquivo. Verifique se você tem permissão de leitura ou se o arquivo permite leitura!");
            });
        }, function () {
            saveUserSettings(document.getElementById('moodleSelector').selectedIndex, document.getElementById('api_Path').value);
        });
    }

    function parseFromConfigIni(parseString, key) {
        parseString = parseString.substring(parseString.indexOf(key)+key.length+1);
        return parseString.substring(0, parseString.indexOf("\n"));
    }
});

/*$("#btnSubmitLogin").click(function () {
    $.ajax(api_Path + "dbsites?databaseindex=" + document.getElementById("moodleSelector").value, {
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
});*/