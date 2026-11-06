using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class EventoLocal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EVE_LOCAL",
                table: "EVENTOS",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EVE_LOCAL",
                table: "EVENTOS");
        }
    }
}
