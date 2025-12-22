# LINEA

Visualizations of meteorological data, such as automated weather stations. The view is defined by the [LAWIS](https://https://www.lawis.at/) work group.
The data has to be available as smet-file, see the [specification of the smet format](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf).

The package offers two [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) to show:

- `<linea-plot src="...smet">` is rendering weather station data using [uPlot](https://github.com/leeoniya/uPlot), see **Usage** for its usage.
- `<linea-plot-year src="...smet">` shows yearly overviews of weather stations, aggregating for the different input parameters

## Featuring

LINEA is featuring weather station visualization on:

- https://avalanche.report/weather/stations
- https://eaws-bulletin-map.legner.me/?stations=1

## Contributing

1. Install [NodeJS](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/)
2. Run `yarn`
3. Run `yarn dev`
4. Open browser at http://localhost:5173/
5. Run `yarn build`

## Deployment

1. Build project
2. Or download the [build artifacts from GitLab CI](https://gitlab.com/albina-euregio/linea/-/jobs/artifacts/master/file/package.tgz?job=build)
3. Transfer `demo.html` and `dist/` to the webserver

## Translation

This project uses Transifex for its translations: https://app.transifex.com/albina-euregio/albina-website/linea/

To interact with Transifex, install the official [transifex-client](https://github.com/transifex/cli).

## Usage

Install the @albina-euregio/linea package via https://gitlab.com/albina-euregio/linea/-/packages, or include the latest version via https://albina-euregio.gitlab.io/linea/linea.js

### `<linea-plot>`

To use the `<linea-plot>` component, include it in your HTML with the `src` attribute pointing to your SMET file:

#### Attributes
- `data` {string} - JSON-encoded array of Result objects (optional, either this or the `src` attribute)
- `src` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from (optional, either this or the `data` attribute)
- `lazysrc` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from Happens after the component is rendered and has the data from the `src` attribute (data from `src`attribute is replaced by data from `lazysrc` attribute). The data from `src` should be a subset from `lazysrc`. (optional)
- `showdatepicker` {boolean} - When present, displays date range picker controls for filtering data
- `showtitle` {boolean} - When present, display the station name and altitude as title
- `backgroundcolors` {string} - JSON-encoded array with colorcodes for the background color in the plots, same order as the SMET files.
  If there are more SMET files than colorcodes for the other stations there is no background color set. Per default the first station is set in light grey, if there is more than one.
- `showsurfacehoarseries` {boolean} - When present, display a series which shows the surface hoar potential
- `startdate` {string} - Initial start date in ISO 8601 format (e.g., "2025-06-04T10:24[Europe/Berlin]").
  If used with `showdatepicker` and `enddate` it will set the initial date range.
  If used without `showdatepicker`, but with `enddate` it will set a fixed date range.
- `enddate` {string} - Initial end date in ISO 8601 format (e.g., "2025-06-04T12:24[Europe/Berlin]").
  If used with `showdatepicker` and `startdate` it will set the initial date range.
  If used without `showdatepicker`, but with `startdate` it will set a fixed date range.
- `showexport` - toggles if the export button is shown

If startdate or enddate is missing it will show all data from the SMET file.
If the startdate is out of bound of the data, it is set to the first available timestamp, simliar enddate is set to the last.

If the data from `src` is not a subset from `lazysrc`, the inital view for the user is not changed after loading and replacing the data from `src` with data from `lazysrc` element. Available dates for the date picker are updated to timespan of data of `lazysrc` element. Clicking the previous/next week button for the first time lead to a zoom to the whole available timespan of the data of `lazysrc` element.#

#### Export options
The export allows to create png and iframe files from the shown plots. There are selections available to export only specific stations or specific plots.
For png export it is possible to adjust the width, height and title of the plot. The png file is in a similar style to the former wiskiplot with a combined title, legend at the bottom and a background color for the first station.

An exported `iframe` is useable in a blog. To use in wordpress, place a _individual HTML_ block in a _group_ block. The _group_ block aligns the iframe correctly centered.

#### Examples

Minimal working example:
Shows the whole datset which is in the smet source file. Does not show surface hoar potential, datepickers, export functions.

```html
<linea-plot
    src='data/station1.smet'>
</linea-plot>
```

Maximum example, uses every available attribute:

```html
<!-- Display all data with date picker -->
<linea-plot
  src='["data/station1.smet", "data/station2.smet"]'
  backgroundcolors = '["#b31c1c2b", "rgba(0, 0, 0, 0.05)"]'
  showdatepicker
  showsurfacehoarseries
  showtitle
  showexport
  startdate="2025-06-01T00:00[Europe/Berlin]"
  enddate="2025-06-30T23:59[Europe/Berlin]">
</linea-plot>
```

Shows a fixed date span from the given smet file:

```html
<!-- Fixed date view without picker -->
<linea-plot
    src="data/station1.smet"
    startdate="2025-06-04T10:00[Europe/Berlin]"
    enddate="2025-06-04T18:00[Europe/Berlin]">
</linea-plot>
```

#### `<linea-plot-year>`

For yearly overviews, use the `<linea-plot-year>` component similarly:

- `src` {string} - Path to SMET file with snow height and weather data
- `startDate` {string} - Start date in ISO format (YYYY-MM-DD)
- `endDate` {string} - End date in ISO format (YYYY-MM-DD)
- `timeZone` {string} - IANA time zone identifier for data aggregation, optional
- `showTitle` {boolean} - If present, displays station name and altitude, optional

```html
<linea-plot-year
    src="path/to/data.smet"
    startDate="2023-01-01"
    endDate="2023-12-31"
    timeZone="CET"
    showTitle>
</linea-plot-year>
```
