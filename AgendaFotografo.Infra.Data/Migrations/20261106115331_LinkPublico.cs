using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class LinkPublico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EVENTOLINKS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVL_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVL_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVL_TOKEN = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVL_CODIGO = table.Column<string>(type: "varchar(4)", maxLength: 4, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVL_CARIMBO = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVL_ATIVO = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    EVL_MOSTRAR_EQUIPE = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOLINKS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOLINKS_ASSINANTES_EVL_ASSINANTE_ID",
                        column: x => x.EVL_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOLINKS_EVENTOS_EVL_EVENTO_ID",
                        column: x => x.EVL_EVENTO_ID,
                        principalTable: "EVENTOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOLINKS_EVL_ASSINANTE_ID",
                table: "EVENTOLINKS",
                column: "EVL_ASSINANTE_ID");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOLINKS_EVL_EVENTO_ID",
                table: "EVENTOLINKS",
                column: "EVL_EVENTO_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOLINKS_EVL_TOKEN",
                table: "EVENTOLINKS",
                column: "EVL_TOKEN",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EVENTOLINKS");
        }
    }
}
