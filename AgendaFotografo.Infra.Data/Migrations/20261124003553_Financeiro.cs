using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class Financeiro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GASTOSFIXOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    GAF_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    GAF_TITULO = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GAF_VALOR = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    GAF_CATEGORIA = table.Column<int>(type: "int", nullable: false),
                    GAF_DIA = table.Column<int>(type: "int", nullable: false),
                    GAF_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    GAF_GERADO_ATE = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GASTOSFIXOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GASTOSFIXOS_ASSINANTES_GAF_ASSINANTE_ID",
                        column: x => x.GAF_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LANCAMENTOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LAN_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LAN_TIPO = table.Column<int>(type: "int", nullable: false),
                    LAN_TITULO = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LAN_VALOR = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    LAN_DATA = table.Column<DateOnly>(type: "date", nullable: false),
                    LAN_CATEGORIA = table.Column<int>(type: "int", nullable: false),
                    LAN_OBSERVACOES = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LAN_GASTO_FIXO_ID = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    LAN_REFERENCIA = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LANCAMENTOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LANCAMENTOS_ASSINANTES_LAN_ASSINANTE_ID",
                        column: x => x.LAN_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LANCAMENTOS_GASTOSFIXOS_LAN_GASTO_FIXO_ID",
                        column: x => x.LAN_GASTO_FIXO_ID,
                        principalTable: "GASTOSFIXOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_GASTOSFIXOS_GAF_ASSINANTE_ID_GAF_ATIVO",
                table: "GASTOSFIXOS",
                columns: new[] { "GAF_ASSINANTE_ID", "GAF_ATIVO" });

            migrationBuilder.CreateIndex(
                name: "IX_LANCAMENTOS_LAN_ASSINANTE_ID_LAN_DATA",
                table: "LANCAMENTOS",
                columns: new[] { "LAN_ASSINANTE_ID", "LAN_DATA" });

            migrationBuilder.CreateIndex(
                name: "IX_LANCAMENTOS_LAN_GASTO_FIXO_ID_LAN_REFERENCIA",
                table: "LANCAMENTOS",
                columns: new[] { "LAN_GASTO_FIXO_ID", "LAN_REFERENCIA" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LANCAMENTOS");

            migrationBuilder.DropTable(
                name: "GASTOSFIXOS");
        }
    }
}
