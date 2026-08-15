using System.Text.Json.Serialization;

namespace EvenUber.Backend.Models;

/// <summary>
/// Uber application credentials loaded from JSON file.
/// Matches the structure of uber-credentials.json.
/// </summary>
public class UberCredentials
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("key_id")]
    public string? KeyId { get; set; }

    [JsonPropertyName("private_key")]
    public string? PrivateKey { get; set; }

    [JsonPropertyName("public_key")]
    public string? PublicKey { get; set; }

    [JsonPropertyName("application_id")]
    public string? ApplicationId { get; set; }
}
