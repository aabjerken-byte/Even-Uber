using System.Text.Json.Serialization;

namespace EvenUber.Backend.Models;

/// <summary>
/// The payload the Even Hub display app accepts on POST /api/ride-update.
/// <para>
/// Deliberately a separate type from <see cref="RideData"/>. The Uber-facing
/// model is nested and snake_case; the display's model is flat and camelCase,
/// and it is also what the iOS companion app posts. Mapping between them here
/// keeps a single ingestion contract for the display, so the backend and the
/// phone are interchangeable producers.
/// </para>
/// </summary>
public class EvenHubRideUpdate
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "enroute";

    [JsonPropertyName("driverName")]
    public string DriverName { get; set; } = string.Empty;

    [JsonPropertyName("driverRating")]
    public double DriverRating { get; set; }

    [JsonPropertyName("vehicleMake")]
    public string VehicleMake { get; set; } = string.Empty;

    [JsonPropertyName("vehicleModel")]
    public string VehicleModel { get; set; } = string.Empty;

    [JsonPropertyName("vehicleColor")]
    public string VehicleColor { get; set; } = string.Empty;

    [JsonPropertyName("licensePlate")]
    public string LicensePlate { get; set; } = string.Empty;

    [JsonPropertyName("etaMinutes")]
    public int EtaMinutes { get; set; }

    [JsonPropertyName("driverLat")]
    public double? DriverLat { get; set; }

    [JsonPropertyName("driverLng")]
    public double? DriverLng { get; set; }

    [JsonPropertyName("requesterLat")]
    public double? RequesterLat { get; set; }

    [JsonPropertyName("requesterLng")]
    public double? RequesterLng { get; set; }

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    /// <summary>
    /// Map Uber's ride status onto the display's lifecycle vocabulary.
    /// Unrecognised values fall back to "enroute" rather than inventing a
    /// terminal state, because a wrong terminal state clears the glasses.
    /// </summary>
    public static string MapStatus(string? uberStatus) => uberStatus?.ToLowerInvariant() switch
    {
        "processing" or "accepted" or "en_route" or "enroute" => "enroute",
        "arriving" => "arriving",
        "arrived" or "driver_arrived" => "arrived",
        "in_progress" or "pickup_complete" or "on_trip" => "enroute",
        "completed" or "dropoff_complete" => "completed",
        "rider_canceled" or "driver_canceled" or "canceled" or "cancelled" => "cancelled",
        "no_drivers_available" => "cancelled",
        _ => "enroute"
    };

    /// <summary>
    /// Flatten Uber-shaped ride data into the display's payload.
    /// </summary>
    public static EvenHubRideUpdate FromRideData(RideData ride, DateTime? timestampUtc = null)
    {
        return new EvenHubRideUpdate
        {
            Status = MapStatus(ride.Status),
            DriverName = ride.Driver?.Name ?? string.Empty,
            DriverRating = ride.Driver?.Rating ?? 0,
            VehicleMake = ride.Vehicle?.Make ?? string.Empty,
            VehicleModel = ride.Vehicle?.Model ?? string.Empty,
            VehicleColor = ride.Vehicle?.Color ?? string.Empty,
            LicensePlate = ride.Vehicle?.LicensePlate ?? string.Empty,
            EtaMinutes = ride.PickupEtaMinutes,
            // This is the field the notification pipeline can never supply —
            // it's the whole reason the API path matters for the map.
            DriverLat = ride.DriverLocation?.Latitude,
            DriverLng = ride.DriverLocation?.Longitude,
            RequesterLat = ride.RequesterLocation?.Latitude,
            RequesterLng = ride.RequesterLocation?.Longitude,
            Timestamp = (timestampUtc ?? DateTime.UtcNow).ToString("yyyy-MM-ddTHH:mm:ssZ")
        };
    }
}
