This document is for listing and discussing approaches/frameworks
for different parts of the tech stack.

Throughout this document, JavaScript and TypeScript are generally discussed interchangeably. However, for new development, TypeScript is the recommended choice unless there is a specific reason not to use it.

## Engine

Engine choices are dependant on multiple factors, and might be different 
for different games if they have different requirement.

Javascript - in theory could mostly be done in pure/vanilla javascript
but frameworks are almost definitely wanted.

Phaser - 2D game engine for making HTML5 games, uses javascript

Pixi.js - more of a renderer than a game engine, is an option depending on
the game, but probably not what we want. Though if you don't need any other game engine features apart from rendering, it is a valid option.

Babylon.js - for 3D games, opposed to phaser's 2D

Playcanvas - another 3D option, has a browser based visual editor, if something
3D is done more research should probably be done into this vs babylon as they
have slightly different styles/approaches, though I do feel that babylon is probably a better choice

Godot/Unity - both are full game engines that can make web builds, but are less
optimised and targeted for the web, probably not what we want.

Excalibur.js - another 2D option similar to phaser, smaller community is meant
to be more tightly modern/structured/streamlined, and some people prefer it over phaser

MelonJS - yet another 2D option, might be slightly too specialised for certain 
types of games. 

frontend frameworks - if the game is minimal you don't even need a game engine
and can just used front end frameworks instead.

I feel like for 2D games phaser/excalibur are probably the best choices (between them excalibur does seem to be more modern and intuitive) and for 3D games babylon.

## Game Server

To what extent should it be peer to peer (P2P) vs having a centralised hosted server.

A few general ways of doing this are:
    - A central game server
    - Direct P2P (with a player acting as the host)
    - Relayed P2P
    - Hybrid Direct/Relayed P2P
    - Symmetrical P2P (not player hosted)

Of those options a central game server and direct P2P seem to be the best.

Direct P2P is the quickest to set up, especially for a prototype, but long
term a central game server probably is the best choice, mostly because it is
easier to build into a reliable production system, and avoids extra complications that come with the other options. 

Direct P2P would likely use the Trystero or PeerJS libraries.

For a central game server options include:

    Colyseus - a multiplayer game framework for Node.js. Seems like a good option
    and has features like reusable multiplayer game rooms. Does a lot of the heavy lifting for you, and is meant to be easy to use.
    Colyseus is transport-agnostic from the game's point of view. Individual games should communicate through a shared game interface rather than depending directly on Colyseus APIs where practical.

    Boardgame.io - for turn based things only, for multiplayer and game rules but self marketed as a game engine.

    Socket.io - for low-latency 2 way connection between a client and a server. Not game targeted, so something would probably require more work compared to something like colyseus. 

    Nakama - another option, seems to be more centered around / have more features
    for account and social things. Unless that is what we want, this isn't probably what we want

If we want to standardise across multiple games it might be best to use Colyseus for everything.

## Database

If a database is needed PostgreSQL is probably the best choice. This can be used for
game stuff through game servers like colyseus or by something like Django if needed for the more usual web/HTTP request stuff. If scaled up to multiple server instances something like redis may be needed.

Note about Django, I mention it because it is often useful for website stuff, however you use it in python (not javascript) and there's a decent chance it might not end up being relevant for us.

Active multiplayer state should normally remain in memory within Colyseus rooms, while PostgreSQL stores persistent data such as users, scores, and completed matches (if needed).


## Web page

#### front end
Good suggestions include:

    - React (personal favorite)
    - vue.js
    - Angular
    - Svelte (personally don't like too much)

For CSS styling best options are likely boostrap or tailwind.
If using React, React Boostrap exists, which is boostrap but with
every component built from scratch as a true React component, with
less dependencies.
On the same note, Tailwind is still more popular for react projects
than bootstrap, and has and ecosystem around it + react, so it may still be 
the better react choice. 
shadcn/ui is a popular component library for tailwind

Also of note, vite as a development tool.
Vite is a development server and frontend build tool. It is not a frontend framework.

#### back end

If using vite you can build it, then you just need a server to serve static web pages. This might make sense with node.js for additional backend capability if needed. Apart from page serving it is unclear how much backend capability (that's not game related) will actually be needed.

Alternatively, Next.js is a React framework that provides routing, server-side rendering and backend API functionality. It replaces Vite rather than sitting alongside it for most projects. To be clear Next.js is full stack. 


## Architecture

Just as a general idea, the architecture may end up looking something like:

Browser
├── HTTP → Web Frontend / General Backend
└── WebSocket → Colyseus

Web Frontend
├── React
├── built using Vite
└── served as static files

General Backend, if required
├── Node.js
└── APIs

Colyseus
├── rooms
├── multiplayer
└── active game state

PostgreSQL
└── persistent storage

this part isn't a guide or a recommendation, just a tool to help visualise 
how different parts may work together.


## Final Note on Components and Reuse

The codebase should be designed around reusable components and clear separation of responsibilities.

Where functionality is used in multiple places, it should be extracted into a reusable component, module, or library rather than duplicated. This applies not only to frontend UI components, but also to backend services, game logic, networking, data access, and other shared functionality.

Different frameworks and technologies should remain as loosely coupled as practical. Each should have a clearly defined responsibility and communicate through well-defined interfaces rather than relying on internal implementation details of another framework.

The preferred architecture is one of composition rather than tight integration. Frameworks should "plug into" one another through stable APIs or shared contracts, making it easier to replace, upgrade, or test individual parts of the system without affecting the rest of the application.
For example:
    - Shared UI should be implemented as reusable components.
    - Common game functionality should be extracted into shared game libraries.
    - The frontend should communicate with backend services through well-defined APIs.
    - Multiplayer code should expose a consistent interface regardless of the underlying implementation.
    - Database access should be isolated behind a data-access layer rather than being scattered throughout the application.
This approach improves maintainability, testability, and the ability to evolve the technology stack over time.

This is mentioned here since it seems relevant to our frameworks, and it is a good idea to establish this early on.


## Recommended Default Stack
Tentative and up for debate.

Language
    TypeScript

2D Engine
    Phaser

3D Engine
    Babylon.js

Frontend
    React

Frontend Build Tool
    Vite

General Backend
    Node.js-based backend, framework to be selected if required

Styling
    Tailwind CSS
    shadcn/ui

Realtime Multiplayer
    Colyseus

Database
    PostgreSQL

Scaling
    Redis (if required)

Individual games may choose different technologies where justified, but deviating from these defaults (or whatever they end up being) should have a clear reason.