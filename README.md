# NYC Traffic Dashboard 🚦

Interactive web application for visualizing traffic volume and collision data in New York City.

## Features

- **Interactive Map** - Mapbox GL JS powered map showing traffic volumes as colored lines
- **Time Slider** - Explore traffic patterns across 24 hours with animation support
- **Collision Data** - View traffic collision locations with detailed popups
- **Analytics Panel** - 11 different charts and visualizations including:
  - Traffic volume by borough
  - Hourly traffic patterns
  - Collision heatmap (day × hour)
  - Monthly collision trends
  - Top contributing factors
  - And more...
- **Filtering** - Filter by borough, date range, and data layers

## Tech Stack

- **Frontend**: Vanilla JavaScript, Mapbox GL JS, D3.js
- **Backend**: Node.js, Express
- **Data**: NYC Open Data API (Socrata)

## Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Open browser
open http://localhost:3000
```

## Deployment

This project is configured for deployment on Render.com:

1. Push to GitHub
2. Connect repo to Render
3. Set build command: `npm install`
4. Set start command: `npm start`

## Data Sources

- [Automated Traffic Volume Counts](https://data.cityofnewyork.us/Transportation/Automated-Traffic-Volume-Counts/7ym2-wayt)
- [Motor Vehicle Collisions - Crashes](https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95)
- [LION - NYC Street Centerline](https://data.cityofnewyork.us/City-Government/LION/2v4z-66xt)

## Author

Andrea Budić - Master's Thesis Project  
University of Split, Faculty of Science
