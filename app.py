import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import requests
from uuid import uuid4
from datetime import date

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'uma_chave_secreta_padrao_e_ruim') # Substitua por uma chave segura em produção
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Cria o diretório de uploads se não existir
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db = SQLAlchemy(app)

# Modelos do banco de dados
class Fornecedor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cnpj = db.Column(db.String(18), unique=True, nullable=False)
    razao_social = db.Column(db.String(255), nullable=False)
    nome_fantasia = db.Column(db.String(255))
    email = db.Column(db.String(255))
    telefone = db.Column(db.String(20))
    endereco = db.Column(db.String(255))
    tipo = db.Column(db.String(50), nullable=False) # 'servico' ou 'material'
    status = db.Column(db.Boolean, default=True, nullable=False) # True para ativo, False para inativo
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))
    documentos = db.relationship('DocumentoFornecedor', backref='fornecedor', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"Fornecedor('{self.nome_fantasia or self.razao_social}', '{self.cnpj}')"

class DocumentoFornecedor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedor.id'), nullable=False)
    codigo_registro = db.Column(db.String(100))
    tem_validade = db.Column(db.Boolean, default=False, nullable=False)
    data_emissao = db.Column(db.Date, nullable=True)
    data_validade = db.Column(db.Date, nullable=True)
    is_certificado_iso = db.Column(db.Boolean, default=False, nullable=False)
    orgao_certificador = db.Column(db.String(255), nullable=True)
    nome_arquivo = db.Column(db.String(255), nullable=False)
    caminho_arquivo = db.Column(db.String(255), nullable=False) # Caminho relativo dentro do UPLOAD_FOLDER
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))

    def __repr__(self):
        return f"Documento('{self.nome_arquivo}', FornecedorID:{self.fornecedor_id})"

    @property
    def url_download(self):
        return url_for('static', filename='uploads/' + self.caminho_arquivo)

class CategoriaProdutoServico(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    tipo = db.Column(db.String(20), nullable=False) # 'produto' ou 'servico'
    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))

    def __repr__(self):
        return f"Categoria('{self.nome}', Tipo: '{self.tipo}')"

# Rotas para Categoria de Produtos e Serviços
@app.route('/categorias', methods=['GET', 'POST'])
def listar_categorias():
 if request.method == 'POST':
    try:
        nome = request.form['nome']
        tipo = request.form['tipo']

        if not nome or not tipo:
            flash('Nome e tipo da categoria são obrigatórios.', 'danger')
            return redirect(url_for('listar_categorias'))

        nova_categoria = CategoriaProdutoServico(nome=nome, tipo=tipo)
        db.session.add(nova_categoria)
        db.session.commit()
        flash('Categoria adicionada com sucesso!', 'success')
        return redirect(url_for('listar_categorias'))
    except Exception as e:
        db.session.rollback()
        flash(f'Erro ao adicionar categoria: {e}', 'danger')
        return redirect(url_for('listar_categorias'))


@app.route('/categorias/get_form/', defaults={'public_id': None}, methods=['GET'])
@app.route('/categorias/get_form/<public_id>/', methods=['GET'])
def get_categoria_form(public_id=None):
    try:
        categoria = None
        if public_id:
            categoria = CategoriaProdutoServico.query.filter_by(public_id=public_id).first_or_404()
            return render_template('_form_categoria_content.html', categoria=categoria)
    except Exception as e:
            print(f"Erro na rota /categorias/get_form/: {e}")
            return redirect(url_for('listar_categorias'))

@app.route('/novo_fornecedor', methods=['GET', 'POST'])
def novo_fornecedor():
 # No método GET, esta rota agora serve o HTML do formulário parcial para ser carregado via AJAX no modal
    if request.method == 'GET':
        return render_template('_form_fornecedor_content.html', fornecedor=None) # Para o caso "novo", passamos None

# O método POST para salvar/editar o fornecedor via modal será tratado em outra rota ou nesta rota refatorada.
@app.route('/listar_fornecedores')
def listar_fornecedores():
    fornecedores = Fornecedor.query.all()
    return render_template('listar_fornecedores.html', fornecedores=fornecedores)

# Nova rota para servir o conteúdo do formulário (para o modal)
@app.route('/fornecedores/get_form/', defaults={'public_id': None}, methods=['GET'])
# Adicionado a barra final na rota com public_id para corresponder ao JavaScript
@app.route('/fornecedores/get_form/<public_id>/', methods=['GET'])
def get_fornecedor_form(public_id=None): # Torna public_id explicitamente opcional
    try:
        print(f"Recebida requisição para /fornecedores/get_form/ com public_id: {public_id}")
        fornecedor = None
        if public_id:
            print(f"Buscando fornecedor com public_id: {public_id}")
            # Busca o fornecedor se um public_id for fornecido (para edição)
            fornecedor = Fornecedor.query.filter_by(public_id=public_id).first_or_404()
            print(f"Fornecedor encontrado: {fornecedor is not None}")

        print(f"Renderizando template _form_fornecedor_content.html. Passando fornecedor: {fornecedor.cnpj if fornecedor else 'None'}")
        # Renderiza o template parcial do formulário, passando o objeto fornecedor (ou None)
        # O template _form_fornecedor_content.html usará o objeto fornecedor para preencher os campos se ele existir.
        return render_template('_form_fornecedor_content.html', fornecedor=fornecedor)
    except Exception as e:
        print(f"Erro na rota /fornecedores/get_form/: {e}")
        return jsonify({'error': f'Erro interno ao carregar formulário: {e}'}), 500

@app.route('/fornecedores/<public_id>/', methods=['GET', 'POST'])
# Rota para visualizar um fornecedor existente (edição agora via modal)
def visualizar_fornecedor(public_id):
    fornecedor = Fornecedor.query.filter_by(public_id=public_id).first_or_404()

    if request.method == 'POST':
        try:
            fornecedor.cnpj = request.form.get('cnpj')
            fornecedor.razao_social = request.form.get('razao_social')
            fornecedor.nome_fantasia = request.form.get('nome_fantasia')
            fornecedor.email = request.form.get('email')
            fornecedor.telefone = request.form.get('telefone')
            fornecedor.endereco = request.form.get('endereco')
            fornecedor.tipo = request.form.get('tipo')
            fornecedor.status = request.form.get('status') == 'on'

            db.session.commit()
            flash('Dados do fornecedor atualizados com sucesso!', 'success')
            return redirect(url_for('visualizar_fornecedor', public_id=fornecedor.public_id))
        except Exception as e:
            db.session.rollback()
            flash(f'Erro ao atualizar fornecedor: {e}', 'danger')

    return render_template('view_fornecedor.html', fornecedor=fornecedor) # Precisamos criar view_fornecedor.html


# Nova rota para adicionar documento a um fornecedor existente via AJAX
@app.route('/fornecedores/<public_id>/adicionar_documento', methods=['POST'])
def adicionar_documento_fornecedor(public_id):
    fornecedor = Fornecedor.query.filter_by(public_id=public_id).first_or_404()

    try:
        codigo_registro = request.form.get('codigo_registro')
        tem_validade = request.form.get('tem_validade') == 'on'
        data_emissao = request.form.get('data_emissao') or None
        data_validade = request.form.get('data_validade') or None
        is_certificado_iso = request.form.get('is_certificado_iso') == 'on'
        orgao_certificador = request.form.get('orgao_certificador')

        arquivo = request.files.get('arquivo')
        if not arquivo:
            return jsonify({'success': False, 'message': 'Nenhum arquivo foi enviado.'}), 400

        nome_arquivo = secure_filename(arquivo.filename)
        caminho_relativo = f"{public_id}/{nome_arquivo}"
        caminho_absoluto = os.path.join(app.config['UPLOAD_FOLDER'], public_id)
        os.makedirs(caminho_absoluto, exist_ok=True)
        arquivo.save(os.path.join(caminho_absoluto, nome_arquivo))

        novo_documento = DocumentoFornecedor(
            fornecedor=fornecedor,
            codigo_registro=codigo_registro,
            tem_validade=tem_validade,
            data_emissao=date.fromisoformat(data_emissao) if data_emissao else None,
            data_validade=date.fromisoformat(data_validade) if data_validade else None,
            is_certificado_iso=is_certificado_iso,
            orgao_certificador=orgao_certificador,
            nome_arquivo=nome_arquivo,
            caminho_arquivo=caminho_relativo
        )

        db.session.add(novo_documento)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Documento adicionado com sucesso!', 'documento': {
            'public_id': novo_documento.public_id,
            'codigo_registro': novo_documento.codigo_registro,
            'nome_arquivo': novo_documento.nome_arquivo
        }})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Erro ao salvar documento: {str(e)}'}), 500

def buscar_cnpj(cnpj):
    try:
        # Remover caracteres não numéricos do CNPJ
        cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
        url = f'https://brasilapi.com.br/api/cnpj/v1/{cnpj_limpo}'
        response = requests.get(url)

        response.raise_for_status() # Lança exceção para status de erro (4xx ou 5xx)
        data = response.json()

        # Mapear os dados da API para os campos do formulário
        fornecedor_data = {
            'cnpj': data.get('cnpj'),
            'razao_social': data.get('razao_social'),
            'nome_fantasia': data.get('nome_fantasia'),
            'email': data.get('email'), # A BrasilAPI v1 não tem email/telefone no endpoint CNPJ
            'telefone': data.get('telefone'), # Pode ser necessário buscar em outro endpoint ou adicionar manualmente
            'endereco': f"{data.get('logradouro', '')}, {data.get('numero', '')} - {data.get('bairro', '')}, {data.get('municipio', '')} - {data.get('uf', '')} CEP: {data.get('cep', '')}".strip(' ,-'),
        }
        return jsonify(fornecedor_data)

    except requests.exceptions.RequestException as e:
        print(f"Erro na requisição à BrasilAPI: {e}")
        return jsonify({'error': f'Erro ao buscar dados do CNPJ: {e}'}), 500
    except Exception as e:
        print(f"Erro inesperado: {e}")
        return jsonify({'error': f'Erro inesperado ao processar CNPJ: {e}'}), 500

# Rotas placeholder para documentos (serão implementadas completamente depois)
@app.route('/documentos/<public_id>/editar', methods=['POST'])
def editar_documento(public_id):
    # Lógica para editar documento
    print(f"Método POST recebido em /documentos/{public_id}/editar")
    return jsonify({'message': 'Lógica de edição de documento aqui'}), 200

def excluir_documento(public_id):
    """Função para excluir um documento de fornecedor."""
    try:
        documento = DocumentoFornecedor.query.filter_by(public_id=public_id).first_or_404()
        
        # Excluir arquivo físico
        caminho_absoluto = os.path.join(app.config['UPLOAD_FOLDER'], documento.caminho_arquivo)
        try:
            if os.path.exists(caminho_absoluto):
                os.remove(caminho_absoluto)
        except FileNotFoundError:
            # Ignora se o arquivo já não existir
            pass
            
        # Excluir registro do banco de dados
        db.session.delete(documento)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Documento excluído com sucesso!'})
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': f'Erro ao excluir documento: {str(e)}'}), 500


@app.route('/documentos/<public_id>/download', methods=['GET'])
def download_documento(public_id):
     pass # Lógica de download aqui

@app.route('/')
def index():
    return render_template('index.html') # Assumindo que você tem um index.html

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)