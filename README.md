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

An `origin` and `target` are required, the other configuration options can either be generated or have default values.

Elevations are in metres, and in general the tool uses metric units.

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
| `--idealLightingOnly <true/false>` | Only score and show forecasts near sunrise and sunset. Default: true |

### Output

Here's an example output of 3 forecast days with ideal lighting for the default line of sight:
```
Fetching forecasts...
[x] 7am, Thu 05 Feb scores 0 (Too much low cloud, max 100%)
[x] 8am, Thu 05 Feb scores 0 (Too much low cloud, max 100%)
[x] 7pm, Thu 05 Feb scores 0 (Too much low cloud, max 100%)
[x] 8pm, Thu 05 Feb scores 0 (Too much low cloud, max 100%)
[x] 7am, Fri 06 Feb scores 0 (Too much low cloud, max 37%)
[x] 8am, Fri 06 Feb scores 0 (Too much low cloud, max 42%)
[x] 7pm, Fri 06 Feb scores 0 (Too much low cloud, max 47%)
[x] 8pm, Fri 06 Feb scores 0 (Too much low cloud, max 36%)
[x] 7am, Sat 07 Feb scores 45 (Dew point spread score 38, visibility score 100)
[x] 8am, Sat 07 Feb scores 40 (Dew point spread score 34, visibility score 100)
[x] 7pm, Sat 07 Feb scores 0 (Too much low cloud, max 75%)
[x] 8pm, Sat 07 Feb scores 0 (Too much low cloud, max 77%)
```

Most forecasted hourly time windows fail and score 0 with the reason noted.

Two time windows have a non-zero score, meaning there aren't any "hard blockers" such as an unfavourable sun position, rain or cloud cover along the line of sight, low visibility, or high humidity.

The score is made up of two components:

* The dew point spread score, a rough proxy for humidity and therefore likely haze, with a 90% weight.
* The visibility score, based on Open-Meteo's visibility variable, with a 10% weight.

As visibility caps out at 24km, at least for the weather models used in New Zealand, it has a very low weight, leaving the dew point spread to provide most of the nuance for the final score.

With both non-zero scores being below 50 (and this not being overridden with a notify threshold) they are still shown with an `[x]` indicator. Any scores at or above 50 are shown with a `[*]` indicator. You may well be able to see Mount Taranaki with on these scores, but haze would make it very difficult to make out.

### Advice

While you can forecast up to 14 days out, **the accuracy of key measurements are limited beyond 3 days or so**. For this reason I run the tool on Friday mornings with the default 3 forecast days to cover the weekend. If any time windows look promising, you should run the tool again just a few hours beforehand to recalculate the scores with the most up-to-date forecasts, as the weather can change quickly, particularly in Auckland.

## Calibration based on successful photos of other sightlines

While I don't know of any photos of Taranaki from Donald Mclean, there are a handful of great photos of Taranaki from hills in and around Wellington at slightly shorter distances (~230km). These were useful in calibrating the scoring logic, with the time windows getting intuitive scores:

* [Lilia Alexander's May 2020 shot from Wrights Hill](https://theviewshed.com/?view=12112) scores a **71**, reflecting the very clear conditions.
* [Robin Bodley's Dec 2022 shot from Hawkin's Hill](https://theviewshed.com/?view=12246) scores between **29 and 17**, reflecting the fairly hazy conditions.

The non-trivial extra distance from Donald Mclean and therefore greater reliance on refraction and clear air means that replicating Robin's conditions would likely make Taranaki very difficult to see, justifying its score under the default threshold of 50, while Lilia's conditions or better would give you a good chance of a great shot.

You can use the `asAtDate` argument to score historical time windows for further calibration:
```
node build/scoreForecasts --config hawkins --asAtDate 2022-12-28
```

## AI Usage

ChatGPT 5.1 was used for:
* Advice on what weather variables to measure for my forecasts and how the scoring logic could work.
* TypeScript functions for the maths-heavy calculations in `/src/calc`, with some revisions by me.
* Code reviews and generally sense-checking my approach and implementation.
