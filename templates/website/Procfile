# Buildpack platforms (Heroku, canine.sh, CNB). Not used by the Docker path —
# Render, Railway and the compose files all build from the Dockerfile, which
# sets ADAPTER=node itself.
#
# Set ADAPTER=node in your build command, or this has nothing to run: the
# adapter is gated on it in svelte.config.js, and an adapter-auto build emits
# no build/index.js. See https://docs.getaphex.com/deployment/other-platforms
web: node build
