using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaFotografo.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class MembroCpf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MEM_CPF",
                table: "MEMBROS",
                type: "varchar(11)",
                maxLength: 11,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_MEMBROS_MEM_CPF",
                table: "MEMBROS",
                column: "MEM_CPF");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MEMBROS_MEM_CPF",
                table: "MEMBROS");

            migrationBuilder.DropColumn(
                name: "MEM_CPF",
                table: "MEMBROS");
        }
    }
}
