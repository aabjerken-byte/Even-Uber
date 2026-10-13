using System.Text.Json;
using EvenUber.Backend.Models;

namespace EvenUber.Backend.Tests;

/// <summary>
/// The Uber-facing model and the display's model have different shapes,
/// different casing and different status vocabularies. These tests pin the
/// translation between them.
/// </summary>
public class EvenHubRideUpdateTests
{
    private static RideData SampleRide(string? status = "arriving") => new()
    {
        RideId = "ride_123",
        Status = status,
        PickupEtaMinutes = 3,
        Driver = new DriverInfo { Name = "John D.", Rating = 4.9 },
        Vehicle = new VehicleInfo
        {
            Make = "Toyota",
            Model = "Prius",
            Color = "Silver",
            LicensePlate = "ABC123"
        },
        DriverLocation = new LocationInfo { Latitude = 37.7749, Longitude = -122.4194 },
        RequesterLocation = new LocationInfo { Latitude = 37.7755, Longitude = -122.4180 }
    };

    [Fact]
    public void FlattensNestedUberShape()
    {
        var update = EvenHubRideUpdate.FromRideData(SampleRide());

        Assert.Equal("John D.", update.DriverName);
        Assert.Equal(4.9, update.DriverRating);
        Assert.Equal("Toyota", update.VehicleMake);
        Assert.Equal("Prius", update.VehicleModel);
        Assert.Equal("Silver", update.VehicleColor);
        Assert.Equal("ABC123", update.LicensePlate);
        Assert.Equal(3, update.EtaMinutes);
    }

    [Fact]
    public void CarriesDriverCoordinates()
    {
        // The reason this path exists at all — notification text has no
        // coordinates, so the two-pin map only works via the API.
        var update = EvenHubRideUpdate.FromRideData(SampleRide());

        Assert.Equal(37.7749, update.DriverLat);
        Assert.Equal(-122.4194, update.DriverLng);
        Assert.Equal(37.7755, update.RequesterLat);
        Assert.Equal(-122.4180, update.RequesterLng);
    }

    [Fact]
    public void SurvivesMissingNestedObjects()
    {
        var sparse = new RideData { Status = "accepted", PickupEtaMinutes = 5 };
        var update = EvenHubRideUpdate.FromRideData(sparse);

        Assert.Equal(string.Empty, update.DriverName);
        Assert.Equal(string.Empty, update.VehicleMake);
        Assert.Null(update.DriverLat);
        Assert.Equal(5, update.EtaMinutes);
    }

    [Theory]
    [InlineData("accepted", "enroute")]
    [InlineData("en_route", "enroute")]
    [InlineData("processing", "enroute")]
    [InlineData("arriving", "arriving")]
    [InlineData("arrived", "arrived")]
    [InlineData("driver_arrived", "arrived")]
    [InlineData("in_progress", "enroute")]
    [InlineData("completed", "completed")]
    [InlineData("dropoff_complete", "completed")]
    [InlineData("rider_canceled", "cancelled")]
    [InlineData("driver_canceled", "cancelled")]
    [InlineData("no_drivers_available", "cancelled")]
    public void MapsUberStatusToDisplayVocabulary(string uber, string expected)
    {
        Assert.Equal(expected, EvenHubRideUpdate.MapStatus(uber));
    }

    [Fact]
    public void MapsStatusCaseInsensitively()
    {
        Assert.Equal("cancelled", EvenHubRideUpdate.MapStatus("RIDER_CANCELED"));
        Assert.Equal("arrived", EvenHubRideUpdate.MapStatus("Arrived"));
    }

    [Fact]
    public void FallsBackToEnrouteRatherThanGuessingATerminalState()
    {
        // A wrong terminal state clears the card off the glasses, so unknown
        // values must fail safe in the other direction.
        Assert.Equal("enroute", EvenHubRideUpdate.MapStatus("some_future_status"));
        Assert.Equal("enroute", EvenHubRideUpdate.MapStatus(null));
        Assert.Equal("enroute", EvenHubRideUpdate.MapStatus(""));
    }

    [Fact]
    public void SerializesToTheCasingTheDisplayExpects()
    {
        var json = JsonSerializer.Serialize(EvenHubRideUpdate.FromRideData(SampleRide()));

        // The React model and the Swift encoder both use these exact keys.
        Assert.Contains("\"driverName\":", json);
        Assert.Contains("\"etaMinutes\":", json);
        Assert.Contains("\"licensePlate\":", json);
        Assert.Contains("\"driverLat\":", json);
        Assert.Contains("\"requesterLng\":", json);
        Assert.Contains("\"status\":\"arriving\"", json);

        // And definitely not Uber's snake_case.
        Assert.DoesNotContain("pickup_eta_minutes", json);
        Assert.DoesNotContain("license_plate", json);
    }

    [Fact]
    public void EmitsAnIso8601TimestampTheDisplayCanParse()
    {
        var stamp = new DateTime(2026, 8, 17, 12, 30, 0, DateTimeKind.Utc);
        var update = EvenHubRideUpdate.FromRideData(SampleRide(), stamp);

        Assert.Equal("2026-08-17T12:30:00Z", update.Timestamp);
        Assert.True(DateTime.TryParse(update.Timestamp, out _));
    }
}
