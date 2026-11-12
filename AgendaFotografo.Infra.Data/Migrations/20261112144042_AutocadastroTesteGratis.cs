using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class AutocadastroTesteGratis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ASS_ORIGEM",
                table: "ASSINANTES",
                type: "int",
                nullable: false,
                // Os assinantes que já existem ficam com origem Admin (1)
                defaultValue: 1);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ASS_TESTE_ATE",
                table: "ASSINANTES",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ASS_ORIGEM",
                table: "ASSINANTES");

            migrationBuilder.DropColumn(
                name: "ASS_TESTE_ATE",
                table: "ASSINANTES");
        }
    }
}
