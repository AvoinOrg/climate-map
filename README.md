# climate-map

See also [Climate Map Backend](https://github.com/avoinorg/climate-map-backend)

## Env variables
You need to set the following environment variables.
These can be set in the `.env` file. See `.env.example`.
```
REACT_APP_MAPBOX_ACCESS_TOKEN

# URL for the backend
REACT_APP_API_URL

# Optional
REACT_APP_TERRAMONITOR_KEY

# NB: Not in use at the moment:
REACT_APP_ANALYTICS_ID
REACT_APP_AUTH0_CLIENT_ID
REACT_APP_AUTH0_DOMAIN
REACT_APP_WAQI_TOKEN
```

* The app needs a running backend for many functionalities. See [Climate Map Backend](https://github.com/avoinorg/climate-map-backend)
* A personal Mapbox API key can be gotten by registering at [mapbox.com](https://mapbox.com)
* A Terramonitor API key is used only for the satellite base layer and is not strictly required.

-------------

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Docker

You can run the project with

### `docker-compose up`

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
