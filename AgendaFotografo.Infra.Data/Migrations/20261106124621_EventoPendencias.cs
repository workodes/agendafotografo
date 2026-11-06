using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class EventoPendencias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EVENTOPENDENCIAS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVP_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVP_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVP_TITULO = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVP_CATEGORIA = table.Column<int>(type: "int", nullable: false),
                    EVP_PRIORIDADE = table.Column<int>(type: "int", nullable: false),
                    EVP_STATUS = table.Column<int>(type: "int", nullable: false),
                    EVP_MEMBRO_ID = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    EVP_PRAZO = table.Column<DateOnly>(type: "date", nullable: true),
                    EVP_OBSERVACOES = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOPENDENCIAS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOPENDENCIAS_ASSINANTES_EVP_ASSINANTE_ID",
                        column: x => x.EVP_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOPENDENCIAS_EVENTOS_EVP_EVENTO_ID",
                        column: x => x.EVP_EVENTO_ID,
                        principalTable: "EVENTOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOPENDENCIAS_MEMBROS_EVP_MEMBRO_ID",
                        column: x => x.EVP_MEMBRO_ID,
                        principalTable: "MEMBROS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_ASSINANTE_ID_EVP_STATUS_EVP_PRAZO",
                table: "EVENTOPENDENCIAS",
                columns: new[] { "EVP_ASSINANTE_ID", "EVP_STATUS", "EVP_PRAZO" });

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_EVENTO_ID",
                table: "EVENTOPENDENCIAS",
                column: "EVP_EVENTO_ID");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_MEMBRO_ID",
                table: "EVENTOPENDENCIAS",
                column: "EVP_MEMBRO_ID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EVENTOPENDENCIAS");
        }
    }
}
