namespace AgendaFotografo.WebApi.Models;

public class PaginatedResponse<T>
{
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IEnumerable<T> Data { get; set; } = [];
}
