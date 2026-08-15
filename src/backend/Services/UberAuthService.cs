using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using EvenUber.Backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;

namespace EvenUber.Backend.Services;

/// <summary>
/// Handles Uber OAuth authentication using JWT private key.
/// Exchanges JWT assertions for access tokens via Client Credentials flow.
/// </summary>
public interface IUberAuthService
{
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default);
}

public class UberAuthService : IUberAuthService
{
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ILogger<UberAuthService> _logger;
    private readonly object _lockObject = new();

    private string? _cachedToken;
    private DateTime _tokenExpiresAt = DateTime.MinValue;

    public UberAuthService(
        IConfiguration config,
        HttpClient httpClient,
        ILogger<UberAuthService> logger)
    {
        _config = config;
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Get a valid access token, using cache if available.
    /// </summary>
    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        // Check if cached token is still valid (with 5-minute buffer)
        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow.AddMinutes(5) < _tokenExpiresAt)
        {
            _logger.LogDebug("Using cached access token (expires at {ExpiresAt})", _tokenExpiresAt);
            return _cachedToken;
        }

        // Token expired or never cached; fetch new one
        _logger.LogInformation("Fetching new Uber access token");
        var token = await FetchAccessTokenAsync(cancellationToken);

        lock (_lockObject)
        {
            _cachedToken = token.AccessToken;
            _tokenExpiresAt = token.ExpiresAt;

            _logger.LogInformation("Access token cached until {ExpiresAt}", _tokenExpiresAt);
            return _cachedToken ?? throw new InvalidOperationException("Access token is null");
        }
    }

    /// <summary>
    /// Fetch a fresh access token from Uber using JWT assertion.
    /// </summary>
    private async Task<TokenResponse> FetchAccessTokenAsync(CancellationToken cancellationToken)
    {
        var credentials = LoadCredentials();
        var jwt = CreateJwt(credentials);

        var tokenEndpoint = _config["Uber:TokenEndpoint"];
        var request = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials"),
            new KeyValuePair<string, string>("assertion", jwt),
            new KeyValuePair<string, string>("assertion_type", "urn:ietf:params:oauth:assertion-type:jwt-bearer")
        });

        _logger.LogDebug("Exchanging JWT for access token at {Endpoint}", tokenEndpoint);

        var response = await _httpClient.PostAsync(tokenEndpoint, request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);

        if (tokenResponse == null)
            throw new InvalidOperationException("Failed to deserialize token response from Uber");

        _logger.LogInformation("Successfully obtained access token (expires in {ExpiresIn}s)", tokenResponse.ExpiresIn);
        return tokenResponse;
    }

    /// <summary>
    /// Load Uber credentials from JSON file.
    /// </summary>
    private UberCredentials LoadCredentials()
    {
        var credentialsPath = _config["Uber:CredentialsPath"];
        if (string.IsNullOrEmpty(credentialsPath))
            throw new InvalidOperationException("Uber:CredentialsPath not configured");

        if (!File.Exists(credentialsPath))
            throw new FileNotFoundException($"Uber credentials file not found: {credentialsPath}");

        var json = File.ReadAllText(credentialsPath);
        var credentials = JsonSerializer.Deserialize<UberCredentials>(json);

        if (credentials == null)
            throw new InvalidOperationException("Failed to deserialize Uber credentials");

        _logger.LogDebug("Loaded Uber credentials for application {AppId}", credentials.ApplicationId);
        return credentials;
    }

    /// <summary>
    /// Create a JWT assertion signed with the private key.
    /// </summary>
    private string CreateJwt(UberCredentials credentials)
    {
        var tokenEndpoint = _config["Uber:TokenEndpoint"] ?? throw new InvalidOperationException("TokenEndpoint not configured");
        var scopes = _config["Uber:Scopes"] ?? "trips.read";
        var now = DateTime.UtcNow;

        if (string.IsNullOrEmpty(credentials.PrivateKey))
            throw new InvalidOperationException("Private key is null or empty");
        if (string.IsNullOrEmpty(credentials.ApplicationId))
            throw new InvalidOperationException("Application ID is null or empty");

        // Parse RSA private key from PEM format
        var rsa = RSA.Create();
        rsa.ImportFromPem(credentials.PrivateKey.ToCharArray());

        var securityKey = new RsaSecurityKey(rsa);
        var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256);

        // Create claims for JWT
        var claims = new List<System.Security.Claims.Claim>
        {
            new("iss", credentials.ApplicationId),
            new("sub", credentials.ApplicationId),
            new("aud", tokenEndpoint),
            new("scope", scopes)
        };

        // Create token
        var token = new JwtSecurityToken(
            issuer: credentials.ApplicationId,
            audience: tokenEndpoint,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(10),
            signingCredentials: signingCredentials
        );

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.WriteToken(token);

        _logger.LogDebug("Created JWT assertion (valid until {Expires})", token.ValidTo);
        return jwt;
    }
}
