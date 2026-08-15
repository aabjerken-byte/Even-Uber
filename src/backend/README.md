# Even Uber Backend

ASP.NET Core microservice for Uber API integration. Handles OAuth authentication with JWT, fetches active ride data (driver info, vehicle, ETA, location), and exposes REST endpoints for the AR glasses frontend.

## Phase 1 Features

- ✅ JWT-based OAuth authentication with Uber
- ✅ Fetch active ride details (driver, vehicle, ETA)
- ✅ Real-time driver location tracking
- ✅ Token caching (55-minute refresh)
- ✅ RESTful API for frontend consumption
- ✅ Swagger/OpenAPI documentation

## Prerequisites

- .NET 8.0 SDK
- Uber credentials (application ID, private key)
- Google Maps or Mapbox API key (for route visualization — Phase 1 stub)

## Setup

### 1. Install Dependencies

```bash
dotnet restore
```

### 2. Configure Credentials

Copy your Uber credentials to the `secrets/` folder:

```bash
cp secrets/uber-credentials.template.json secrets/uber-credentials.json
# Edit secrets/uber-credentials.json with your actual credentials
```

**IMPORTANT**: Never commit `secrets/uber-credentials.json` to git. It's in `.gitignore`.

### 3. Update Configuration

Edit `appsettings.json`:

```json
{
  "Uber": {
    "CredentialsPath": "secrets/uber-credentials.json",
    "TokenEndpoint": "https://auth.uber.com/oauth/v2/token",
    "ApiBaseUrl": "https://api.uber.com",
    "Scopes": "trips.read request.write",
    "TokenCacheDurationMinutes": 55
  }
}
```

For local development, create `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  }
}
```

### 4. Run Locally

```bash
dotnet run
```

The API will be available at `https://localhost:5001` (or the port shown in console).

**Swagger UI**: `https://localhost:5001/swagger`

## API Endpoints

### Get Active Ride

**Request**
```
GET /api/rides/{rideId}
Authorization: Bearer {optional-user-token}
```

**Response (200 OK)**
```json
{
  "ride_id": "ride-123",
  "status": "arriving",
  "driver": {
    "id": "driver-456",
    "name": "John D.",
    "rating": 4.95,
    "photo_url": "https://...",
    "phone": "+1-555-0123"
  },
  "vehicle": {
    "make": "Toyota",
    "model": "Prius",
    "color": "Silver",
    "license_plate": "ABC123",
    "photo_url": "https://..."
  },
  "pickup_eta_minutes": 3,
  "route": {
    "type": "LineString",
    "coordinates": [[-122.4194, 37.7749], [-122.4180, 37.7755]]
  },
  "driver_location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "heading": 45,
    "speed": 25
  },
  "requester_location": {
    "latitude": 37.7755,
    "longitude": -122.4180
  }
}
```

### Get User's Rides

**Request**
```
GET /api/rides
Authorization: Bearer {user-token}
```

**Response (200 OK)**
```json
[
  { /* ride object */ },
  { /* ride object */ }
]
```

### Health Check

**Request**
```
GET /
```

**Response (200 OK)**
```json
{
  "service": "Even Uber Backend",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2026-08-13T12:00:00Z"
}
```

## Architecture

### Services

- **UberAuthService**: Manages OAuth tokens via JWT assertion
  - `GetAccessTokenAsync()` — Fetches/caches access tokens
  - Handles JWT signing with private key
  - Implements token expiration and refresh logic

- **UberRideService**: Queries Uber API for ride data
  - `GetActiveRideAsync(rideId)` — Fetch single ride
  - `GetUserRidesAsync()` — Fetch user's rides

### Controllers

- **RidesController**: HTTP endpoints for AR frontend
  - `GET /api/rides/{rideId}` — Get ride details
  - `GET /api/rides` — Get user rides
  - `GET /api/rides/health` — Health check

## Error Handling

| Status | Scenario |
|--------|----------|
| 200 | Ride data retrieved successfully |
| 400 | Invalid ride ID |
| 401 | Uber API authentication failed (expired token, invalid credentials) |
| 404 | Ride not found |
| 500 | Server error (see logs) |

Check logs for detailed error messages:

```bash
dotnet run 2>&1 | grep -i error
```

## Logging

Logs go to console. For development, set `LogLevel.Default` to `Debug` in `appsettings.Development.json`.

```
[12:34:56 INF] Loaded Uber credentials for application rdOogdDdCCni2o5EXOi_798w8YiqfEu-
[12:34:57 INF] Fetching new Uber access token
[12:34:58 INF] Successfully obtained access token (expires in 3600s)
[12:34:59 INF] Fetching ride details for ride ride-123
[12:35:00 INF] Fetched ride ride-123: driver John D., ETA 3m, status arriving
```

## Security Considerations

1. **Private Key Storage**: Keep `secrets/uber-credentials.json` in `.gitignore` and never commit
2. **Token Expiration**: Tokens are cached locally for 55 minutes; refresh logic auto-fetches new tokens
3. **CORS**: Currently set to allow all origins (`AllowAnyOrigin`). For production, restrict to G2 device IPs
4. **HTTPS**: Required for production; enforce via `UseHttpsRedirection()`
5. **Rate Limiting**: To be added in Phase 2 (Uber API rate limits: 600/min per credential)

## Testing

### Manual API Test

```bash
# Get a single ride
curl -X GET https://localhost:5001/api/rides/ride-123 \
  -H "Accept: application/json"

# Health check
curl -X GET https://localhost:5001/
```

### Unit Tests (to be added)

```bash
dotnet test
```

## Deployment

### Docker

```bash
docker build -t even-uber-backend .
docker run -p 5001:443 -e Uber__CredentialsPath=/secrets/uber-credentials.json -v $(pwd)/secrets:/secrets even-uber-backend
```

### Azure App Service

```bash
az webapp up --name even-uber-api --runtime dotnet:8.0
```

Configure Uber credentials via App Service > Configuration > Application Settings:
- `Uber:CredentialsPath` → `/home/site/secrets/uber-credentials.json`

## Phase 2 Planning

- [ ] Real-time WebSocket endpoint for driver location updates (push instead of poll)
- [ ] Ride request submission endpoint
- [ ] Driver chat/communication endpoint
- [ ] Payment and receipt handling
- [ ] Surge pricing display

## Troubleshooting

### "Failed to deserialize Uber credentials"

Check that `secrets/uber-credentials.json` is valid JSON and contains all required fields.

### "Uber API authentication failed (401)"

Your private key may be invalid or Uber may not have registered your public key. Rotate credentials and re-register with Uber.

### "Ride not found (404)"

Ride ID may be incorrect or the ride may no longer be active.

## License

Proprietary — Even Reality
