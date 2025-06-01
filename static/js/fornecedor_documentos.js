function initializeFornecedorDocumentos() {
    // Variável global para armazenar o ID do documento sendo editado (se necessário persistir no frontend)
    // Em uma aplicação maior, isto seria melhor gerenciado de outra forma.
    let editingDocumentId = null;

    // Referências aos elementos do modal de documentos (certifique-se de que o modal está no DOM quando esta função é chamada)
    const modalDocumento = $('#modalGerenciarDocumento');
    const docTemValidadeCheckbox = modalDocumento.find('#doc_tem_validade');
    const camposValidadeDiv = modalDocumento.find('#campos_validade');
    const docIsCertificadoIsoCheckbox = modalDocumento.find('#doc_is_certificado_iso');
    const campoOrgaoCertificadorDiv = modalDocumento.find('#campo_orgao_certificador');
    const docDataEmissaoInput = modalDocumento.find('#doc_data_emissao');
    const docDataValidadeInput = modalDocumento.find('#doc_data_validade');
    const docOrgaoCertificadorInput = modalDocumento.find('#doc_orgao_certificador');
    const docArquivoInput = modalDocumento.find('#doc_arquivo');
    const btnSalvarDocumento = modalDocumento.find('#btnSalvarDocumento');
    const listaDocumentosBody = $('#listaDocumentosBody'); // Assume que esta tabela está no formulário do fornecedor

    // Referência ao botão Adicionar Documento dentro do formulário do fornecedor
    const btnAdicionarDocumento = $('#btnAdicionarDocumento');


    // Funções para controlar a visibilidade dos campos condicionais no modal de documentos
    function toggleCamposValidade() {
        const checked = docTemValidadeCheckbox.is(':checked');
        camposValidadeDiv.toggle(checked); // Usa toggle do jQuery
        docDataEmissaoInput.prop('required', checked);
        docDataValidadeInput.prop('required', checked);
    }

    function toggleCampoOrgaoCertificador() {
         const checked = docIsCertificadoIsoCheckbox.is(':checked');
         campoOrgaoCertificadorDiv.toggle(checked); // Usa toggle do jQuery
         docOrgaoCertificadorInput.prop('required', checked);
    }

    // Event listeners para as checkboxes dentro do modal de documentos
    docTemValidadeCheckbox.on('change', toggleCamposValidade);
    docIsCertificadoIsoCheckbox.on('change', toggleCampoOrgaoCertificador);

    // Lógica para obrigar campos se for certificado ISO
    docIsCertificadoIsoCheckbox.on('change', function() {
        if ($(this).is(':checked')) {
            // Se for ISO, tem validade é obrigatório e marcado
            docTemValidadeCheckbox.prop('checked', true);
            docTemValidadeCheckbox.prop('disabled', true); // Impede desmarcar
            toggleCamposValidade(); // Mostra campos de data
             docDataEmissaoInput.prop('required', true);
             docDataValidadeInput.prop('required', true);
             docOrgaoCertificadorInput.prop('required', true);
        } else {
            docTemValidadeCheckbox.prop('disabled', false); // Habilita de volta
            // Reverte para o estado baseado apenas em docTemValidadeCheckbox
            toggleCamposValidade();
             docDataEmissaoInput.prop('required', docTemValidadeCheckbox.is(':checked'));
             docDataValidadeInput.prop('required', docTemValidadeCheckbox.is(':checked'));
             docOrgaoCertificadorInput.prop('required', false);
        }
         toggleCampoOrgaoCertificador(); // Mostra/Esconde órgão certificador
    });

    // Inicializa a visibilidade dos campos condicionais ao abrir o modal de documento pela primeira vez
    // ou resetar o formulário. Chamado também no hidden.bs.modal.
    function resetDocumentoModalUI() {
         toggleCamposValidade();
         toggleCampoOrgaoCertificador();
         docTemValidadeCheckbox.prop('disabled', false);
         docArquivoInput.prop('required', true); // Arquivo obrigatório para adição
    }


    // Limpa o modal de documento ao fechar
    modalDocumento.on('hidden.bs.modal', function () {
        $(this).find('form')[0].reset(); // Reseta o formulário dentro do modal
        editingDocumentId = null; // Limpa o ID de edição
        modalDocumento.find('.modal-title').text('Adicionar/Editar Documento'); // Restaura o título
        btnSalvarDocumento.text('Adicionar'); // Restaura o texto do botão

        resetDocumentoModalUI(); // Reseta a UI dos campos condicionais e obrigatoriedade
    });

     // Evento ao clicar no botão Adicionar Documento (dentro do formulário do fornecedor)
     // Usa delegation caso o botão seja adicionado dinamicamente ao DOM
     $(document).on('click', '#btnAdicionarDocumentoModal', function() {
         editingDocumentId = null; // Garante que estamos adicionando um novo
         modalDocumento.find('.modal-title').text('Adicionar Documento');
         btnSalvarDocumento.text('Adicionar');
         docArquivoInput.prop('required', true); // Arquivo é obrigatório ao adicionar

         // Abre o modal de documento
         modalDocumento.modal('show');
     });


     // TODO: Lógica de submissão do formulário do modal de documento via AJAX
     btnSalvarDocumento.on('click', function() {
         const formDocumento = modalDocumento.find('#formDocumento');
         const formData = new FormData(formDocumento[0]);

         console.log('Conteúdo do FormData antes de enviar:');
         for (let pair of formData.entries()) {
             console.log(pair[0]+ ', ' + pair[1]);
         }
         console.log('Fim do Conteúdo do FormData');

         // TODO: Validar campos do modal antes de prosseguir (especialmente se ISO)

         // Recuperar o public_id do fornecedor do formulário principal no modal (se estivermos editando um fornecedor)
         // Ou gerenciar documentos temporariamente no frontend se for um novo fornecedor
         const fornecedorPublicId = $('#formFornecedorModal #fornecedor_public_id').val();

         // Adicionar o public_id do fornecedor ao formData (necessário para associar no backend)
         if (fornecedorPublicId) {
             formData.append('fornecedor_public_id', fornecedorPublicId);
         } else {
             // TODO: Lógica para gerenciar documentos de um NOVO fornecedor no frontend
             // Antes de enviar o formulário principal, você precisará coletar esses documentos temporários.
             console.warn("Adicionando documento a um fornecedor que ainda não tem ID (novo). Lógica de frontend necessária.");
             alert("Funcionalidade de adicionar documento a novo fornecedor ainda não implementada (salvamento no frontend).");
             return; // Impede a submissão por enquanto para novos fornecedores
         }


         let submitUrl = '';
         let method = '';

         if (editingDocumentId) {
             // Lógica de edição (enviar para a rota de edição de documento)
             submitUrl = `/documentos/${editingDocumentId}/editar`; // TODO: Definir esta rota no backend
             method = 'POST'; // Ou PUT/PATCH se preferir RESTful
             formData.append('_method', 'PUT'); // Simula PUT/PATCH se o Flask não suportar diretamente via POST

         } else {
             // Lógica de adição (enviar para a rota de adicionar documento)
             submitUrl = `/fornecedores/${fornecedorPublicId}/adicionar_documento`; // TODO: Definir esta rota no backend
             method = 'POST';
         }

         // Desabilita o botão salvar enquanto envia
         btnSalvarDocumento.prop('disabled', true).text('Salvando...');


         $.ajax({
             url: submitUrl,
             method: method === 'PUT' ? 'POST' : method, // Use POST para PUT/PATCH simulado
             data: formData,
             processData: false, // Importante para enviar FormData
             contentType: false, // Importante para enviar FormData
             dataType: 'json', // Espera resposta JSON do backend
             success: function(response) {
                 if (response.success) {
                     // TODO: Atualizar a linha na tabela de documentos (editar)
                     // TODO: Adicionar uma nova linha na tabela de documentos (adicionar)
                     // A resposta do backend deve retornar os dados do documento salvo, incluindo ID e URLs.

                     alert(response.message); // Feedback visual de sucesso
                     modalDocumento.modal('hide'); // Fecha o modal de documento

                     // TODO: Atualizar a lista de documentos na tabela do formulário principal
                     // Uma forma simples por agora é recarregar a página (mas não ideal)
                     // location.reload();
                     console.log("Documento salvo/editado:", response.documento);
                     // Aqui você atualizaria a tabela de documentos no modal principal

                 } else {
                     alert('Erro ao salvar documento: ' + (response.message || 'Erro desconhecido'));
                     console.error("Erro do backend:", response);
                 }
             },
             error: function(jqXHR, textStatus, errorThrown) {
                  console.error("Erro AJAX ao salvar documento:", textStatus, errorThrown, jqXHR.responseText);
                  let errorMsg = "Erro de comunicação ao salvar documento.";
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
                 alert('Erro ao salvar documento: ' + errorMsg);
             },
             complete: function() {
                 // Restaura o botão
                 btnSalvarDocumento.prop('disabled', false).text(editingDocumentId ? 'Salvar Alterações' : 'Adicionar');
             }
         });
     });

     

     // TODO: Lógica para abrir o modal de documento e preencher ao clicar em "Editar" na tabela de documentos
     // Isso usará delegation de evento na listaDocumentosBody
     $(document).on('click', '.btn-editar-documento', function() {
          editingDocumentId = $(this).data('id'); // Assume que o data-id contém o public_id do documento
          const row = $(this).closest('tr');

          // TODO: Fetch dos dados do documento do backend para preencher o modal
          // fetch(`/documentos/${editingDocumentId}/dados_json`) // Exemplo de rota
          // .then(response => response.json())
          // .then(data => {
                 // Preencher campos do modal com data.documento
                 // modalDocumento.find('#doc_codigo_registro').val(data.documento.codigo_registro);
                 // ... preencher outros campos ...
                 // docTemValidadeCheckbox.prop('checked', data.documento.tem_validade).trigger('change'); // Trigger change para atualizar UI
                 // docIsCertificadoIsoCheckbox.prop('checked', data.documento.is_certificado_iso).trigger('change'); // Trigger change para atualizar UI

                 // Note: Campo de arquivo (input type="file") NÃO pode ser preenchido por JS por segurança.
                 // O usuário terá que selecionar o arquivo novamente na edição, ou você pode
                 // adicionar uma mensagem mostrando o nome do arquivo atual e tornar o input file opcional na edição.

                 modalDocumento.find('.modal-title').text('Editar Documento');
                 btnSalvarDocumento.text('Salvar Alterações');
                 docArquivoInput.prop('required', false); // Arquivo não é obrigatório na edição por padrão

                 modalDocumento.modal('show'); // Abre o modal
          // })
          // .catch(error => console.error("Erro ao carregar dados do documento para edição:", error));

          // Por enquanto, preencher manualmente com dados da linha para demonstração (NÃO use em produção)
          const cols = row.find('td');
          modalDocumento.find('#doc_codigo_registro').val(cols.eq(0).text());
          // cols.eq(1).text() é o nome do arquivo, não preenche input file
          const temValidade = cols.eq(2).text() === 'Sim';
          modalDocumento.find('#doc_tem_validade').prop('checked', temValidade).trigger('change');
          if (temValidade) {
              // TODO: Converter formato de data (dd/mm/yyyy) para yyyy-mm-dd para preencher input type="date"
              // Isso exigirá lógica de parsing de data
              // modalDocumento.find('#doc_data_emissao').val(formatarDataParaInput(cols.eq(3).text()));
              // modalDocumento.find('#doc_data_validade').val(formatarDataParaInput(cols.eq(4).text()));
          }
          const isCertificadoIso = cols.eq(5).text() === 'Sim';
          modalDocumento.find('#doc_is_certificado_iso').prop('checked', isCertificadoIso).trigger('change');
          if (isCertificadoIso) {
              modalDocumento.find('#doc_orgao_certificador').val(cols.eq(6).text());
          }
           docArquivoInput.prop('required', false); // Arquivo não é obrigatório na edição por padrão
           modalDocumento.modal('show');
     });


     // Lógica para exclusão de documento (delegation)
     $(document).on('click', '.btn-excluir-documento', function() {
         const documentPublicId = $(this).data('public-id');// Assume data-id tem o public_id
         const row = $(this).closest('tr');
         const documentoNome = row.find('td:eq(1)').text(); // Nome do arquivo ou código

         if (confirm(`Tem certeza que deseja excluir o documento "${documentoNome}"?`)) {
    $.ajax({
        url: `/documentos/${documentPublicId}/excluir`,
        method: 'POST',
        success: function (response) {
            if (response.success) {
                row.remove();
                if ($('#listaDocumentosBodyModal').children().length === 0) {
                    $('#listaDocumentosBodyModal').html('<tr><td colspan="8" class="text-center text-muted">Nenhum documento anexado ainda.</td></tr>');
                }
                alert(response.message || 'Documento excluído com sucesso!');
            } else {
                alert('Erro ao excluir documento: ' + (response.message || 'Erro desconhecido'));
            }
        },
        error: function () {
            alert('Erro de comunicação ao excluir documento.');
        }
    });
}

     });

     // TODO: Função para formatar data de dd/mm/yyyy para yyyy-mm-dd para preencher input type="date" na edição
     // function formatarDataParaInput(dataString) { ... }


    // Esta função pode ser chamada depois que o formulário do fornecedor for carregado no modal principal
    // para re-inicializar os listeners e UI do modal de documentos.
    console.log("initializeFornecedorDocumentos executada.");
}

// A função initializeFornecedorDocumentos será chamada do script que carrega o formulário
// no modal principal (fornecedor_modal.js).