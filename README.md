# LINEA

This project features visualization of different data in context of avalanche warning, but can also used in other context. On the basis of [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) several graphic representations are implemented. The project divides into two submodules:

1. Visualizations of meteorological data, such as automated weather stations. The visualization is defined by the [LAWIS](https://https://www.lawis.at/) work group.
   The data has to be available as smet-file, see the [specification of the smet format](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf).

The package offers one complex web component to show:

- `<linea-plot src="...smet">` is rendering weather station data using [uPlot](https://github.com/leeoniya/uPlot), see **Usage** for its usage.

2. Visualization of different statistics in context:

- `<aws-observations smet="...smet" observations="...geojson">` is rendering counts of observations and avalanches with precipitation data from a weather station
- `<aws-danger-rating bulletins="[...]">` is rendering the highest danger rating for different micro regions over a timespan
- `<aws-danger-rating-altitude bulletins="[]">` is rendering the danger rating in dependency of the altitude as heatmap

## Featuring

LINEA is featuring weather station visualization on:

- https://avalanche.report/weather/stations
- https://eaws-bulletin-map.legner.me/?stations=1

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

Install the @albina-euregio/linea package via https://gitlab.com/albina-euregio/linea/-/packages, or include the latest version via https://albina-euregio.gitlab.io/linea/linea.mjs
`<script type="module" src="https://albina-euregio.gitlab.io/linea/linea.mjs"></script>`
or for awsstats https://albina-euregio.gitlab.io/linea/aws-stats.mjs
`<script type="module" src="https://albina-euregio.gitlab.io/linea/aws-stats.mjs"></script>`

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
- `showinteractiveblogexport`- in combination with `showexport` it shows a button to export a wordpress shortcode, which can be used together with the `linea-plot-blog.php` plugin for Wordpress. See Export options for more details.

If the data from `src` is not a subset from `lazysrc`, the inital view for the user is not changed after loading and replacing the data from `src` with data from `lazysrc` element. Available dates for the date picker are updated to timespan of data of `lazysrc` element. Clicking the previous/next week button for the first time lead to a zoom to the whole available timespan of the data of `lazysrc` element.

#### Export options

The export allows to create png and iframe files from the shown plots. There are selections available to export only specific stations or specific plots.
For png export it is possible to adjust the width, height and title of the plot. The png file is in a similar style to the former wiskiplot with a combined title, legend at the bottom and a background color for the first station.

An exported `Embed Code (iframe)` is useable in a website. To use in wordpress, place a _individual HTML_ block in a _group_ block. The _group_ block aligns the iframe correctly centered.

The export option `Embed Code (blog)` is useable in a wordpress blog, where the `linea-plot-blog.php` plugin is installed. Therefore, per default it should not be shown.

#### Examples

Minimal working example:
Shows the whole dataset which is in the smet source file. Does not show surface hoar potential, datepickers, export functions.

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

Each visualization chart is doing it's own data aggregation, but not fetching. All charts have standardized attributes to receive data of one of the following types:

- `weather` attribute requires a JSON encoded Result object which is found in `/data/smet-data` and features data from one station.
- `bulletins` requires a JSON encoded [CAAML V6 JSON](http://caaml.org/Schemas/BulletinEAWS/v6.0/json/CAAMLv6_BulletinEAWS.json) array
- `observations` requires the content of a `observations.geojson` as it is produced by the ALBINA Admin GUI
- `dangersources` is not implemented due to lack of json format for now

#### Visualization

##### `<aws-observations>`

Attributes:

- `observations`, required
- `weather`, optional: data from a weather station containing a PSUM value

Visualization:
Observations are counted per day and shown as bar plot. They are filtered for avalanche oberservations and this is shown as a seperate series too.
If weather data with a PSUM value is present the precipitation is summed up for each day and shown as light background series to have a reference to precipitation events.

##### `<aws-danger-rating>`

Attributes:

- `bulletins`, required
- `bulletins-filter-micro-region`, optional: JSON encoded string array with micro region ids, e.g. `'["AT-07-14-01", "AT-07-01]'`

Visualization:
Displayed is the highest danger rating of the latest bulletin from each day per day. If the filter micro regions are set, this is done seperately for each micro region and plotted.

##### `<aws-danger-rating-altitude>`

Attributes:

- `bulletins`, required: To make sense, this has to be an array of bulletins from one specific micro region

Visualization:
Displays the altitude dependency of the danger rating for each day.

#### `<aws-stats-wrapper`>

Helper web component which does data fetching and filtering. Supports the following attributes and converts them into the standardized attributes for the visualization.

Attributes:
`html
<aws-stats-wrapper
chart-type="aws-observations,aws-danger-rating,aws-danger-rating-altitude"
observations="./observations.geojson"
stationsrc="https://api.avalanche.report/lawine/grafiken/smet/winter/AXLIZ1.smet.gz"
bulletin-start-date="2026-01-01"
bulletin-end-date="2026-03-18"
bulletin-filter-micro-region='["AT-07-14-01", "AT-07-01", "AT-07-27", "AT-07-14-02", "AT-07-15", "AT-07-17-01"]'

> </aws-stats-wrapper>
> `

The charts in `chart-type` are appended after data fetching into the wrapper component. The other ones ares self-explanatory.

# Miscellaneous

## Installing the wordpress plugin

To install the wordpress `linea-plot-blog.php` plugin simply go to your wordpress installations `wp-content` folder and copy the plugin file into `mu-plugins` (create folder, if no exists). Then reload your webserver.
For apache `systemctl reload apache2` is enough to load it.

The plugin is neccessary, because wordpress disabled custom javascript for almost all users. For more details visit [the wordpress wp_kses documentation](https://developer.wordpress.org/reference/functions/wp_kses/).
