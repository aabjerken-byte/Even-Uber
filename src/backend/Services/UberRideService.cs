using EvenUber.Backend.Models;
using System.Text.Json;

namespace EvenUber.Backend.Services;

/// <summary>
/// Fetches active ride data from Uber API.
/// Handles driver info, vehicle details, ETA, and location tracking.
/// </summary>
public interface IUberRideService
{
    Task<RideData> GetActiveRideAsync(string rideId, CancellationToken cancellationToken = default);
    Task<List<RideData>> GetUserRidesAsync(CancellationToken cancellationToken = default);
}

public class UberRideService : IUberRideService
{
    private readonly IUberAuthService _authService;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ILogger<UberRideService> _logger;

    public UberRideService(
        IUberAuthService authService,
        IConfiguration config,
        HttpClient httpClient,
        ILogger<UberRideService> logger)
    {
        _authService = authService;
        _config = config;
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Get details for a specific active ride.
    /// Phase 1: Returns driver info, vehicle, ETA, and location.
    /// </summary>
    public async Task<RideData> GetActiveRideAsync(string rideId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(rideId))
            throw new ArgumentException("Ride ID cannot be null or empty", nameof(rideId));

        _logger.LogInformation("Fetching ride details for ride {RideId}", rideId);

        var accessToken = await _authService.GetAccessTokenAsync(cancellationToken);
        var apiBaseUrl = _config["Uber:ApiBaseUrl"];
        var endpoint = $"{apiBaseUrl}/v1.0/rides/{rideId}";

        var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var rideData = JsonSerializer.Deserialize<RideData>(json);

        if (rideData == null)
            throw new InvalidOperationException($"Failed to parse ride data for {rideId}");

        _logger.LogInformation(
            "Fetched ride {RideId}: driver {DriverName}, ETA {EtaMinutes}m, status {Status}",
            rideData.RideId, rideData.Driver?.Name, rideData.PickupEtaMinutes, rideData.Status);

        return rideData;
    }

    /// <summary>
    /// Get active or recent rides for the user.
    /// </summary>
    public async Task<List<RideData>> GetUserRidesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Fetching user rides");

        var accessToken = await _authService.GetAccessTokenAsync(cancellationToken);
        var apiBaseUrl = _config["Uber:ApiBaseUrl"];
        var endpoint = $"{apiBaseUrl}/v1.0/trips";

        var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);

        // Parse response structure: likely { trips: [...] }
        using var doc = JsonDocument.Parse(json);
        var tripsArray = doc.RootElement.GetProperty("trips").EnumerateArray()
            .Select(elem => JsonSerializer.Deserialize<RideData>(elem.GetRawText()))
            .Where(r => r != null)
            .Cast<RideData>()
            .ToList();

        _logger.LogInformation("Fetched {Count} rides for user", tripsArray.Count);
        return tripsArray;
    }
}
