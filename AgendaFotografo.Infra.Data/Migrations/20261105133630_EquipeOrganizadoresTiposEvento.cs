using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class EquipeOrganizadoresTiposEvento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MEMBROS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MEM_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MEM_NOME = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MEM_INSTAGRAM = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MEM_EMAIL = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MEM_TELEFONE = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MEM_FUNCAO = table.Column<int>(type: "int", nullable: false),
                    MEM_OBSERVACOES = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MEM_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MEMBROS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MEMBROS_ASSINANTES_MEM_ASSINANTE_ID",
                        column: x => x.MEM_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ORGANIZADORES",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ORG_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ORG_NOME = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ORG_CONTATO = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ORG_TELEFONE = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ORG_INSTAGRAM = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ORG_NOTAS = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ORG_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ORGANIZADORES", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ORGANIZADORES_ASSINANTES_ORG_ASSINANTE_ID",
                        column: x => x.ORG_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TIPOSEVENTO",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TPE_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TPE_NOME = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TPE_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TIPOSEVENTO", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TIPOSEVENTO_ASSINANTES_TPE_ASSINANTE_ID",
                        column: x => x.TPE_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_MEMBROS_MEM_ASSINANTE_ID_MEM_INSTAGRAM",
                table: "MEMBROS",
                columns: new[] { "MEM_ASSINANTE_ID", "MEM_INSTAGRAM" });

            migrationBuilder.CreateIndex(
                name: "IX_MEMBROS_MEM_ASSINANTE_ID_MEM_NOME",
                table: "MEMBROS",
                columns: new[] { "MEM_ASSINANTE_ID", "MEM_NOME" });

            migrationBuilder.CreateIndex(
                name: "IX_ORGANIZADORES_ORG_ASSINANTE_ID_ORG_NOME",
                table: "ORGANIZADORES",
                columns: new[] { "ORG_ASSINANTE_ID", "ORG_NOME" });

            migrationBuilder.CreateIndex(
                name: "IX_TIPOSEVENTO_TPE_ASSINANTE_ID_TPE_NOME",
                table: "TIPOSEVENTO",
                columns: new[] { "TPE_ASSINANTE_ID", "TPE_NOME" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MEMBROS");

            migrationBuilder.DropTable(
                name: "ORGANIZADORES");

            migrationBuilder.DropTable(
                name: "TIPOSEVENTO");
        }
    }
}
