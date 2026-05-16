// tv-app.js

const mediaContainer = document.getElementById('media-container');
const loadingScreen = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');

let mediaItems = [];
let currentIndex = -1;
let currentTimer = null;

// Configuração de tempo para imagens (10 segundos)
const IMAGE_DURATION = 10000; 

// Função para buscar as mídias do Supabase
async function fetchMedia() {
    const { data, error } = await supabaseClient
        .from('media')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar mídias:', error);
        return;
    }

    mediaItems = data || [];
    renderMediaElements();
}

// Renderiza os elementos no DOM mas mantém escondidos
function renderMediaElements() {
    // Para evitar problemas visuais, só limpamos quando recriamos.
    mediaContainer.innerHTML = ''; 

    if (mediaItems.length === 0) {
        emptyState.classList.add('active');
        loadingScreen.classList.add('hidden');
        if(currentTimer) clearTimeout(currentTimer);
        return;
    }

    emptyState.classList.remove('active');

    mediaItems.forEach((media, index) => {
        let el;
        if (media.type === 'video') {
            el = document.createElement('video');
            el.src = media.url;
            el.muted = true; // Vídeos na TV auto-play geralmente precisam ser mutados ou podem ter áudio se permitido, mas mutado é mais seguro para autoplay.
            el.loop = false; // Queremos saber quando termina
            el.classList.add('media-item');
            el.dataset.index = index;
            
            // Quando o vídeo terminar, pula pro próximo
            el.addEventListener('ended', () => {
                showNextMedia();
            });

        } else {
            el = document.createElement('img');
            el.src = media.url;
            el.classList.add('media-item');
            el.dataset.index = index;
        }
        mediaContainer.appendChild(el);
    });

    loadingScreen.classList.add('hidden');

    // Inicia o carrossel se não estiver rodando
    if(currentIndex === -1 || currentIndex >= mediaItems.length) {
        currentIndex = -1;
        showNextMedia();
    }
}

// Lógica de transição
function showNextMedia() {
    if (mediaItems.length === 0) return;

    // Limpa qualquer timer de imagem anterior
    if (currentTimer) {
        clearTimeout(currentTimer);
    }

    const previousIndex = currentIndex;
    currentIndex = (currentIndex + 1) % mediaItems.length;

    const elements = document.querySelectorAll('.media-item');
    
    if (previousIndex >= 0 && previousIndex < elements.length) {
        elements[previousIndex].classList.remove('active');
        // Se era vídeo, pausa e reseta
        if(elements[previousIndex].tagName === 'VIDEO') {
            elements[previousIndex].pause();
            elements[previousIndex].currentTime = 0;
        }
    }

    const currentEl = elements[currentIndex];
    currentEl.classList.add('active');

    if (currentEl.tagName === 'VIDEO') {
        currentEl.play().catch(e => {
            console.error("Erro ao dar autoplay no vídeo:", e);
            // Fallback se vídeo falhar: pula pro próximo após 3 segundos
            currentTimer = setTimeout(showNextMedia, 3000);
        });
    } else {
        // Se for imagem, espera o tempo configurado
        currentTimer = setTimeout(showNextMedia, IMAGE_DURATION);
    }
}

// Configura evento de Realtime para atualizar a TV automaticamente
function subscribeToChanges() {
    supabaseClient
      .channel('media-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, payload => {
          console.log('Mudança detectada no banco!', payload);
          // Busca novamente e atualiza a tela
          fetchMedia();
      })
      .subscribe();
}

// Sistema Anti-Pausa: Dá um ping no banco ao carregar
async function pingDatabase() {
    try {
        const { error } = await supabaseClient
            .from('keep_alive')
            .update({ last_ping: new Date().toISOString() })
            .eq('id', 1);
            
        if(error) throw error;
        console.log("Ping enviado com sucesso. Projeto mantido ativo.");
    } catch (e) {
        console.error("Aviso: Falha no keep-alive. Verifique a tabela keep_alive.", e);
    }
}

// Inicialização
async function init() {
    await fetchMedia();
    subscribeToChanges();
    pingDatabase();
    
    // Envia um ping a cada 12 horas só por garantia se a TV ficar ligada direto
    setInterval(pingDatabase, 12 * 60 * 60 * 1000);
}

init();
