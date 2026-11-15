namespace AgendaFotografo.CrossCutting.Services.Mail;

/// <summary>E-mail na fila de envio em segundo plano. <c>Tipo</c> e <c>UsuarioId</c> servem só para o log (nunca o conteúdo).</summary>
public record EmailMensagem(string Para, string? NomePara, string Assunto, string Html, string? Texto, string Tipo, string? UsuarioId);
