# Avoin Map

An app for visualizing a variety of sustainability-related map data. Can be explored at https://map.avoin.org.

## Development

The app is built using React and Next.js. Clone the repository, set the environmental variables, and run the container using Docker Compose.

The environmental variables can be set in the `.env` file. See `.env.template`.
You need to set at least the following variables.

```
# The URL of the Avoin geoserver, serving map data.
NEXT_PUBLIC_GEOSERVER_URL=https://gis.example.org/geoserver

# Needed for the mapbox map. See https://docs.mapbox.com/help/getting-started/access-tokens/
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# Needed for translations.
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.example.org
NEXT_PUBLIC_TOLGEE_API_KEY=
```

To run the project, you need to have Docker installed. Run with

```
docker compose up
```

The app will be available on localhost at DEV_PORT. The default address is http://localhost:3000.

### App structure

The app uses the new App Router structure, introduced in version Next.js version 13. See https://nextjs.org/docs/app for a quick introduction.

The app is split into the main app and various applets. Applets are basically self-contained apps that leverage the components and other resources of the main app. The applets reside in their own folder inside the App Router structure, where their individual resources are kept.
