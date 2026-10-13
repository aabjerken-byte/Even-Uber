using System.Text;
using System.Text.Json;
using EvenUber.Backend.Models;

namespace EvenUber.Backend.Services;

/// <summary>
/// Pushes ride data to the Even Hub display app.
/// </summary>
public interface IEvenHubPublisher
{
    Task<bool> PublishAsync(RideData ride, CancellationToken cancellationToken = default);
    Task<bool> PublishAsync(EvenHubRideUpdate update, CancellationToken cancellationToken = default);
}

/// <summary>
/// Posts to the same <c>/api/ride-update</c> endpoint the iOS companion app
/// uses, so the display has one ingestion contract and two interchangeable
/// producers. The display's merge logic then folds these updates onto whatever
/// is already on screen.
/// <para>
/// This is the path that carries <c>driverLat</c>/<c>driverLng</c>. Notification
/// text has no coordinates, so the two-pin map only ever appears when the data
/// comes through here.
/// </para>
/// </summary>
public class EvenHubPublisher : IEvenHubPublisher
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EvenHubPublisher> _logger;
    private readonly string _baseUrl;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public EvenHubPublisher(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<EvenHubPublisher> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = configuration["EvenHub:BaseUrl"]?.TrimEnd('/') ?? "http://127.0.0.1:3000";
    }

    public Task<bool> PublishAsync(RideData ride, CancellationToken cancellationToken = default)
        => PublishAsync(EvenHubRideUpdate.FromRideData(ride), cancellationToken);

    public async Task<bool> PublishAsync(
        EvenHubRideUpdate update,
        CancellationToken cancellationToken = default)
    {
        var endpoint = $"{_baseUrl}/api/ride-update";
        var json = JsonSerializer.Serialize(update, SerializerOptions);

        try
        {
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await _httpClient.PostAsync(endpoint, content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Even Hub rejected the ride update: {StatusCode}",
                    response.StatusCode);
                return false;
            }

            _logger.LogInformation(
                "Published ride to Even Hub: driver {DriverName}, status {Status}, ETA {Eta}m",
                update.DriverName, update.Status, update.EtaMinutes);
            return true;
        }
        catch (Exception ex)
        {
            // The display app not running is an ordinary situation, not a fault
            // worth failing the caller over — it just means nobody is watching.
            _logger.LogWarning(ex, "Could not reach Even Hub at {Endpoint}", endpoint);
            return false;
        }
    }
}
