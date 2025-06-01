// static/js/categoria_modal.js

$(document).ready(function () {
    const modalCategoria = $('#modalCategoria');
    const modalTitle = modalCategoria.find('.modal-title');
    const modalBody = modalCategoria.find('#modalCategoriaBody');
    const btnSalvar = modalCategoria.find('#btnSalvarCategoriaModal');

    // Evento acionado ao abrir o modal
    modalCategoria.on('show.bs.modal', function (event) {
        const button = $(event.relatedTarget); // Botão que acionou o modal
        const action = button.data('action'); // 'novo' ou 'editar'
        const publicId = button.data('public-id'); // public_id se for edição

        // Limpa conteúdo anterior e mostra indicador de carregamento
        modalBody.html('<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>');
        btnSalvar.prop('disabled', true);

        let formUrl = '';
        let submitUrl = '';

        if (action === 'novo') {
            modalTitle.text('Nova Categoria');
            btnSalvar.text('Cadastrar');
            formUrl = '/categorias/get_form/'; // Rota para formulário vazio
            submitUrl = '/categorias'; // Rota POST para criar (lógica já está na rota /categorias POST)
        } else if (action === 'editar') {
            modalTitle.text('Editar Categoria');
            btnSalvar.text('Salvar Alterações');
            formUrl = `/categorias/get_form/${publicId}/`; // Rota para formulário com dados
            submitUrl = `/categorias/${publicId}/salvar`; // Rota POST para editar (precisa ser criada)
        }

        // Requisição AJAX para carregar o conteúdo do formulário
        $.ajax({
            url: formUrl,
            method: 'GET',
            success: function (htmlContent) {
                modalBody.html(htmlContent);
                btnSalvar.prop('disabled', false);

                const form = modalBody.find('#formCategoriaModal');
                form.attr('action', submitUrl); // Define a action do formulário

                // Adiciona o public_id como campo oculto no formulário carregado se for edição
                if (action === 'editar') {
                     if (form.find('#categoria_public_id_modal').length === 0) {
                         form.append('<input type="hidden" id="categoria_public_id_modal" name="public_id" value="' + publicId + '">');
                     } else {
                          form.find('#categoria_public_id_modal').val(publicId);
                     }
                }


            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Erro ao carregar formulário de categoria:", textStatus, errorThrown, jqXHR.responseText);
                modalBody.html('<div class="alert alert-danger">Erro ao carregar formulário.</div>');
                btnSalvar.prop('disabled', true);
            }
        });
    });

    // Evento acionado ao fechar o modal
    modalCategoria.on('hidden.bs.modal', function () {
        modalBody.empty(); // Limpa o conteúdo do corpo do modal
        modalTitle.text('Título do Modal'); // Restaura título padrão
        btnSalvar.text('Salvar'); // Restaura texto do botão
        btnSalvar.prop('disabled', false); // Habilita o botão
    });

    // Lógica de submissão do formulário do modal via AJAX
    // Usamos delegation no corpo do modal porque o formulário #formCategoriaModal é carregado dinamicamente
    modalCategoria.on('submit', '#formCategoriaModal', function(e) {
        e.preventDefault(); // Impede a submissão tradicional do formulário
        const form = $(this);
        const url = form.attr('action');
        const formData = form.serialize(); // Coleta os dados do formulário

        // Desabilita o botão salvar enquanto envia
        btnSalvar.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Salvando...'); // Adiciona spinner

        $.ajax({
            type: 'POST',
            url: url,
            data: formData,
            dataType: 'json', // Espera resposta JSON do backend
            success: function(response) {
                if (response.success) {
                    alert(response.message); // Exibe mensagem de sucesso
                    modalCategoria.modal('hide'); // Fecha o modal

                    // TODO: Atualizar a tabela de categorias no frontend (recarga simples por enquanto)
                    location.reload(); // Recarrega a página para ver a lista atualizada
                } else {
                    // Exibe mensagens de erro retornadas pelo backend
                     alert('Erro ao salvar categoria: ' + (response.message || 'Erro desconhecido.'));
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("Erro AJAX ao salvar categoria:", textStatus, errorThrown, jqXHR.responseText);
                let errorMsg = "Erro de comunicação ao salvar categoria.";
                if(jqXHR.responseJSON && jqXHR.responseJSON.message) {
                    errorMsg = jqXHR.responseJSON.message;
                } else if (jqXHR.responseText) {
                    try {
                        const errResp = JSON.parse(jqXHR.responseText);
                         if (errResp && errResp.message) errorMsg = errResp.message;
                         else if (jqXHR.status && jqXHR.statusText && jqXHR.status !== 0) errorMsg = `Erro ${jqXHR.status}: ${jqXHR.statusText}`;
                      } catch(e) {
                           if (jqXHR.status && jqXHR.statusText && jqXHR.status !== 0) errorMsg = `Erro ${jqXHR.status}: ${jqXHR.statusText}`;
                      }
                  }
                alert('Erro ao salvar categoria: ' + errorMsg);
            },
            complete: function() {
                // Restaura o botão (texto original e habilita)
                const action = form.attr('action').includes('/salvar') ? 'editar' : 'novo';
                btnSalvar.prop('disabled', false).html(action === 'novo' ? 'Cadastrar' : 'Salvar Alterações');
            }
        });
    });
});