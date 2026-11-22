using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class PerfilFotografo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ASS_TIPO",
                table: "ASSINANTES",
                type: "int",
                nullable: false,
                // Assinantes já existentes são coordenadores (ASS_TIPO = 1); o gerado seria 0, valor fora do enum
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "EVENTOSPESSOAIS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EPS_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EPS_NOME = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EPS_DATA = table.Column<DateOnly>(type: "date", nullable: false),
                    EPS_HORA = table.Column<TimeOnly>(type: "time", nullable: true),
                    EPS_CIDADE = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EPS_LOCAL = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EPS_STATUS = table.Column<int>(type: "int", nullable: false),
                    EPS_LINK = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EPS_OBSERVACOES = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOSPESSOAIS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOSPESSOAIS_ASSINANTES_EPS_ASSINANTE_ID",
                        column: x => x.EPS_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOSPESSOAIS_EPS_ASSINANTE_ID_EPS_DATA",
                table: "EVENTOSPESSOAIS",
                columns: new[] { "EPS_ASSINANTE_ID", "EPS_DATA" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EVENTOSPESSOAIS");

            migrationBuilder.DropColumn(
                name: "ASS_TIPO",
                table: "ASSINANTES");
        }
    }
}
