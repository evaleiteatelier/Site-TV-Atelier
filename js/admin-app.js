// admin-app.js

const fileInput = document.getElementById('media-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const btnUpload = document.getElementById('btn-upload');
const mediaGrid = document.getElementById('media-grid');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Trata mudança de arquivo
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        btnUpload.disabled = false;
    } else {
        fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        btnUpload.disabled = true;
    }
});

// Busca e exibe a galeria atual
async function fetchGallery() {
    const { data, error } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        alert('Erro ao buscar mídias: ' + error.message);
        return;
    }

    renderGallery(data || []);
}

function renderGallery(items) {
    mediaGrid.innerHTML = '';
    
    if(items.length === 0) {
        mediaGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhuma mídia cadastrada ainda.</p>';
        return;
    }

    items.forEach(item => {
        const isVideo = item.type === 'video';
        
        const card = document.createElement('div');
        card.className = 'media-card';
        
        let previewHtml = isVideo 
            ? `<video src="${item.url}" class="media-preview" muted></video>`
            : `<img src="${item.url}" class="media-preview" alt="Preview">`;

        card.innerHTML = `
            ${previewHtml}
            <div class="media-actions">
                <span class="media-type">${item.type}</span>
                <button class="btn-danger" onclick="deleteMedia('${item.id}', '${item.file_path}')">Remover</button>
            </div>
        `;
        mediaGrid.appendChild(card);
    });
}

function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Upload do arquivo
btnUpload.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    showLoading('Fazendo upload do arquivo...');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    try {
        // 1. Upload pro Storage Bucket
        const { error: uploadError } = await supabase.storage
            .from('media_bucket')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Pegar URL Pública
        const { data: { publicUrl } } = supabase.storage
            .from('media_bucket')
            .getPublicUrl(filePath);

        showLoading('Salvando no banco de dados...');

        // 3. Salvar no banco
        const isVideo = file.type.startsWith('video');
        const { error: dbError } = await supabase
            .from('media')
            .insert([
                { 
                    url: publicUrl, 
                    file_path: filePath, 
                    type: isVideo ? 'video' : 'image' 
                }
            ]);

        if (dbError) throw dbError;

        // Sucesso!
        alert('Mídia adicionada com sucesso! A TV irá atualizar automaticamente.');
        
        // Reset do form
        fileInput.value = '';
        fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        btnUpload.disabled = true;
        
        // Atualiza galeria
        fetchGallery();

    } catch (error) {
        console.error('Erro completo:', error);
        alert('Erro ao fazer upload: ' + error.message);
    } finally {
        hideLoading();
    }
});

// Remover mídia (Storage + Banco)
window.deleteMedia = async (id, filePath) => {
    if (!confirm('Tem certeza que deseja remover esta mídia? A TV deixará de exibi-la imediatamente.')) {
        return;
    }

    showLoading('Removendo arquivo...');

    try {
        // 1. Deletar do banco primeiro (assim some da TV logo)
        const { error: dbError } = await supabase
            .from('media')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        // 2. Deletar arquivo do Storage
        if (filePath) {
            const { error: storageError } = await supabase.storage
                .from('media_bucket')
                .remove([filePath]);
                
            if (storageError) console.error('Aviso: Erro ao deletar do storage:', storageError);
        }

        fetchGallery();

    } catch (error) {
        console.error(error);
        alert('Erro ao excluir: ' + error.message);
    } finally {
        hideLoading();
    }
};

// Iniciar pegando as mídias atuais
fetchGallery();
