using System.Collections;
using App.Dtos;
using App.Interfaces;

namespace App.Services;



public class RequestCheckService : IRequestCheckService
{
    public List<string> CheckRequest(object payload, RequiredField[] requiredFields)
    {
        var errors = new List<string>();
        var payloadType = payload.GetType();

        foreach (var field in requiredFields)
        {
            var prop = payloadType.GetProperty(field.Name, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
            var value = prop?.GetValue(payload);

            if (prop == null || value == null || (value is string s && string.IsNullOrWhiteSpace(s)))
            {
                errors.Add($"{field.Name} is required");
                continue;
            }

            if (!IsCorrectType(value, field.Type))
                errors.Add($"{field.Name} must be of type {field.Type}");
        }

        return errors;
    }

    private static bool IsCorrectType(object value, string expectedType) => expectedType switch
    {
        "string" => value is string,
        "int"    => value is int or long or short or byte,
        "bool"   => value is bool,
        "array"  => value is IEnumerable and not string,
        "object" => value is not null && !IsPrimitive(value),
        _        => true
    };

    private static bool IsPrimitive(object value) =>
        value is string or bool or int or long or short or byte or float or double or decimal;
}
