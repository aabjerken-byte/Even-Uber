using System.Text.Json.Serialization;

namespace EvenUber.Backend.Models;

/// <summary>
/// Active ride information from Uber API.
/// Represents Phase 1 display data: driver, vehicle, ETA, location.
/// </summary>
public class RideData
{
    [JsonPropertyName("ride_id")]
    public string? RideId { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; } // arriving, arrived, pickup_complete

    [JsonPropertyName("driver")]
    public DriverInfo? Driver { get; set; }

    [JsonPropertyName("vehicle")]
    public VehicleInfo? Vehicle { get; set; }

    [JsonPropertyName("pickup_eta_minutes")]
    public int PickupEtaMinutes { get; set; }

    [JsonPropertyName("route")]
    public RouteInfo? Route { get; set; }

    [JsonPropertyName("driver_location")]
    public LocationInfo? DriverLocation { get; set; }

    [JsonPropertyName("requester_location")]
    public LocationInfo? RequesterLocation { get; set; }
}

public class DriverInfo
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("rating")]
    public double Rating { get; set; }

    [JsonPropertyName("photo_url")]
    public string? PhotoUrl { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}

public class VehicleInfo
{
    [JsonPropertyName("make")]
    public string? Make { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("license_plate")]
    public string? LicensePlate { get; set; }

    [JsonPropertyName("photo_url")]
    public string? PhotoUrl { get; set; }
}

public class LocationInfo
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }

    [JsonPropertyName("heading")]
    public int? Heading { get; set; }

    [JsonPropertyName("speed")]
    public int? Speed { get; set; }
}

public class RouteInfo
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "LineString";

    [JsonPropertyName("coordinates")]
    public double[][]? Coordinates { get; set; } // GeoJSON format: [[lng, lat], ...]
}

/// <summary>
/// OAuth token response from Uber.
/// </summary>
public class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("token_type")]
    public string? TokenType { get; set; }

    [JsonPropertyName("scope")]
    public string? Scope { get; set; }

    public DateTime ExpiresAt => DateTime.UtcNow.AddSeconds(ExpiresIn);
}
