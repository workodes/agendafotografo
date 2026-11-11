// URLs da API. Todo endpoint novo entra aqui E no outro arquivo de environment, com a mesma chave.
// SPA servida pela própria API (wwwroot, com fallback para o index.html): mesma origem, URL relativa.
const baseUrl = '/api';

export const environment = {
    production: true,
    urlApi: `${baseUrl}/`,

    Auth: {
        login: `${baseUrl}/Auth/Login`,
        alterarSenha: `${baseUrl}/Auth/AlterarSenha`,
    },

    Assinante: {
        listar: `${baseUrl}/Assinante/Listar`,
        obter: `${baseUrl}/Assinante/Obter`,
        criar: `${baseUrl}/Assinante/Criar`,
        atualizar: `${baseUrl}/Assinante/Atualizar`,
        inativar: `${baseUrl}/Assinante/Inativar`,
        ativar: `${baseUrl}/Assinante/Ativar`,
        redefinirAcesso: `${baseUrl}/Assinante/RedefinirAcesso`,
    },

    Membro: {
        listar: `${baseUrl}/Membro/Listar`,
        obter: `${baseUrl}/Membro/Obter`,
        criar: `${baseUrl}/Membro/Criar`,
        atualizar: `${baseUrl}/Membro/Atualizar`,
        inativar: `${baseUrl}/Membro/Inativar`,
        ativar: `${baseUrl}/Membro/Ativar`,
        opcoes: `${baseUrl}/Membro/Opcoes`,
    },

    Organizador: {
        listar: `${baseUrl}/Organizador/Listar`,
        obter: `${baseUrl}/Organizador/Obter`,
        criar: `${baseUrl}/Organizador/Criar`,
        atualizar: `${baseUrl}/Organizador/Atualizar`,
        inativar: `${baseUrl}/Organizador/Inativar`,
        ativar: `${baseUrl}/Organizador/Ativar`,
        opcoes: `${baseUrl}/Organizador/Opcoes`,
    },

    TipoEvento: {
        listar: `${baseUrl}/TipoEvento/Listar`,
        obter: `${baseUrl}/TipoEvento/Obter`,
        criar: `${baseUrl}/TipoEvento/Criar`,
        atualizar: `${baseUrl}/TipoEvento/Atualizar`,
        inativar: `${baseUrl}/TipoEvento/Inativar`,
        ativar: `${baseUrl}/TipoEvento/Ativar`,
        opcoes: `${baseUrl}/TipoEvento/Opcoes`,
    },

    PendenciaModelo: {
        listar: `${baseUrl}/PendenciaModelo/Listar`,
        obter: `${baseUrl}/PendenciaModelo/Obter`,
        criar: `${baseUrl}/PendenciaModelo/Criar`,
        atualizar: `${baseUrl}/PendenciaModelo/Atualizar`,
        inativar: `${baseUrl}/PendenciaModelo/Inativar`,
        ativar: `${baseUrl}/PendenciaModelo/Ativar`,
    },

    Evento: {
        listar: `${baseUrl}/Evento/Listar`,
        obter: `${baseUrl}/Evento/Obter`,
        criar: `${baseUrl}/Evento/Criar`,
        atualizar: `${baseUrl}/Evento/Atualizar`,
        excluir: `${baseUrl}/Evento/Excluir`,
        membros: `${baseUrl}/Evento/Membros`,
        opcoesEscala: `${baseUrl}/Evento/OpcoesEscala`,
        adicionarMembro: `${baseUrl}/Evento/AdicionarMembro`,
        atualizarMembro: `${baseUrl}/Evento/AtualizarMembro`,
        removerMembro: `${baseUrl}/Evento/RemoverMembro`,
        dia: `${baseUrl}/Evento/Dia`,
        agenda: `${baseUrl}/Evento/Agenda`,
        cidades: `${baseUrl}/Evento/Cidades`,
        enviarArquivo: `${baseUrl}/Evento/EnviarArquivo`,
        baixarArquivo: `${baseUrl}/Evento/BaixarArquivo`,
        excluirArquivo: `${baseUrl}/Evento/ExcluirArquivo`,
        link: `${baseUrl}/Evento/Link`,
        atualizarLink: `${baseUrl}/Evento/AtualizarLink`,
        regerarCodigoLink: `${baseUrl}/Evento/RegerarCodigoLink`,
        regerarLink: `${baseUrl}/Evento/RegerarLink`,
        pendencias: `${baseUrl}/Evento/Pendencias`,
        listarPendencias: `${baseUrl}/Evento/ListarPendencias`,
        contarPendencias: `${baseUrl}/Evento/ContarPendencias`,
        adicionarPendencia: `${baseUrl}/Evento/AdicionarPendencia`,
        atualizarPendencia: `${baseUrl}/Evento/AtualizarPendencia`,
        atualizarStatusPendencia: `${baseUrl}/Evento/AtualizarStatusPendencia`,
        excluirPendencia: `${baseUrl}/Evento/ExcluirPendencia`,
        aplicarChecklist: `${baseUrl}/Evento/AplicarChecklist`,
    },

    LinkPublico: {
        acessar: `${baseUrl}/LinkPublico/Acessar`,
        evento: `${baseUrl}/LinkPublico/Evento`,
        arquivo: `${baseUrl}/LinkPublico/Arquivo`,
    },

    Aviso: {
        listar: `${baseUrl}/Aviso/Listar`,
    },
    Dashboard: {
        resumo: `${baseUrl}/Dashboard/Resumo`,
    },
    Local: {
        buscar: `${baseUrl}/Local/Buscar`,
    },
    Chat: {
        status: `${baseUrl}/Chat/Status`,
        enviar: `${baseUrl}/Chat/Enviar`,
    },
};
