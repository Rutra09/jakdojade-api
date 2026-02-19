# Jakdojade API Client

A reverse-engineered Node.js client for the Jakdojade public transport API.

## Features

- **Route Search**: Find optimal public transport routes between coordinates, addresses, or stops.
- **Advanced Filtering**: Avoid specific lines, vehicle types, or operators.
- **Accessibility Options**: Filter for wheelchair-accessible vehicles.
- **Fluent Builder API**: Easily construct complex queries using `RouteQueryBuilder`.
- **Anonymous Registration**: Automatically handles device registration and request signing.

## Installation

```bash
npm install jakdojade-api
```
*(Note: This package is currently private/local. You can install it from this repository)*

## Usage

### Basic Usage

```javascript
const { JakdojadeClient } = require('jakdojade-api');

const client = new JakdojadeClient();

const start = {
    citySymbol: "WARSZAWA",
    coordinate: { y_lat: 52.2319, x_lon: 21.0067 },
    locationType: "ADDRESS",
    locationName: "Plac Defilad 1"
};

const destination = {
    citySymbol: "WARSZAWA",
    coordinate: { y_lat: 52.2299, x_lon: 21.0687 },
    locationType: "STOP_POINT",
    locationName: "Międzynarodowa",
    locationCode: "209802"
};

const timeOptions = {
    dateTime: new Date().toISOString(),
    queryTimeType: "DEPARTURE"
};

client.searchRoute(start, destination, timeOptions)
    .then(routes => console.log(routes));
```

### Using the Query Builder (Recommended)

The `RouteQueryBuilder` provides a fluent interface for constructing queries with advanced options.

```javascript
const { JakdojadeClient, RouteQueryBuilder } = require('jakdojade-api');

const client = new JakdojadeClient();

const query = new RouteQueryBuilder()
    .from(start)
    .to(destination)
    .departingAt(new Date())
    // Options
    .avoidLine(509)
    .avoidLine(159)
    .avoidChanges("AVOID_CHANGES") // DEFAULT, AVOID_CHANGES
    .connectionType("FAST")        // OPTIMAL, FAST, CONVENIENT
    .prohibitVehicle("VEHICLE_TYPE_TRAIN")
    .wheelchairAccessible()
    .build();

const results = await client.search(query);
```

### Builder Methods

- `.from(location)` / `.to(location)`: Set start and end points.
- `.departingAt(date)` / `.arrivingAt(date)`: Set time constraints.
- `.avoidLine(lineNo)`: Avoid a specific line (e.g., `509`).
- `.preferLine(lineNo)`: Prefer a specific line.
- `.avoidVehicle(type)`: Avoid vehicle types (e.g., `VEHICLE_TYPE_BUS`).
- `.prohibitVehicle(type)`: Strictly prohibit vehicle types.
- `.wheelchairAccessible()`: Request accessible vehicles only.
- `.avoidChanges(mode)`: Set change preference (`min`, `none`, etc.).
- `.connectionType(type)`: Set algorithm preference (`fast`, `optimal`, `convenient`).

## Disclaimer

This library is for educational purposes only. It is not affiliated with or endorsed by Jakdojade. Use responsibly.
