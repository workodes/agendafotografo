using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class Planos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ASS_PLANO_ID",
                table: "ASSINANTES",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "PLANOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    PLA_NOME = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PLA_VALOR = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    PLA_RECORRENCIA = table.Column<int>(type: "int", nullable: false),
                    PLA_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    PLA_MOSTRAR_LANDING = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    PLA_DESCRICAO = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PLA_ORDEM = table.Column<int>(type: "int", nullable: false),
                    PLA_DESTAQUE = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PLANOS", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PLANOMODULOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    PLM_PLANO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    PLM_MODULO = table.Column<int>(type: "int", nullable: false),
                    PLM_TEXTO_LANDING = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PLANOMODULOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PLANOMODULOS_PLANOS_PLM_PLANO_ID",
                        column: x => x.PLM_PLANO_ID,
                        principalTable: "PLANOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ASSINANTES_ASS_PLANO_ID",
                table: "ASSINANTES",
                column: "ASS_PLANO_ID");

            migrationBuilder.CreateIndex(
                name: "IX_PLANOMODULOS_PLM_PLANO_ID_PLM_MODULO",
                table: "PLANOMODULOS",
                columns: new[] { "PLM_PLANO_ID", "PLM_MODULO" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PLANOS_PLA_NOME",
                table: "PLANOS",
                column: "PLA_NOME");

            migrationBuilder.AddForeignKey(
                name: "FK_ASSINANTES_PLANOS_ASS_PLANO_ID",
                table: "ASSINANTES",
                column: "ASS_PLANO_ID",
                principalTable: "PLANOS",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ASSINANTES_PLANOS_ASS_PLANO_ID",
                table: "ASSINANTES");

            migrationBuilder.DropTable(
                name: "PLANOMODULOS");

            migrationBuilder.DropTable(
                name: "PLANOS");

            migrationBuilder.DropIndex(
                name: "IX_ASSINANTES_ASS_PLANO_ID",
                table: "ASSINANTES");

            migrationBuilder.DropColumn(
                name: "ASS_PLANO_ID",
                table: "ASSINANTES");
        }
    }
}
