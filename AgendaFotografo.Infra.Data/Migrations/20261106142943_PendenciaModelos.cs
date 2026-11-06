using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class PendenciaModelos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "PENDENCIAMODELOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    PEM_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    PEM_TITULO = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PEM_CATEGORIA = table.Column<int>(type: "int", nullable: false),
                    PEM_PRIORIDADE = table.Column<int>(type: "int", nullable: false),
                    PEM_DIAS_ANTES = table.Column<int>(type: "int", nullable: true),
                    PEM_TIPO_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    PEM_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PENDENCIAMODELOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PENDENCIAMODELOS_ASSINANTES_PEM_ASSINANTE_ID",
                        column: x => x.PEM_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PENDENCIAMODELOS_TIPOSEVENTO_PEM_TIPO_EVENTO_ID",
                        column: x => x.PEM_TIPO_EVENTO_ID,
                        principalTable: "TIPOSEVENTO",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_EVENTO_ID_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS",
                columns: new[] { "EVP_EVENTO_ID", "EVP_MODELO_ID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS",
                column: "EVP_MODELO_ID");

            migrationBuilder.CreateIndex(
                name: "IX_PENDENCIAMODELOS_PEM_ASSINANTE_ID_PEM_ATIVO",
                table: "PENDENCIAMODELOS",
                columns: new[] { "PEM_ASSINANTE_ID", "PEM_ATIVO" });

            migrationBuilder.CreateIndex(
                name: "IX_PENDENCIAMODELOS_PEM_TIPO_EVENTO_ID",
                table: "PENDENCIAMODELOS",
                column: "PEM_TIPO_EVENTO_ID");

            migrationBuilder.AddForeignKey(
                name: "FK_EVENTOPENDENCIAS_PENDENCIAMODELOS_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS",
                column: "EVP_MODELO_ID",
                principalTable: "PENDENCIAMODELOS",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EVENTOPENDENCIAS_PENDENCIAMODELOS_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS");

            migrationBuilder.DropTable(
                name: "PENDENCIAMODELOS");

            migrationBuilder.DropIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_EVENTO_ID_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS");

            migrationBuilder.DropIndex(
                name: "IX_EVENTOPENDENCIAS_EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS");

            migrationBuilder.DropColumn(
                name: "EVP_MODELO_ID",
                table: "EVENTOPENDENCIAS");
        }
    }
}
