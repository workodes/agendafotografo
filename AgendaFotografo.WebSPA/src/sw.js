// Service worker mínimo: só torna o app instalável. NÃO guarda nada em cache (dados e telas vêm sempre da rede),
// então nunca serve versão velha do sistema nem resposta antiga da API.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passa direto para a rede */ });
