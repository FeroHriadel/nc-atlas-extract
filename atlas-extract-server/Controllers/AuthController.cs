using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using App.Dtos;
using Microsoft.AspNetCore.Mvc;



namespace App.Controllers;



public class AuthController(
    IAmazonCognitoIdentityProvider cognito,
    ILogger<AuthController> logger
) : BaseAppController
{
    // POST /api/auth/signout
    // Calls Cognito GlobalSignOut to invalidate all refresh tokens for the user.
    [HttpPost("signout")]
    public async Task<IActionResult> SignOut()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        var accessToken = authHeader?.StartsWith("Bearer ") == true ? authHeader[7..] : null;

        if (string.IsNullOrWhiteSpace(accessToken))
            return BadRequest(new ErrorRes { StatusCode = 400, Message = "Missing access token." });

        try
        {
            await cognito.GlobalSignOutAsync(new GlobalSignOutRequest { AccessToken = accessToken });
            return Ok(new { message = "Signed out." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Cognito GlobalSignOut failed");
            return StatusCode(500, new ErrorRes { StatusCode = 500, Message = "Sign out failed." });
        }
    }
}
