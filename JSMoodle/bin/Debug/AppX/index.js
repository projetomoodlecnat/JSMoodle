$(document).ready(function () {
    // Carregando as configurações iniciais de usuário
    readUserSettings();

    // Definindo a animação do botão de Modo Offline

    $('.imgOfflineNavigation').hover(function () {
        $(this).addClass('pulse');
    }, function () {
        $(this).removeClass("pulse");
    });

    // Definindo os listeners padrão de elementos da interface

    $('#username').focus(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "labelSaveUser");
        document.getElementById("loginSpan").setAttribute("class", "bold blue-text");
    }).blur(function () {
        document.getElementById("loginSpan").setAttribute("class", "");
    });

    $('#password').focus(function () {
        document.getElementById("tooltipLabel").setAttribute("class", "invisible");
    });

    $('#api_PathHolder').click(function () {
        $('#api_Path').prop('disabled', false);
    });

    $('#api_Path').blur(function () {
        $('#api_Path').attr('disabled', true);
    });

    $('#api_Path').change(function () {
        saveUserSettings();
    });

    $('#moodleSelector').change(function () {
        saveUserSettings();
    });

    $('#checkboxSaveUser').change(function () {
        saveUserSettings();
    });

    // Método que tenta a autenticação por seleção na tabela MDL_USER através da API
    $('#btnSubmitLoginBanco').click(function () {
        enableTextFields(false);
        $("#status").html('<img src="images/universal/loading.gif" style="width: 20px" alt="carregando_gif" />');
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
                    document.cookie = "databaseIndex=" + (firstStep[1]["idconexao"] -1);
                } catch (exception) {
                    setStatus("error", "Parsing dos dados da API falhou no primeiro estágio.");
                    enableTextFields(true);
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
                            document.cookie = "userID=" + data.split(";")[1];
                            document.cookie = "username=" + data.split(";")[2];
                            setStatus("succeeded", "A autenticação pelo banco do Moodle foi concluída com sucesso!<br>Redirecionando para a página de Dashboard... ");
                            setTimeout(function () {
                                window.location = window.location.toString().substring(0, location.toString().lastIndexOf("/")) + "/dashboard/index.html";
                            }, 2000);
                            break;
                        case "user_login_incorrect":
                            enableTextFields(true);
                            document.getElementById("username").value = "";
                            document.getElementById("password").value = "";
                            document.getElementById("username").focus();
                            setStatus("error", "Usuário ou senha estão incorretos.");
                            break;
                        case "user_non_existent":
                            enableTextFields(true);
                            setStatus("error", "O usuário que você inseriu não existe. ");
                            document.getElementById("username").value = "";
                            document.getElementById("username").focus();
                            break;
                        case "user_password_null":
                            enableTextFields(true);
                            setStatus("error", "A senha não pode ficar em branco!");
                            document.getElementById("password").focus();
                            break;
                        default:
                            enableTextFields(true);
                            setStatus("error", "Algum erro interno ocorreu na API. Tente novamente mais tarde!");
                            break;
                    }
                }).error(function () {
                    enableTextFields(true);
                    setStatus("error", "A requisição à API do Moodle falhou no segundo estágio. ");
                });
            }
        }).error(function () {
            enableTextFields(true);
            setStatus("error", "A requisição de acesso à API do Moodle falhou no primeiro estágio. ");
        });
    });

    // Métodos que populam a interface com informações

    function saveUserSettings() {
        var args = [$('#moodleSelector').val(), $('#api_Path').val(),$('#username').val(), $('#checkboxSaveUser')[0].checked];
        document.cookie = "api_Path" + api_Path;
        var operation = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("config.ini");
        file = null;
        try {
            operation.done(function () {
                file = operation;
                var writer;
                if (args[3]) {
                    writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + args[0] + "\napi_Path=" + args[1] + "\nusername=" + args[2]+"\n");
                } else {
                    writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + args[0] + "\napi_Path=" + args[1] + "\n");
                }
                writer.done(function () {
                    setStatus("succeeded", "Suas configurações foram salvas num arquivo e serão carregadas sempre que o aplicativo for iniciado.");
                }, function () {
                    setStatus("error", "Não foi possível salvar as novas configurações num arquivo.");
                });
            }, function () {
                var file = Windows.Storage.ApplicationData.current.localFolder.createFileAsync("config.ini");
                file.done(function () {
                    file = file.operation.getResults();
                    var writer;
                    if (args[3]) {
                        writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + args[0] + "\napi_Path=" + args[1] + "\nusername=" + args[2] + "\n");
                    } else {
                        writer = Windows.Storage.FileIO.writeTextAsync(file.operation.getResults(), "connectionIndex=" + args[0] + "\napi_Path=" + args[1] + "\n");
                    }
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
        var operation = Windows.Storage.ApplicationData.current.localFolder.getFileAsync("config.ini");
        operation.done(function () {
            fileReader = Windows.Storage.FileIO.readTextAsync(operation.operation.getResults());
            fileReader.done(function () {
                var parseString = fileReader.operation.getResults();
                var isUserSet = parseFromConfigIni(parseString, 'username');
                if (isUserSet!=null) {
                    $('#username').val(isUserSet);
                    $('#checkboxSaveUser')[0].checked = true;
                }
                document.getElementById('moodleSelector').selectedIndex = parseFromConfigIni(parseString, 'connectionIndex');
                document.getElementById('api_Path').value = parseFromConfigIni(parseString, 'api_Path');
                document.cookie = "api_Path" + parseFromConfigIni(parseString, 'api_Path');
                setStatus("succeeded", "Suas configurações foram carregadas com sucesso. ");
            }, function () {
                setStatus("error", "Erro ao ler o arquivo. Verifique se você tem permissão de leitura ou se o arquivo permite leitura!");
            });
        }, function () {
            saveUserSettings();
        });
    }

    function parseFromConfigIni(parseString, key) {
        var keyIndex = parseString.indexOf(key);
        if (keyIndex == -1) { return null; }
        parseString = parseString.substring(keyIndex+key.length+1);
        return parseString.substring(0, parseString.indexOf("\n"));
    }

    function enableTextFields(shouldEnable) {
        if (shouldEnable == true) {
            document.getElementById("username").removeAttribute("disabled");
            document.getElementById("password").removeAttribute("disabled");
            return;
        }
        document.getElementById("username").setAttribute("disabled", "true");
        document.getElementById("password").setAttribute("disabled", "true");
    }
});