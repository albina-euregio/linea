# LINEA

Visualizations of avalanche data, such as automated weather stations.

`<linea-plot src="...smet">` is a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) rendering weather station data using [uPlot](https://github.com/leeoniya/uPlot), see `demo.html` for its usage.

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
