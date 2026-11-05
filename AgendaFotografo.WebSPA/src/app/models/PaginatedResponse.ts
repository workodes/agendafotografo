export class PaginatedResponse<T> {
    TotalCount: number;
    Page: number;
    PageSize: number;
    Data: T[];
  }
  