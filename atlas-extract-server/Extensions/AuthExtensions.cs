using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;



namespace App.Extensions;



public static class AuthExtensions
{
    public static IServiceCollection AddCognitoAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var userPoolId = configuration["Cognito:UserPoolId"]
            ?? throw new InvalidOperationException("Cognito:UserPoolId is not configured.");
        var region = configuration["Cognito:UserPoolRegion"]
            ?? throw new InvalidOperationException("Cognito:UserPoolRegion is not configured.");

        var authority = $"https://cognito-idp.{region}.amazonaws.com/{userPoolId}";

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = true,
                    ValidateLifetime = true,
                    // Cognito access tokens do not carry a standard 'aud' claim
                    ValidateAudience = false,
                };
            });

        services.AddAuthorization();
        return services;
    }
}
