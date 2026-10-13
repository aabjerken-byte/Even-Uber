using EvenUber.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Even Uber API",
        Version = "v1.0",
        Description = "Backend API for Even Uber - G2 AR glasses mobility integration",
        Contact = new()
        {
            Name = "Even Reality",
            Url = new Uri("https://evenreality.com")
        }
    });
});

// Register Uber services
builder.Services.AddScoped<IUberAuthService, UberAuthService>();
builder.Services.AddScoped<IUberRideService, UberRideService>();

// Pushes ride data to the Even Hub display app (same endpoint the iOS
// companion app posts to).
builder.Services.AddHttpClient<IEvenHubPublisher, EvenHubPublisher>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(5);
    });

// Configure HttpClient for Uber API calls
builder.Services.AddHttpClient<IUberRideService, UberRideService>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

builder.Services.AddHttpClient<IUberAuthService, UberAuthService>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(10);
    });

// CORS configuration for AR glasses frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("ArGlassesOrigins", policyBuilder =>
    {
        policyBuilder
            .AllowAnyOrigin()  // Adjust for production: specify G2 device IPs/origins
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Logging configuration
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.SetMinimumLevel(LogLevel.Debug);
}

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Even Uber API v1.0");
    });
}

app.UseHttpsRedirection();
app.UseCors("ArGlassesOrigins");
app.UseRouting();

app.MapControllers();

// Health check endpoint at root
app.MapGet("/", () => new
{
    service = "Even Uber Backend",
    version = "1.0.0",
    status = "running",
    timestamp = DateTime.UtcNow
});

app.Run();
