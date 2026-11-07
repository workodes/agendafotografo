import { Injectable } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';

// Textos de acessibilidade do calendário em pt-BR.
@Injectable()
export class DatepickerIntlPtBr extends MatDatepickerIntl {
    override calendarLabel = 'Calendário';
    override openCalendarLabel = 'Abrir calendário';
    override closeCalendarLabel = 'Fechar calendário';
    override prevMonthLabel = 'Mês anterior';
    override nextMonthLabel = 'Próximo mês';
    override prevYearLabel = 'Ano anterior';
    override nextYearLabel = 'Próximo ano';
    override prevMultiYearLabel = '24 anos anteriores';
    override nextMultiYearLabel = 'Próximos 24 anos';
    override switchToMonthViewLabel = 'Escolher data';
    override switchToMultiYearViewLabel = 'Escolher mês e ano';
}
