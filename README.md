# Project Taranaki

A tool to score upcoming time windows of visibility for long lines of sight based on weather forecasts.

## Background

I developed this tool to improve my chances of photographing Mount Taranaki from Donald Mclean Lookout at the southern end of the Waitakere Ranges in west Auckland. At a distance of 257km across the near Tasman Sea, it's definitely possible, and there are mentions on the internet of people seeing it from Donald Mclean Lookout, but as far as I know there is no photograph of this line of sight.

I do know that you'd need an exceptionally clear day, with no rain or cloud cover but also cool dry air, very low relative humidity, and no sea haze. Your chances would be greater at dawn or dusk, as Taranaki may have greater contrast with the sky behind it and it is likely to be cooler, avoiding heat shimmer.

Even in perfect conditions, Taranaki would be a tiny peak on the horizon. In fact, it is so far away that you're reliant on some refraction - where the bending of light extends a line of sight over the curvature of the Earth by a few tens of kilometres - to even see it. With standard refraction, only a bit over 10% of Taranaki's elevation would be visible, and so my ultra-long-zoom Nikon P950 camera will be required to make out a discernable peak from so far away.

This tool helps me identify these ideal conditions automatically so I know when it's worth driving out to try and get the shot, though I've developed it in a way that it can be used for other lines of sight.

## Setup

Run this command:
```
npm install
```
Then, work from `config.json` to configure the tool for your line of sight (LOS).

An `origin` and `target` are required. Elevations are in metres.

If your LOS is not in New Zealand, add a timezone to your config too.
```json
{
  "timezone": "Pacific/Auckland",
  "origin": {
    "label": "Donald Mclean Lookout",
    "latitude": -37.01568314501544,
    "longitude": 174.53970326117354,
    "elevation": 328
  },
  "target": {
    "label": "Mount Taranaki",
    "latitude": -39.29621159981697,
    "longitude": 174.06380458851328,
    "elevation": 2518
  }
}
```

If you want to have multiple LOS configs on the go, you can create them as additional JSON files in the top-level directory and specify them when running commands.

### Check the feasibility of a line of sight

To check if a particular line of sight is actually feasible, run:

```
npx tsx src/checkFeasibility.ts
```

For the default Donald Mclean to Taranaki line of sight and default refraction, this will give you an output of:
```
Determining feasibility with a terrestrial refraction factor of 0.17...
Mount Taranaki is visible from Donald Mclean Lookout! It's a distance of 256.97km.
You may be able to see up to 264.5m of it above the horizon, or 10.5% of its total elevation.
With an angular height of 0.06°, it may be hard to make out in hazy or humid conditions.
```

You can specify a different config and a custom refraction value using optional arguments.

To check the feasibility of the `hawkins.json` config with a more conservative refraction of 0.1, run:
```
npx tsx src/checkFeasibility.ts --config hawkins --refraction 0.1
```

This will give you an output of:
```
Determining feasibility with a terrestrial refraction factor of 0.1...
Mount Taranaki is visible from Hawkin's Hill! It's a distance of 232.94km.
You may be able to see up to 932.8m of it above the horizon, or 37.0% of its total elevation.
```

Please note that there is **no accounting for terrain** in these feasibility calculations. They simply determine whether the target is visible from the origin based on the distance, Earth's curvature, and refraction. It is up to you to figure out if there is a mountain in the way!

### Calculate equidistant points for a line of sight

To improve the accuracy of the tool's forecasts and scoring, you can include points along the line of sight in your config that will also have their weather conditions forecasted and included in the scoring logic. This helps to detect scenarios where a cloud bank or different airmass is in between the origin and target and may therefore impact visibility.

To generate these equidistant points for your `config.json`, run:
```
npx tsx src/calculateEquidistantPoints.ts --points 3
```

3 or 4 is a sensible number of points for most long lines of sight, but you can generate up to 10. As a forecast is fetched for each point, more points increase your risk of reaching an Open-Meteo API rate limit later on.

As before, you can also specify a different config file to generate points for:
```
npx tsx src/calculateEquidistantPoints.ts --config hawkins --points 2
```

## Usage

### Script and Arguments
```
npx tsx src/scoreForecasts.ts
```

There are a few arguments you can provide to adjust what the script does:

| Argument     | Notes    |
| ------------- | ------------- |
| `--config <config>` | Run it for a different LOS config file. Default: `config.json` |
| `--days <1-7>` | Fetch forecasts for a different number of days. Default: 3 |
| `--notifyAtThreshold <0-100>` | If a **Gmail** email and app password are set as environment variables, send an email when a score in the output exceeds this threshold. Default: No email sent |
| `--asAtDate <YYYY-MM-DD>` | Fetch and score forecasts for a **single day** in the past. Useful for calibrating a LOS config based on a previous successful photo. Default: Not set |
| `--dawnDuskOnly <true/false>` | Only score and show forecasts near sunrise and sunset. Default: true |

### Output

Here's an example output of 7 forecast days limited to dawn/dusk time windows:
```
Fetching forecasts...
[x] 16:00 Sun 26 Apr scores 0 (Too much low cloud, max 69%)
[x] 17:00 Sun 26 Apr scores 0 (Too much low cloud, max 85%)
[x] 18:00 Sun 26 Apr scores 0 (Too much low cloud, max 80%)
[x] 07:00 Mon 27 Apr scores 0 (Too much low cloud, max 63%)
[x] 08:00 Mon 27 Apr scores 0 (Too much low cloud, max 43%)
[x] 16:00 Mon 27 Apr scores 0 (Too much low cloud, max 96%)
[x] 17:00 Mon 27 Apr scores 0 (Too much low cloud, max 67%)
[x] 18:00 Mon 27 Apr scores 0 (Too much low cloud, max 34%)
[x] 07:00 Tue 28 Apr scores 0 (Minimum dew point spread too low, 0.1°)
[x] 08:00 Tue 28 Apr scores 0 (Minimum dew point spread too low, 0.1°)
[x] 16:00 Tue 28 Apr scores 0 (Too much low cloud, max 73%)
[x] 17:00 Tue 28 Apr scores 0 (Too much low cloud, max 65%)
[x] 18:00 Tue 28 Apr scores 0 (Too much low cloud, max 66%)
[x] 07:00 Wed 29 Apr scores 0 (Too much low cloud, max 38%)
[x] 08:00 Wed 29 Apr scores 0 (Too much low cloud, max 45%)
[x] 16:00 Wed 29 Apr scores 0 (Too much low cloud, max 61%)
[x] 17:00 Wed 29 Apr scores 0 (Too much low cloud, max 68%)
[x] 18:00 Wed 29 Apr scores 0 (Too much low cloud, max 63%)
[x] 07:00 Thu 30 Apr scores 0 (Too much low cloud, max 56%)
[x] 08:00 Thu 30 Apr scores 0 (Too much low cloud, max 48%)
[x] 16:00 Thu 30 Apr scores 0 (Too much low cloud, max 39%)
[x] 17:00 Thu 30 Apr scores 0 (Too much low cloud, max 40%)
[x] 18:00 Thu 30 Apr scores 0 (Too much low cloud, max 41%)
[x] 07:00 Fri 01 May scores 20 (Base score 20 from minimum dew point spread of 2.2°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 08:00 Fri 01 May scores 32 (Base score 33 from minimum dew point spread of 3.0°, adjusted by boundary layer multiplier of 0.98 and haze multiplier of 1.00)
[*] 09:00 Fri 01 May scores 50 (Base score 53 from minimum dew point spread of 4.2°, adjusted by boundary layer multiplier of 0.93 and haze multiplier of 1.00)
[x] 16:00 Fri 01 May scores 38 (Base score 38 from minimum dew point spread of 3.3°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 17:00 Fri 01 May scores 40 (Base score 40 from minimum dew point spread of 3.4°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 18:00 Fri 01 May scores 0 (Sun too low)
[x] 07:00 Sat 02 May scores 23 (Base score 23 from minimum dew point spread of 2.4°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 08:00 Sat 02 May scores 10 (Base score 10 from minimum dew point spread of 1.6°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 09:00 Sat 02 May scores 3 (Base score 3 from minimum dew point spread of 1.2°, adjusted by boundary layer multiplier of 1.00 and haze multiplier of 1.00)
[x] 16:00 Sat 02 May scores 0 (Too much low cloud, max 44%)
[x] 17:00 Sat 02 May scores 0 (Too much low cloud, max 46%)
[x] 18:00 Sat 02 May scores 0 (Sun too low)
```

Most forecasted hourly time windows fail and score 0 with the reason noted.

Some time windows have a non-zero score, meaning there aren't any "hard blockers" along the line of sight.

Any scores at or above 50 are shown with a `[*]` indicator.

### Advice

While you can forecast up to 7 days out, **the accuracy of key measurements are limited beyond 3 days or so**. For this reason I run the tool on Friday mornings with the default 3 forecast days to cover the weekend. If any time windows look promising, you should run the tool again an hour or two beforehand to recalculate the scores with the most up-to-date forecasts, as the weather can change quickly, particularly in Auckland.

## Scoring Logic

The tool uses a variety of variables from [Open-Meteo's hourly weather forecast API](https://open-meteo.com/en/docs) measured at the origin, target, and points between them to calculate its scores for each time window or rule them out entirely.

### Hard failure cases

| Variable | Default Failure Threshold | Notes |
| -------- | ------------------------- | ----- |
| Sun altitude | Min of -5° | If the sun is too low below the horizon, it is too dark to see the target. |
| Azimuth difference between the sun and target | <30° when sun below -5° altitude, <10° when sun below -10° altitude | If you're looking directly into the sun, you can't see the target. |
| Low cloud | More than 30% at any point, except at the target if it is high elevation | Low cloud banks will block the view of the target, unless they are at the target and below the horizon. |
| Total cloud cover | More than 50% at any point | Too much total cloud cover will block the view of the target. |
| Mid cloud at target | More than 20% | Mid-level cloud at the target will obscure its distinct outline even if otherwise clear along the LOS. |
| Rain at target | More than 0.1mm | Like above, rain at the target will obscure it. |
| Rain | More than 0.3mm at any point | Rain along the LOS will obscure the target. |
| Visibility | Less than 10,000m at any point | If something meaningfully impacts visibility as measured by weather models, the target will be obscured. |
| Wind speed at 10m | More than 40km/h, except at the target if it is high elevation | High winds near sea level may generate aerosols (sea spray) that over long distances may obscure the target. |
| Lifted index | Less than 0.1 | A lifted index below zero means the air is unstable, creating optical distortion / shimmer. |
| Dew point spread | Less than 1 at any point, or less than 2.5 when visibility is also reduced | A very low dew point spread indicates high humidity and therefore hazy conditions, likely obscuring the target. |
| Aerosol optical depth | More than 0.3 at any point | Very low air quality, as measured by aerosol optical depth, indicates a thick haze that will block the target. |

### Dew point spread and the boundary layer height

If none of the hard failure cases above are met, then chances are there is nothing directly blocking the view of the target. This is where we then use more nuanced variables to calculate a score between 0 and 100 that gives an indication of just how clear the line of sight will be in the time window.

The **dew point spread**, the difference between the air temperature and the dew point, is a measure of humidity. A lower dew point spread indicates higher humidity and therefore hazy/foggy conditions, while a higher dew point spread indicates clear, dry air. By default, time windows with a minimum spread below 1 fail completely, those with a minimum spread over 7 will score 100, with spreads in between scaled linearly to get the score.

This score is then adjusted with a **boundary layer height** multiplier. The planetary boundary layer is the lowest part of the atmosphere that contains the bulk of the aerosols and humidity, and so being within it at the origin can impact how clear the view of the target will be. This multiplier is based on the ratio of the origin elevation and the forecasted boundary layer height. If the origin is above or just below the boundary layer height, there is a limited impact on the final score, but if the origin is deeper into the boundary layer, it may meaningfully reduce the final score.

You may still get a great shot while within the boundary layer, so by default there is a max penalty of 70% of the original score, meaning the worst possible boundary layer height multiplier would reduce a dew point spread score of 100 down to 70.

Finally, the score is again adjusted by a **haze** multiplier, with haze being measured by the aerosol optical depth from Open Meteo's air quality API. This is used to penalise time windows that may have a high dew point spread but have aerosols caused by sea salt or smoke/dust in the air that could obscure the view of the target. There is a max penalty of 50% on the dew point spread + boundary layer score.

### Customising the scoring logic

You can override any or all of the default thresholds and other values used in the scoring calculation by including a `scoring` object in your line of sight's configuration file. This can be good for adjusting to specific geographies where conditions may be more or less forgiving than the defaults that have been calibrated for Donald Mclean to Mount Taranaki.

For example, if the default cloud cover thresholds are too strict:

```json
{
  // timezone, origin, target, points
  "scoring": {
    "maxLowCloud": 60,
    "maxTotalCloudCover": 80
  }
}
```

[Check the structure of the default config](/src/forecasts/score.ts) to see what you can adjust for your LOS.

## Calibration based on successful photos of other sightlines

While I don't know of any photos of Taranaki from Donald Mclean, there are a handful of great photos of Taranaki from hills in and around Wellington at slightly shorter distances (205-235km). These were useful in calibrating the scoring logic, with the time windows getting intuitive scores:

* [Brendon from 3kiwi's July 2015 shot from Paekakariki Hill Road](https://2kiwis.nz/2015/07/clear-air-views/) scores a **74**, with exceptionally clear dry air but being somewhat in the boundary layer.
* [Lilia Alexander's May 2020 shot from Wrights Hill](https://theviewshed.com/?view=12112) scores a **64**, with clear conditions but being partially in the boundary layer.
* [Robin Bodley's Dec 2022 shot from Hawkin's Hill](https://theviewshed.com/?view=12246) scores between **23 and 8**, with fairly hazy summer conditions.

The non-trivial extra distance from Donald Mclean and therefore greater reliance on refraction and clear air means that replicating Robin's conditions would likely make Taranaki very difficult to see, justifying its score under the default threshold of 50, while Lilia's conditions or better would give you a good chance of a great shot.

You can use the `asAtDate` argument to score historical time windows for further calibration:
```
npx tsx src/scoreForecasts.ts --config hawkins --asAtDate 2022-12-28
```

## Visualise a time window forecast

To visualise the line of sight of a specific time window, run:

```
npx tsx src/visualiseForecast.ts --time "2026-04-26T14:00"
```

This will output a visualisation of low and mid cloud cover and the boundary layer height at each point, with other key metrics shown below. It can be used to identify what measurement at which point has failed or lowered the score of a particular time window.

Your time window must be within 7 days or historical to visualise it.

```
Fetching 1 day(s) of forecasts for 2026-04-26 14:00 (Pacific/Auckland)...

Time: 14:00 Sun 26 Apr 2026 (Pacific/Auckland)

Elevation
             4000m | 
                   | 
                   | 
                   | 
         Mid Cloud |   0%                         0%                  0%                  0%                  0%                         0%
                   | 
                   |                                                                                                                      ^
                   |                                                                                                              [ 2518m ]
                   | 
             2000m | 
                   | 
                   | 
                   | 
         Low Cloud |   4%                         16%                 18%                 13%                 28%                       69%
                   |                                               ==== 805m
                   |                           ==== 775m                               ==== 760m
                   |                                                                                       ==== 555m
                   |   [ 328m ]
                0m |   ==== 95m                                                                                                    ==== 80m

                   |   Origin                   Point 1             Point 2             Point 3             Point 4                  Target
-----------------------------------------------------------------------------------------------------------------------------------------------
     Precipitation |   0.0mm                     0.0mm               0.0mm               0.0mm               0.0mm                    0.0mm
       Total Cloud |   4%                         16%                 18%                 13%                 28%                       69%
        Visibility |                                                                                                                   ~1km
        Wind Speed |   5km/h                    15km/h              10km/h              11km/h               6km/h                    3km/h
      Lifted Index |   7.90                      5.40                5.50                6.10                5.90                      9.20
  Dew Point Spread |   1.4°                      5.0°                5.4°                4.8°                3.7°                      0.0°
 Air Quality (AOD) |   0.04                      0.05                0.05                0.06                0.07                      0.07
```

## AI Usage

Gemini and ChatGPT models were used for:
* Advice on what weather variables to measure for my forecasts and how the scoring logic could work.
* TypeScript functions for the maths-heavy calculations in `/src/calc`, with some revisions by me.
* Code reviews and generally sense-checking my approach and implementation.
