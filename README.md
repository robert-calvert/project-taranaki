# Project Taranaki

A tool to score upcoming time windows of visibility for long lines of sight based on weather forecasts.

## Background

I developed this tool to improve my chances of photographing Mount Taranaki from Donald Mclean Lookout at the southern end of the Waitakere Ranges in west Auckland. At a distance of 257km across the near Tasman Sea, it's definitely possible, and there are mentions on the internet of people seeing it from Donald Mclean Lookout, but as far as I know there is no photograph of this line of sight.

I do know that you'd need an exceptionally clear day, with no rain or cloud cover but also cool dry air, very low relative humidity, and no sea haze. Your chances would be greater at dawn or dusk, as Taranaki may have greater contrast with the sky behind it and it is likely to be cooler, avoiding heat shimmer.

Even in perfect conditions, Taranaki would be a tiny peak on the horizon. In fact, it is so far away that you're reliant on some refraction - where the bending of light extends a line of sight over the curvature of the Earth by a few tens of kilometres - to even see it. With standard refraction, only a bit over 10% of Taranaki's elevation would be visible, and so my ultra-long-zoom Nikon P950 camera will be required to make out a discernable peak from so far away.

This tool helps me identify these ideal conditions automatically so I know when it's worth driving out to try and get the shot, though I've developed it in a way that it can be used for other lines of sight.

## Setup

Run these commands:
```
npm install
npm run build
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
node build/checkFeasibility.js
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
node build/checkFeasibility.js --config hawkins --refraction 0.1
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
node build/calculateEquidistantPoints.js --points 3
```

3 is a sensible number of points for most long lines of sight, but you can generate up to 10. As a forecast is fetched for each point, more points increase your risk of reaching an Open-Meteo API rate limit later on.

As before, you can also specify a different config file to generate points for:
```
node build/calculateEquidistantPoints.js --config hawkins --points 2
```

## Usage

### Script and Arguments
```
node build/scoreForecasts.js
```

There are a few arguments you can provide to adjust what the script does:

| Argument     | Notes    |
| ------------- | ------------- |
| `--config <config>` | Run it for a different LOS config file. Default: `config.json` |
| `--days <1-14>` | Fetch forecasts for a different number of days. Default: 3 |
| `--notifyAtThreshold <0-100>` | If a **Gmail** email and app password are set as environment variables, send an email when a score in the output exceeds this threshold. Default: No email sent |
| `--asAtDate <YYYY-MM-DD>` | Fetch and score forecasts for a **single day** in the past. Useful for calibrating a LOS config based on a previous successful photo. Default: Not set |
| `--dawnDuskOnly <true/false>` | Only score and show forecasts near sunrise and sunset. Default: true |

### Output

Here's an example output of 3 forecast days limited to dawn/dusk time windows:
```
Fetching forecasts...
[x] 19:00 Mon 26 Jan scores 0 (Too much low cloud, max 79%)
[x] 20:00 Mon 26 Jan scores 0 (Too much low cloud, max 67%)
[x] 21:00 Mon 26 Jan scores 0 (Too much low cloud, max 80%)
[x] 19:00 Tue 27 Jan scores 0 (Too much low cloud, max 75%)
[x] 20:00 Tue 27 Jan scores 0 (Too much low cloud, max 66%)
[x] 21:00 Tue 27 Jan scores 0 (Too much low cloud, max 71%)
[x] 19:00 Wed 28 Jan scores 0 (Too much low cloud, max 26%)
[x] 20:00 Wed 28 Jan scores 37 (Base score 37 from minimum dew point spread of 3.2°, adjusted by boundary layer multiplier of 1.00)
[x] 21:00 Wed 28 Jan scores 35 (Base score 35 from minimum dew point spread of 3.1°, adjusted by boundary layer multiplier of 1.00)
```

Most forecasted hourly time windows fail and score 0 with the reason noted.

Two time windows have a non-zero score, meaning there aren't any "hard blockers" along the line of sight.

With both non-zero scores being below 50 (and this not being overridden with a notify threshold) they are still shown with an `[x]` indicator. Any scores at or above 50 are shown with a `[*]` indicator.

### Advice

While you can forecast up to 14 days out, **the accuracy of key measurements are limited beyond 3 days or so**. For this reason I run the tool on Friday mornings with the default 3 forecast days to cover the weekend. If any time windows look promising, you should run the tool again just a few hours beforehand to recalculate the scores with the most up-to-date forecasts, as the weather can change quickly, particularly in Auckland.

## Scoring Logic

The tool uses a variety of variables from [Open-Meteo's hourly weather forecast API](https://open-meteo.com/en/docs) measured at the origin, target, and points between them to calculate its scores for each time window or rule them out entirely.

### Hard failure cases

| Variable | Default Failure Threshold | Notes |
| -------- | ------------------------- | ----- |
| Sun altitude | Min of -5° | If the sun is too low below the horizon, it is too dark to see the target. |
| Azimuth difference between the sun and target | <30° when sun below -5° altitude, <10° when sun below -10° altitude | If you're looking directly into the sun, you can't see the target. |
| Low cloud | More than 25% at any point, except at the target if it is high elevation | Low cloud banks will block the view of the target, unless they are at the target and below the horizon. |
| Total cloud cover | More than 40% at any point | Too much total cloud cover will block the view of the target. |
| High cloud at target | More than 10% | High cloud at the target will obscure its distinct outline even if otherwise clear along the LOS. |
| Rain at target | More than 0.1mm | Like above, rain at the target will obscure it. |
| Rain | More than 0.3mm at any point | Rain along the LOS will obscure the target. |
| Visibility | Less than 15,000m at any point | If something impacts visibility as measured by weather models, the target will be obscured. |
| Wind speed at 10m | More than 40km/h, except at the target if it is high elevation | High winds near sea level may generate aerosols (sea spray) that over long distances may obscure the target. |
| Lifted index | Less than 0.1 | A lifted index below zero means the air is unstable, creating optical distortion / shimmer. |
| Dew point spread | Less than 1 at any point | A very low dew point spread indicates high humidity and therefore hazy conditions, likely obscuring the target. |

### Dew point spread and the boundary layer height

If none of the hard failure cases above are met, then chances are there is nothing directly blocking the view of the target. This is where we then use more nuanced variables to calculate a score between 0 and 100 that gives an indication of just how clear the line of sight will be in the time window.

The **dew point spread**, the difference between the air temperature and the dew point, is a measure of humidity. A lower dew point spread indicates higher humidity and therefore hazy/foggy conditions, while a higher dew point spread indicates clear, dry air. By default, time windows with a minimum spread below 1 fail completely, those with a minimum spread over 7 will score 100, with spreads in between scaled linearly to get the score.

This score is then adjusted with a **boundary layer height** multiplier. The planetary boundary layer is the lowest part of the atmosphere that contains the bulk of the aerosols and humidity, and so being within it at the origin can impact how clear the view of the target will be. This multiplier is based on the ratio of the origin elevation and the forecasted boundary layer height. If the origin is above or just below the boundary layer height, there is a limited impact on the final score, but if the origin is deeper into the boundary layer, it may meaningfully reduce the final score.

You may still get a great shot while within the boundary layer, so by default there is a max penalty of 70% of the original score, meaning the worst possible boundary layer height multiplier would reduce a dew point spread score of 100 down to 70.

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
node build/scoreForecasts --config hawkins --asAtDate 2022-12-28
```

## AI Usage

Gemini 3 Pro and ChatGPT 5.1 were used for:
* Advice on what weather variables to measure for my forecasts and how the scoring logic could work.
* TypeScript functions for the maths-heavy calculations in `/src/calc`, with some revisions by me.
* Code reviews and generally sense-checking my approach and implementation.
