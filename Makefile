.PHONY: test
test:
	cd src/api && GOSUMDB=off go test ./...
	cd test/component && GOSUMDB=off go test ./...
	cd src/ui && npm ci && npm run test:unit
	cd test/ui && npm ci && \
	PLAYWRIGHT_BROWSERS_PATH="$(CURDIR)/test/ui/.playwright-browsers" npx playwright install chromium && \
	PLAYWRIGHT_BROWSERS_PATH="$(CURDIR)/test/ui/.playwright-browsers" npm test
