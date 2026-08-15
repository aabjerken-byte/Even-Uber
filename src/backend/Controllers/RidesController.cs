using EvenUber.Backend.Models;
using EvenUber.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace EvenUber.Backend.Controllers;

/// <summary>
/// API endpoints for active ride data.
/// Frontend calls these to display driver info, ETA, and location tracking.
/// </summary>
[ApiController]
[Route("api/rides")]
public class RidesController : ControllerBase
{
    private readonly IUberRideService _rideService;
    private readonly ILogger<RidesController> _logger;

    public RidesController(IUberRideService rideService, ILogger<RidesController> logger)
    {
        _rideService = rideService;
        _logger = logger;
    }

    /// <summary>
    /// Get active ride details: driver, vehicle, ETA, location.
    /// Phase 1 endpoint for AR display.
    /// </summary>
    /// <param name="rideId">The Uber ride ID</param>
    /// <response code="200">Ride details retrieved successfully</response>
    /// <response code="401">Unauthorized - Uber API authentication failed</response>
    /// <response code="404">Ride not found</response>
    [HttpGet("{rideId}")]
    [ProducesResponseType(typeof(RideData), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RideData>> GetRide(
        [FromRoute] string rideId,
        CancellationToken cancellationToken)
    {
        try
        {
            var ride = await _rideService.GetActiveRideAsync(rideId, cancellationToken);
            return Ok(ride);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid ride ID: {Message}", ex.Message);
            return BadRequest(ex.Message);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("Ride {RideId} not found", rideId);
            return NotFound();
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            _logger.LogError("Uber API authentication failed: {Message}", ex.Message);
            return Unauthorized("Uber API authentication failed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ride {RideId}", rideId);
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to fetch ride details");
        }
    }

    /// <summary>
    /// Get all active or recent rides for the current user.
    /// </summary>
    /// <response code="200">Rides retrieved successfully</response>
    /// <response code="401">Unauthorized - Uber API authentication failed</response>
    [HttpGet]
    [ProducesResponseType(typeof(List<RideData>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<RideData>>> GetUserRides(CancellationToken cancellationToken)
    {
        try
        {
            var rides = await _rideService.GetUserRidesAsync(cancellationToken);
            return Ok(rides);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            _logger.LogError("Uber API authentication failed: {Message}", ex.Message);
            return Unauthorized("Uber API authentication failed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user rides");
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to fetch rides");
        }
    }

    /// <summary>
    /// Health check endpoint for the backend.
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}
