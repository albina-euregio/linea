# LINEA

LINEA provides web components for weather-station plots and avalanche-warning statistics. The visualization is done using the [uPlot](https://github.com/leeoniya/uPlot) library.

The project is split into two main modules:

1. Weather station visualization (`linea.mjs`)

- Main component: `<linea-plot>`
- Data format: SMET ([specification](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf))
- Integrates AROME forecasts from the Geosphere Austria
- Visualize the mesured data and yearly overview
- Support lazy loading of greater timespans

2. Avalanche statistics visualization (`aws-stats.mjs`)

- Wrapper component: `<aws-stats-wrapper>`
- Multiple chart components for observations, danger ratings, products, patterns, activity, stress level, and danger-source-variant analytics
- `<aws-stats-wrapper>` fetches input data and mounts one or more `aws-*` chart components.

3. Fetching of weather station listings (`cli.mjs`)

![Screenshot_2026-04-15_at_18-36-08_linea](https://gitlab.com/-/project/70517866/uploads/8267516a09e03edc1a87b03f54749618/Screenshot_2026-04-15_at_18-36-08_linea.png)

![Aws-stats](https://gitlab.com/-/project/70517866/uploads/d6c0330c9e2d61fdcb54ae2f7c3c3ade/grafik.png)

## Featuring

LINEA is featuring weather station visualization on:

- https://avalanche.report/weather/stations
- https://eaws-bulletin-map.legner.me/?stations=1

## Usage: integrating weather stations in albina-website

1. Provide a weather station listing in the GeoJSON format specified in https://albina-euregio.gitlab.io/linea/listing.schema.json (`src/schema/listing.ts`)
2. For each weather station, provide SMET files for short-range and winter views (optionally also full-range data for lazy loading).

Examples: https://static.avalanche.report/weather_stations/linea.geojson, https://api.avalanche.report/lawine/grafiken/smet/woche/GGAL1.smet.gz, https://api.avalanche.report/lawine/grafiken/smet/winter/GGAL1.smet.gz, https://api.avalanche.report/lawine/grafiken/smet/woche/GGAL2.smet.gz, https://api.avalanche.report/lawine/grafiken/smet/winter/GGAL2.smet.gz

![Test](https://gitlab.com/-/project/70517866/uploads/3602e37b19ce37112b0bfc2bd2e7d048/Weather_Stations_Avalanche.report.jpg)

## Usage: CLI

```sh
> pnpm build:cli
> node src/cli/dist/cli.mjs
Writing 1302 features to linea.geojson
```

## Contributing

1. Install [NodeJS](https://nodejs.org/en/) and [pnpm](https://pnpm.io/)
2. Run `pnpm install`
3. Run `pnpm dev`
4. Open browser at http://localhost:5173/
5. Run `pnpm build`

## Deployment

1. Build project
2. Or download the [build artifacts from GitLab CI](https://gitlab.com/albina-euregio/linea/-/jobs/artifacts/master/file/package.tgz?job=build)
3. Transfer `demo.html` and `dist/` to the webserver

## Translation

This project uses Transifex for its translations: https://app.transifex.com/albina-euregio/albina-website/linea/

To interact with Transifex, install the official [transifex-client](https://github.com/transifex/cli).

## Usage

Install `@albina-euregio/linea` from the GitLab package registry,
or use the prebuilt browser bundles:

- https://albina-euregio.gitlab.io/linea/linea.mjs
- https://albina-euregio.gitlab.io/linea/aws-stats.mjs

```html
<script type="module" src="https://albina-euregio.gitlab.io/linea/linea.mjs"></script>
<script type="module" src="https://albina-euregio.gitlab.io/linea/aws-stats.mjs"></script>
```

Package exports:

- `@albina-euregio/linea`
- `@albina-euregio/linea/linea`
- `@albina-euregio/linea/aws-stats`
- `@albina-euregio/linea/providers`
- `@albina-euregio/linea/listing`
- `@albina-euregio/linea/aws-stats-plot-config`

### `<linea-plot>`

To use the `<linea-plot>` component, include it in your HTML with the `src` attribute pointing to your SMET file:

#### Attributes

- `data` {string} - JSON-encoded array of Result objects (optional, either this or the `src` attribute)
- `src` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from (optional, either this or the `data` attribute or `wintersrc` in combination with `showonlywinter`)
- `lazysrc` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from Happens after the component is rendered and has the data from the `src` attribute (data from `src`attribute is replaced by data from `lazysrc` attribute). The data from `src` should be a subset from `lazysrc`. (optional)
- `wintersrc` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch winter data from (optional). If missing, there is no option to switch to the yearly overviews.
- `showonlywinter` {string} - When present, just the winter view is shown. Just in combination with `wintersrc`.
- `showdatepicker` {boolean} - When present, displays date range picker controls for filtering data
- `showtitle` {boolean} - When present, display the station name and altitude as title
- `backgroundcolors` {string} - JSON-encoded array with colorcodes for the background color in the plots, same order as the SMET files.
  If there are more SMET files than colorcodes for the other stations there is no background color set. Per default the first station is set in light grey, if there is more than one.
- `showsurfacehoarseries` {boolean} - When present, display a series which shows the surface hoar potential
- `showexport` - toggles if the export button is shown
- `showinteractiveblogexport` - in combination with `showexport` it shows a button to export a wordpress shortcode, which can be used together with the `linea-plot-blog.php` plugin for Wordpress. See Export options for more details.
- `forecast-latlon` {string} - forecast coordinates in `lat,lon` format.
  Supported formats:
  - single value, e.g. `"47.180105,11.288011"` (applies to all stations)
  - JSON array, e.g. `'["47.180105,11.288011", "46.90,10.90"]'` (one per station)
    Use `null` or empty entries in array mode to skip forecast for a station.

If the data from `src` is not a subset from `lazysrc`, the inital view for the user is not changed after loading and replacing the data from `src` with data from `lazysrc` element. Available dates for the date picker are updated to timespan of data of `lazysrc` element. Clicking the previous/next week button for the first time lead to a zoom to the whole available timespan of the data of `lazysrc` element.

#### Export options

The export allows to create png and iframe files from the shown plots. There are selections available to export only specific stations or specific plots.
For png export it is possible to adjust the width, height and title of the plot. The png file is in a similar style to the former wiskiplot with a combined title, legend at the bottom and a background color for the first station.

An exported `Embed Code (iframe)` is useable in a website. To use in wordpress, place a _individual HTML_ block in a _group_ block. The _group_ block aligns the iframe correctly centered.

The export option `Embed Code (blog)` is useable in a wordpress blog, where the `linea-plot-blog.php` plugin is installed. Therefore, per default it should not be shown. Also the embedding site needs to provide this `css` code:

```css
/* ── LINEA Blog export overlay ──────────────────────────────────── */
[data-lineaplot-wrapper]:has(.linea-custom-element) > img {
  display: none;
}
```

#### Measurements

To do quick analyzes of the displayed weather data there is a small measurement tool implemented. To use the tool, simply click into a chart and set the two borders by pressing key '1' and '2'. As soon both are set, a label shows up, per default with the difference between both points for the different series.
Following actions can be performed further:

- Press <kbd>d</kbd> to switch to delta mode -> total difference between the two datums: `y2-y1`
- Press <kbd>i</kbd> to switch to integral mode -> `∫ [series.values] dt`, unit is `unit*hours`
- Press <kbd>m</kbd> to switch to mean mode -> mean for each series between the datums that are marked: `(y1+y2)/2`
- Press <kbd>s</kbd> to switch to series mean mode -> mean by `∑ [series.values] / [series.length]`
- Press <kbd>x</kbd> to clear datums
- Press <kbd>Escape</kbd> to clear datums

In the `png` export the markers stay!

#### Examples

Minimal working example:
Shows the whole dataset which is in the SMET source file. Does not show surface hoar potential, datepickers, export functions.

```html
<linea-plot src="data/station1.smet"> </linea-plot>
```

Maximum example, uses every available attribute:

```html
<!-- Display all data with date picker -->
<linea-plot
  src='["data/station1.smet", "data/station2.smet"]'
  backgroundcolors='["#b31c1c2b", "rgba(0, 0, 0, 0.05)"]'
  showdatepicker
  showsurfacehoarseries
  showtitle
  showexport
  forecast-latlon='["47.180105,11.288011"]'
>
</linea-plot>
```

Shows a fixed date span from the given smet file:

```html
<!-- Fixed date view without picker -->
<linea-plot src="data/station1.smet"> </linea-plot>
```

#### `<linea-plot>` yearly overview

For yearly overviews, use the `<linea-plot>` component like this:

```html
<!-- Handle winterview -->
<linea-plot wintersrc="/prototype/mock.data" showtitle showexport showdatepicker showonlywinter>
</linea-plot>
```

### aws-statistics

Each chart handles its own aggregation and visualization.
Data can be provided directly to a chart component via the `data` attribute, but must match the `PlotInformation` interface of each chart, or fetched and distributed by `<aws-stats-wrapper>`.

Common input attributes used by charts:

- `weather` - JSON encoded station weather data
- `bulletins` - JSON encoded [CAAML V6 JSON](http://caaml.org/Schemas/BulletinEAWS/v6.0/json/CAAMLv6_BulletinEAWS.json) array
- `observations` - content of `observations.geojson`
- `danger-source-variants` - JSON encoded danger source variant records
- `filter-micro-region` - JSON encoded micro-region ID array
- `region-code` - region selector used by micro-region charts

#### Implemented chart components

- `<aws-observations>`
- `<aws-danger-rating>`
- `<aws-danger-rating-altitude>`
- `<aws-danger-rating-distribution>`
- `<aws-avalanche-activity-index>`
- `<aws-danger-rating-micro-regions>`
- `<aws-danger-rating-micro-regions-bars>`
- `<aws-products>`
- `<aws-danger-pattern-micro-regions>`
- `<aws-avalanche-problem-micro-regions>`
- `<aws-danger-rating-danger-source-variants>`
- `<aws-danger-source-variants-matrix-parameter-avalanche-size>`
- `<aws-danger-source-variants-matrix-parameter-frequency>`
- `<aws-danger-source-variants-matrix-parameter-stability>`
- `<aws-stress-level>`

#### `<aws-stats-wrapper>`

Helper web component which does data fetching/forwarding and appends the requested chart elements.

Supported attributes:

- `chart-type` (required): comma-separated chart tags to render
- `observations`: URL to observations GeoJSON
- `stationsrc`: URL to one SMET station source
- `bulletins`: JSON string with bulletins
- `danger-source-variants`: JSON string with danger source variants
- `stress-level`: JSON string with stress-level records
- `region-code`: region selector
- `filter-micro-region`: JSON array of micro-region IDs
- `start-date`: date boundary (`YYYY-MM-DD`)
- `end-date`: date boundary (`YYYY-MM-DD`)
- `virtual-trainings`, `field-trainings`, `blogs`: JSON strings used by products charts

Example:

```html
<aws-stats-wrapper
  chart-type="aws-observations,aws-danger-rating,aws-danger-rating-altitude"
  observations="./observations.geojson"
  stationsrc="https://api.avalanche.report/lawine/grafiken/smet/winter/AXLIZ1.smet.gz"
  bulletins="[<JSON-string array of JSON_V6 Caaml bulletins>]"
  start-date="2026-01-01"
  end-date="2026-03-18"
  filter-micro-region='["AT-07-14-01", "AT-07-01", "AT-07-27", "AT-07-14-02", "AT-07-15", "AT-07-17-01"]'
></aws-stats-wrapper>
```

The chart tags listed in `chart-type` are appended after data has been loaded and mapped to chart attributes.

## Installing the Wordpress plugin

To install the wordpress `linea-plot-blog.php` plugin simply go to your wordpress installations `wp-content` folder and copy the plugin file into `mu-plugins` (create folder, if no exists). Then reload your webserver.
For Apache `systemctl reload apache2` is enough to load it.

The plugin is necessary, because wordpress disabled custom javascript for almost all users. For more details visit [the wordpress wp_kses documentation](https://developer.wordpress.org/reference/functions/wp_kses/).
