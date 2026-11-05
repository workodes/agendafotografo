using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class EventosEscalaArquivos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EVENTOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVE_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVE_NOME = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_TIPO_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVE_DATA = table.Column<DateOnly>(type: "date", nullable: false),
                    EVE_HORA = table.Column<TimeOnly>(type: "time", nullable: true),
                    EVE_CIDADE = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_STATUS = table.Column<int>(type: "int", nullable: false),
                    EVE_ORGANIZADOR_ID = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    EVE_LARGADA_LOCAL = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_LARGADA_LINK = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_CHEGADA_LOCAL = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_CHEGADA_LINK = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_LINK_INSCRICAO = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_LINK_FOTOS = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_ROTA_LINK_MAPS = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_ROTA_LINK_STRAVA = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_INFORMACOES = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_OBSERVACOES_EQUIPE = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVE_NOTAS_INTERNAS = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOS_ASSINANTES_EVE_ASSINANTE_ID",
                        column: x => x.EVE_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOS_ORGANIZADORES_EVE_ORGANIZADOR_ID",
                        column: x => x.EVE_ORGANIZADOR_ID,
                        principalTable: "ORGANIZADORES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOS_TIPOSEVENTO_EVE_TIPO_EVENTO_ID",
                        column: x => x.EVE_TIPO_EVENTO_ID,
                        principalTable: "TIPOSEVENTO",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "EVENTOARQUIVOS",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVA_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVA_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVA_TIPO = table.Column<int>(type: "int", nullable: false),
                    EVA_NOME_ORIGINAL = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVA_CAMINHO = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVA_CONTENT_TYPE = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EVA_TAMANHO = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOARQUIVOS", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOARQUIVOS_ASSINANTES_EVA_ASSINANTE_ID",
                        column: x => x.EVA_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOARQUIVOS_EVENTOS_EVA_EVENTO_ID",
                        column: x => x.EVA_EVENTO_ID,
                        principalTable: "EVENTOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "EVENTOXMEMBRO",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVM_ASSINANTE_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVM_EVENTO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVM_MEMBRO_ID = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    EVM_POSICAO = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EVENTOXMEMBRO", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EVENTOXMEMBRO_ASSINANTES_EVM_ASSINANTE_ID",
                        column: x => x.EVM_ASSINANTE_ID,
                        principalTable: "ASSINANTES",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOXMEMBRO_EVENTOS_EVM_EVENTO_ID",
                        column: x => x.EVM_EVENTO_ID,
                        principalTable: "EVENTOS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EVENTOXMEMBRO_MEMBROS_EVM_MEMBRO_ID",
                        column: x => x.EVM_MEMBRO_ID,
                        principalTable: "MEMBROS",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOARQUIVOS_EVA_ASSINANTE_ID",
                table: "EVENTOARQUIVOS",
                column: "EVA_ASSINANTE_ID");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOARQUIVOS_EVA_EVENTO_ID_EVA_TIPO",
                table: "EVENTOARQUIVOS",
                columns: new[] { "EVA_EVENTO_ID", "EVA_TIPO" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOS_EVE_ASSINANTE_ID_EVE_DATA",
                table: "EVENTOS",
                columns: new[] { "EVE_ASSINANTE_ID", "EVE_DATA" });

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOS_EVE_ASSINANTE_ID_EVE_ORGANIZADOR_ID",
                table: "EVENTOS",
                columns: new[] { "EVE_ASSINANTE_ID", "EVE_ORGANIZADOR_ID" });

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOS_EVE_ASSINANTE_ID_EVE_TIPO_EVENTO_ID",
                table: "EVENTOS",
                columns: new[] { "EVE_ASSINANTE_ID", "EVE_TIPO_EVENTO_ID" });

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOS_EVE_ORGANIZADOR_ID",
                table: "EVENTOS",
                column: "EVE_ORGANIZADOR_ID");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOS_EVE_TIPO_EVENTO_ID",
                table: "EVENTOS",
                column: "EVE_TIPO_EVENTO_ID");

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOXMEMBRO_EVM_ASSINANTE_ID_EVM_MEMBRO_ID",
                table: "EVENTOXMEMBRO",
                columns: new[] { "EVM_ASSINANTE_ID", "EVM_MEMBRO_ID" });

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOXMEMBRO_EVM_EVENTO_ID_EVM_MEMBRO_ID",
                table: "EVENTOXMEMBRO",
                columns: new[] { "EVM_EVENTO_ID", "EVM_MEMBRO_ID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EVENTOXMEMBRO_EVM_MEMBRO_ID",
                table: "EVENTOXMEMBRO",
                column: "EVM_MEMBRO_ID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EVENTOARQUIVOS");

            migrationBuilder.DropTable(
                name: "EVENTOXMEMBRO");

            migrationBuilder.DropTable(
                name: "EVENTOS");
        }
    }
}
