// static/js/fornecedor_modal.js

$(document).ready(function () {
    const modalFornecedor = $('#modalFornecedor');
    const modalTitle = modalFornecedor.find('.modal-title');
    const modalBody = modalFornecedor.find('#modalFornecedorBody');
    const btnSalvar = modalFornecedor.find('#btnSalvarFornecedorModal');

    // Evento acionado ao abrir o modal
    modalFornecedor.on('show.bs.modal', function (event) {
        console.log('Evento show.bs.modal disparado'); // Debug: Evento disparado

        const button = $(event.relatedTarget); // Botão que acionou o modal
        const action = button.data('action'); // 'novo' ou 'editar'
        const publicId = button.data('public-id'); // public_id se for edição

        // Limpa conteúdo anterior e mostra indicador de carregamento
        modalBody.html('<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>');
        btnSalvar.prop('disabled', true);

        let formUrl = '';
        if (action === 'novo') {
            console.log('Ação: Novo Fornecedor'); // Debug: Ação Novo
            modalTitle.text('Novo Fornecedor');
            btnSalvar.text('Cadastrar');
            formUrl = '/novo_fornecedor'; // Rota para formulário vazio
        } else if (action === 'editar') {
            modalTitle.text('Editar Fornecedor');
            console.log('Ação: Editar Fornecedor'); // Debug: Ação Editar
            btnSalvar.text('Salvar Alterações');
            formUrl = `/fornecedores/get_form/${publicId}/`; // Rota para formulário com dados
        }

 console.log('Carregando formulário de:', action, 'URL:', formUrl); // Debug: Imprime a URL
        // Requisição AJAX para carregar o conteúdo do formulário
        $.ajax({
            url: formUrl,
            method: 'GET',
            success: function (htmlContent) {
                modalBody.html(htmlContent);
                btnSalvar.prop('disabled', false);

                const form = modalBody.find('#formFornecedorModal');
                // Define a action do formulário (ajustaremos a rota POST no backend depois)
                if (action === 'novo') {
                     form.attr('action', '/novo_fornecedor'); // Rota POST para criar
                } else if (action === 'editar') {
                     form.attr('action', `/fornecedores/${publicId}/salvar`); // Rota POST para editar
                     // Adiciona o public_id como campo oculto no formulário carregado
                     if (form.find('#fornecedor_public_id').length === 0) {
                         form.append('<input type="hidden" id="fornecedor_public_id" name="public_id" value="' + publicId + '">');
                     } else {
                          form.find('#fornecedor_public_id').val(publicId);
                     }
                }

                // TODO: Adicionar lógica JavaScript para o formulário carregado
                // (Ex: toggle de campos no modal de documentos, busca CNPJ dentro do modal, etc.)
                // Pode ser necessário chamar uma função de inicialização aqui.

 console.log('Formulário carregado com sucesso.'); // Debug: Sucesso
 btnSalvar.prop('disabled', false); // Garante que o botão Salvar está habilitado após sucesso
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Erro ao carregar formulário do fornecedor:", textStatus, errorThrown, jqXHR.responseText);
                modalBody.html('<div class="alert alert-danger">Erro ao carregar formulário.</div>');
                btnSalvar.prop('disabled', true);
            }
        });
    });

    // Evento acionado ao fechar o modal
    modalFornecedor.on('hidden.bs.modal', function () {
        // Limpa o conteúdo do corpo do modal
 modalBody.empty(); // Use empty() para limpar o conteúdo
        modalTitle.text('Título do Modal'); // Restaura título padrão
        btnSalvar.text('Salvar'); // Restaura texto do botão
        btnSalvar.prop('disabled', false); // Habilita o botão
    });

    // TODO: Lógica de submissão do formulário do modal via AJAX
    // btnSalvar.on('click', function() { ... }); ou $('#formFornecedorModal').on('submit', function() { ... });
    // Esta lógica deve coletar os dados do formulário `#formFornecedorModal`, incluindo anexos,
    // e enviá-los via AJAX para a rota de salvamento/edição no backend.

});