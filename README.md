[🇫🇮 Suomeksi](#suomi) | [🇬🇧 In English](#english)

***

# Suomi (Kääntäjällä käännetty)

## Discgolf Companion

Discgolf Companion on full-stack disc golf -sovellus, jonka tarkoitus on koota pelaajille hyödylliset työkalut, data ja palvelut samaan paikkaan.

Projekti on pääosin kirjoitettu TypeScriptillä ja perustuu moderniin Next.js-pohjaiseen web-stackiin. Mukana on tietokantakerros Prismaa ja Supabasea varten, Docker-pohjainen paketointi, Caddy-käänteispalvelinmääritys sekä erillisiä mini-palveluita taustatoimintoja ja integraatioita varten.

## Tarkoitus

Discgolf Companion toimii käytännöllisenä alustana frisbeegolfaajille. Sovellusta voidaan käyttää pohjana esimerkiksi seuraaville ominaisuuksille:

- Ratojen selaaminen ja ratatiedot
- Kiekkojen ja bägin hallinta
- Kierrosten seuranta, tuloskirjaus ja tilastot
- Pelaajaprofiilit ja asetukset
- Frisbeegolf-dataan liittyvät integraatiot ja scraper-palvelut
- Omat dashboardit ja muut companion-työkalut

## Teknologiat

| Alue | Teknologia |
|---|---|
| Frontend ja sovelluskehys | Next.js, React, TypeScript |
| Tyylit | Tailwind CSS |
| Tietokantakerros | Prisma |
| Backend-palvelut | Supabase |
| Runtime / paketinhallinta | Bun |
| Käyttöönotto | Docker ja Docker Compose -tyylinen setup |
| Reverse proxy | Caddy |
| Koodin laatu | ESLint |

## Projektirakenne

```text
.
├── mini-services/      # Erilliset apupalvelut, integraatiot ja scraperit
├── prisma/             # Prisma-schema, migraatiot ja tietokantatyökalut
├── public/             # Staattiset assetit
├── scripts/            # Kehitys-, ylläpito- ja deploy-skriptit
├── src/                # Varsinainen sovelluskoodi
├── supabase/           # Supabase-konfiguraatio, SQL ja backend-resurssit
├── upload/             # Tiedostojen latauksiin tai paikalliseen tallennukseen liittyvät resurssit
├── Caddyfile           # Reverse proxy -määritykset
├── Dockerfile          # Kontin build-määritys
├── start.sh            # Käynnistysskripti
├── package.json        # Riippuvuudet ja komennot
├── next.config.ts      # Next.js-konfiguraatio
├── tailwind.config.ts  # Tailwind-konfiguraatio
└── tsconfig.json       # TypeScript-konfiguraatio
```

## Arkkitehtuuri

Projekti noudattaa palvelupainotteista full-stack-rakennetta:

- `src/` sisältää käyttöliittymän ja sovelluslogiikan.
- `prisma/` hallitsee tyypitettyä tietokantayhteyttä ja skeeman kehitystä.
- `supabase/` sisältää Supabaseen liittyviä backend-resursseja, kuten SQL-logiikkaa, konfiguraatioita tai politiikkoja.
- `mini-services/` erottaa erikoistuneet integraatiot ja taustatoiminnot pääsovelluksesta.
- Docker paketoi sovelluksen siirrettävään muotoon.
- Caddy voi hoitaa HTTPS-päätteen, domain-reitityksen ja reverse proxy -toiminnan tuotannossa.

## Paikallinen kehitys

### Vaatimukset

- Node.js tai Bun
- Tietokanta Prismaa ja/tai Supabasea varten
- Ympäristömuuttujat sovelluksen salaisuuksia ja tietokantayhteyksiä varten

### Riippuvuuksien asennus

```bash
bun install
```

### Kehityspalvelimen käynnistys

```bash
bun dev
```

Avaa sovellus selaimessa siihen osoitteeseen, jonka kehityspalvelin ilmoittaa. Tyypillisesti osoite on:

```text
http://localhost:3000
```

## Tuotantokäyttöönotto

Repositorysta löytyy `Dockerfile`, `start.sh` ja `Caddyfile`, joten se soveltuu hyvin self-hostattuun käyttöön Dockeria tukevalla palvelimella.

Tyypillinen deploy-virta:

```bash
docker build -t discgolf-companion .
docker run -d --name discgolf-companion --env-file .env discgolf-companion
```

Tuotannossa Caddy voi toimia sovelluksen edessä ja hoitaa HTTPS-sertifikaatit sekä liikenteen reitityksen kontille.

## Konfiguraatio

Luo ympäristömuuttujatiedosto ennen sovelluksen ajoa:

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Tarkat muuttujat riippuvat siitä, mitä moduuleja ja mini-palveluita sovelluksessa käytetään.

## Kehityshuomiot

- Säilytä tietokantaskeeman muutokset `prisma/`-hakemistossa ja pidä migraatiot yhtenäisinä eri ympäristöissä.
- Tallenna salaiset arvot vain ympäristömuuttujiin, älä commitoi `.env`-tiedostoja.
- Käsittele mini-palvelut mahdollisimman itsenäisesti deployattavina osina.
- Käytä Dockeria, jotta tuotantoympäristö pysyy toistettavana ja homelab-deploy helpottuu.

***

# English

## Discgolf Companion

Discgolf Companion is a full-stack disc golf application designed to bring useful tools, data, and services for disc golf players into one place.

The project is primarily written in TypeScript and uses a modern web stack based on Next.js. It includes database infrastructure for Prisma and Supabase, Docker-based deployment support, a Caddy reverse proxy configuration, and separate mini-services for integrations and background functionality.

## Purpose

Discgolf Companion is intended to be a practical platform for disc golf players. The application can serve as a foundation for features such as:

- Course discovery and course information
- Disc collection and bag management
- Round tracking, scoring, and statistics
- Player profiles and preferences
- Disc golf data integrations and scraper services
- Personal dashboards and companion tools

## Tech Stack

| Area | Technology |
|---|---|
| Frontend and application framework | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Database layer | Prisma |
| Backend services | Supabase |
| Runtime / package manager | Bun |
| Deployment | Docker and Docker Compose-style setup |
| Reverse proxy | Caddy |
| Code quality | ESLint |

## Project Structure

```text
.
├── mini-services/      # Independent helper services, integrations, and scrapers
├── prisma/             # Prisma schema, migrations, and database tooling
├── public/             # Static assets served by the application
├── scripts/            # Development, maintenance, and deployment scripts
├── src/                # Main application source code
├── supabase/           # Supabase configuration, SQL, and backend resources
├── upload/             # Upload-related resources or local storage handling
├── Caddyfile           # Reverse proxy configuration
├── Dockerfile          # Container image definition
├── start.sh            # Startup script
├── package.json        # Dependencies and project commands
├── next.config.ts      # Next.js configuration
├── tailwind.config.ts  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Architecture

The project follows a service-oriented full-stack architecture:

- `src/` contains the user interface and application logic.
- `prisma/` manages typed database access and schema evolution.
- `supabase/` contains Supabase-related backend resources such as SQL logic, configuration, or policies.
- `mini-services/` separates specialized integrations and background functionality from the main app.
- Docker packages the application into a portable deployment unit.
- Caddy can handle HTTPS termination, domain routing, and reverse proxying in production.

## Local Development

### Requirements

- Node.js or Bun
- A database configured for Prisma and/or Supabase
- Environment variables for application secrets and database connections

### Install dependencies

```bash
bun install
```

### Run the development server

```bash
bun dev
```

Open the application in your browser at the address shown by the development server, typically:

```text
http://localhost:3000
```

## Production Deployment

The repository includes a `Dockerfile`, `start.sh`, and `Caddyfile`, which makes it suitable for self-hosting on a Docker-capable server.

A typical deployment flow:

```bash
docker build -t discgolf-companion .
docker run -d --name discgolf-companion --env-file .env discgolf-companion
```

In production, Caddy can sit in front of the application to manage HTTPS certificates and route traffic to the container.

## Configuration

Create an environment file before running the application:

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The exact variables required depend on which modules and mini-services are enabled.

## Development Notes

- Keep database schema changes inside `prisma/` and apply migrations consistently across environments.
- Store sensitive values only in environment variables; do not commit `.env` files.
- Treat mini-services as independently deployable components when practical.
- Use Docker for reproducible production deployments and easier homelab hosting.
