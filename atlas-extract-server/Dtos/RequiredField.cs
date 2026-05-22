namespace App.Dtos;



public class RequiredField
{
    public required string Name { get; set; }
    public required string Type { get; set; } // "string" | "int" | "bool" | "array" | "object"
}
